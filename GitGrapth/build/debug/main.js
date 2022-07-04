

var OS;
(function (OS) {
    let API;
    (function (API) {
    })(API = OS.API || (OS.API = {}));
    let application;
    (function (application) {
        /**
         *
         * @class GitGraph
         * @extends {BaseApplication}
         */
        class GitGraph extends application.BaseApplication {
            constructor(args) {
                super("GitGraph", args);
            }
            main() {
                let graph = new API.LibGitGraph({
                    target: this.find("git-graph")
                });
                graph.on_open_diff = (files) => {
                    console.log(files);
                    //(OS.PM.processes.Antedit[0] as any).openDiff(files)
                    this._gui.launch("Antedit", [])
                        .then((p) => {
                        p.observable.one("launched", () => p.openDiff(files));
                    });
                };
                graph.base_dir = "home://workspace/antos/".asFileHandle();
            }
        }
        application.GitGraph = GitGraph;
        //GitGraph.dependencies = ["pkg://GitGraph/libgitgraph.js"];
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));


var OS;
(function (OS) {
    let API;
    (function (API) {
        ;
        class LibGitGraph {
            constructor(option) {
                this._base_dir = undefined;
                this.lines_data = [];
                this.commits = {};
                this.oldest_commit_date = undefined;
                this.svg_element = undefined;
                this.commits_list_element = undefined;
                this.load_more_el = undefined;
                this.commit_detail_el = undefined;
                this.current_head = undefined;
                this._on_open_diff = undefined;
                this.options = {
                    commits_per_page: 100,
                    x_offset: 24,
                    y_offset: 24,
                    target: undefined,
                    popup_height: 250
                };
                for (const k in option) {
                    this.options[k] = option[k];
                }
                this.current_y_offset = this.options.y_offset;
                this.init_graph();
            }
            set base_dir(v) {
                this._base_dir = v;
                this.render_next();
            }
            gen_color(x) {
                let n = x + 11;
                const rgb = [0, 0, 0];
                for (let i = 0; i < 24; i++) {
                    rgb[i % 3] <<= 1;
                    rgb[i % 3] |= n & 0x01;
                    n >>= 1;
                }
                return '#' + rgb.reduce((a, c) => (c > 0x0f ? c.toString(16) : '0' + c.toString(16)) + a, '');
            }
            meta() {
                return OS.setting.system.packages['GitGraph'];
            }
            call(request) {
                return new Promise(async (ok, reject) => {
                    request.args.base_dir = this._base_dir.path;
                    let cmd = {
                        path: this.meta().path + "/api/api.lua",
                        parameters: request
                    };
                    let data = await API.apigateway(cmd, false);
                    if (!data.error) {
                        ok(data.result);
                    }
                    else {
                        reject(API.throwe(__("LibGitGrapth server call error: {0}", data.error)));
                    }
                });
            }
            load(before) {
                let request = {
                    action: 'log',
                    args: {
                        n_commits: this.options.commits_per_page.toString(),
                        before: before ? before : null
                    }
                };
                return this.call(request);
            }
            error(e) {
                OS.announcer.oserror(__("GitGraph error: {0}", e.toString()), e);
            }
            set on_open_diff(c) {
                this._on_open_diff = c;
            }
            init_graph() {
                if (!this.options.target) {
                    return this.error(API.throwe("Target element is undefined"));
                }
                $(this.options.target)
                    .css("overflow-y", "auto")
                    .css("overflow-x", "hidden")
                    .css("display", "block")
                    .css("position", "relative");
                this.svg_element = this.make_svg_el("svg", {
                    width: this.options.x_offset,
                    height: this.options.y_offset
                });
                $(this.svg_element)
                    .css("display", "block")
                    .css("position", "absolute")
                    .css("left", "0")
                    //s.css("z-index", 10)
                    .css("top", "0");
                $(this.options.target).empty();
                this.options.target.appendChild(this.svg_element);
                const div = $("<div />")
                    .css("position", "absolute")
                    .css("left", "0")
                    .css("top", "0")
                    .css("width", "100%")
                    .css("padding-top", `${this.options.y_offset / 2}px`);
                this.commits_list_element = div[0];
                this.options.target.appendChild(this.commits_list_element);
                const p = $("<p />")
                    .css("height", `${this.options.y_offset}px`)
                    .css("display", "block")
                    .css("padding", "0")
                    .css("margin", "0")
                    .css("line-height", `${this.options.y_offset}px`)
                    .css("vertical-align", "middle");
                p.addClass("git_grapth_load_more");
                p.on("click", (e) => this.render_next());
                p.text(__("More").__());
                this.load_more_el = p[0];
                this.commits_list_element.appendChild(this.load_more_el);
                const popup = $("<div />")
                    .css("position", "absolute")
                    .css("top", "0")
                    .css("height", this.options.popup_height + "px")
                    .css("display", "none")
                    .css("user-select", "text")
                    .addClass("git_grapth_commit_detail");
                this.commit_detail_el = popup[0];
                this.options.target.appendChild(this.commit_detail_el);
            }
            render_next() {
                this.load(this.oldest_commit_date)
                    .then((data) => {
                    if (this.oldest_commit_date) {
                        // remove the first commit as it is already in
                        // the graph
                        data.shift();
                    }
                    this.draw_graph(data);
                })
                    .catch(e => this.error(e));
            }
            make_svg_el(tag, attrs) {
                const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
                for (var k in attrs)
                    el.setAttribute(k, attrs[k]);
                return el;
            }
            max_line_off_x() {
                if (this.lines_data.length == 0)
                    return 0;
                return Math.max.apply(Math, this.lines_data.map((o) => o.x_offset));
            }
            update_line_data(commit, y_offset) {
                const parent_commits = commit.hashes.parents.split(" ");
                // get the list of child lines
                const children = this.lines_data.filter((line) => line.next_commit == commit.hashes.commit);
                let merge = {
                    src: [],
                    dest: undefined
                };
                if (children.length === 0) {
                    // add new line
                    let line = {
                        next_commit: parent_commits[0],
                        x_offset: this.max_line_off_x() + this.options.x_offset,
                        current_commit: commit.hashes.commit,
                        beginning: true,
                        y_offset: y_offset,
                        color: this.gen_color(this.lines_data.length),
                    };
                    this.lines_data.push(line);
                    merge.dest = line;
                }
                else {
                    let min_offset_x = Math.min.apply(Math, children.map((o) => o.x_offset));
                    let line = undefined;
                    for (let el of children) {
                        if (el.x_offset == min_offset_x) {
                            line = el;
                            line.next_commit = parent_commits[0];
                            line.current_commit = commit.hashes.commit;
                            line.y_offset = y_offset;
                        }
                        else {
                            this.lines_data.splice(this.lines_data.indexOf(el), 1);
                            merge.src.push(el);
                        }
                    }
                    merge.dest = line;
                }
                if (parent_commits.length === 2) {
                    let line = undefined;
                    line = this.lines_data.filter(l => l.next_commit == parent_commits[1])[0];
                    if (!line) {
                        // add new line
                        line = {
                            next_commit: parent_commits[1],
                            x_offset: this.max_line_off_x() + this.options.x_offset,
                            current_commit: commit.hashes.commit,
                            beginning: true,
                            y_offset: y_offset + this.options.y_offset,
                            color: this.gen_color(this.lines_data.length),
                        };
                        this.lines_data.push(line);
                    }
                    else {
                        line.y_offset = y_offset + this.options.y_offset;
                    }
                    merge.src.push(line);
                }
                return merge;
            }
            draw_line(_x1, _y1, _x2, _y2, color, stroke) {
                let line_opt = {
                    stroke: color,
                    fill: 'none',
                    "stroke-width": 1.5
                };
                if (stroke) {
                    line_opt['stroke-width'] = stroke;
                }
                if (_x1 == _x2) {
                    line_opt.d = `M ${_x1},${_y1} L ${_x2},${_y2}`;
                }
                else {
                    let x1 = _x1;
                    let y1 = _y1;
                    let x2 = _x2;
                    let y2 = _y2;
                    let dx = Math.abs(x2 - x1);
                    let dy = Math.abs(y2 - y1);
                    if (_y1 < _y2) {
                        x1 = _x2;
                        y1 = _y2;
                        x2 = _x1;
                        y2 = _y1;
                    }
                    line_opt.d = `M ${x1},${y1} C  ${x1},${y1 - dy} ${x2},${y2 + dy}  ${x2},${y2}`;
                }
                const line = this.make_svg_el("path", line_opt);
                return line;
            }
            gen_commit_data_header(name, value) {
                const p = $("<p />")
                    .css("display", "block");
                p[0].innerHTML = `<b>${name.__()}</b>: ${value}`;
                return p[0];
            }
            open_popup(commit) {
                const el = commit.domel;
                if (!el)
                    return;
                $(this.commit_detail_el).empty();
                const position = $(el).position();
                const bbox = this.svg_element.getBBox();
                const off_left = bbox.x + bbox.width + this.options.x_offset / 2;
                const svg = this.make_svg_el("svg", {
                    width: off_left - commit.cx + 5,
                    height: this.options.y_offset
                });
                $(svg)
                    .css("display", "block")
                    .css("position", "absolute")
                    .css("left", "0")
                    .css("top", "-2px");
                svg.appendChild(this.draw_line(0, this.options.y_offset / 2, off_left - commit.cx, this.options.y_offset / 2, commit.color));
                /*
                svg.appendChild(
                    this.make_svg_el("circle",{
                        cx: off_left-commit.cx - 1,
                        cy: this.options.y_offset/2,
                        r:4,
                        fill: commit.color,
                        "stroke-width": 0.0
                    })
                );*/
                $(this.commit_detail_el)
                    .css("border", "2px solid " + commit.color)
                    .css("color", commit.color)
                    .append($("<div />")
                    .css("position", "absolute")
                    .css("height", this.options.y_offset)
                    .css("left", commit.cx - off_left)
                    .css("padding-left", off_left - commit.cx)
                    .append(svg)
                    .append($("<i/>").text('[X]')
                    .css("cursor", "pointer"))
                    .addClass("git_grapth_commit_detail_ctrl")
                    .on("click", (e) => {
                    $(this.commit_detail_el)
                        .css("display", "none")
                        .empty();
                }));
                const left = $("<div />")
                    .css("display", "block")
                    .css("overflow-y", "auto")
                    .css("overflow-x", "hidden")
                    .css("flex", "1")
                    .css("border-right", "1px solid " + commit.color)
                    .addClass("git_grapth_commit_detail_left");
                const right = $("<div />")
                    .css("display", "block")
                    .css("overflow-y", "auto")
                    .css("overflow-x", "hidden")
                    .css("flex", "1")
                    .addClass("git_grapth_commit_detail_right");
                // display 
                left.append(this.gen_commit_data_header(__("Commit"), commit.hashes.commit));
                left.append(this.gen_commit_data_header(__("Parents"), commit.hashes.parents));
                left.append(this.gen_commit_data_header(__("Author"), `${commit.committer.name} &lt;${commit.committer.email}&gt;`));
                left.append(this.gen_commit_data_header(__("Date"), (new Date(commit.committer.date).toDateString())));
                left.append($("<pre />")
                    .css("white-space", "pre-wrap")
                    .text(commit.message));
                this.commit_detail_el.appendChild(left[0]);
                this.commit_detail_el.appendChild(right[0]);
                this.list_file(commit.hashes.commit)
                    .then((files) => {
                    const ul = $('<ul/>');
                    $.each(files, (index, value) => {
                        const arr = value.split("\t");
                        const li = $('<li/>');
                        const a = $('<a/>')
                            .css("cursor", "pointer")
                            .addClass(`git_graph_file_${arr[0].toLowerCase()}`)
                            .on("click", e => {
                            if (this._on_open_diff) {
                                Promise.all([
                                    this.get_file(arr[1], `${commit.hashes.commit}^`),
                                    this.get_file(arr[1], commit.hashes.commit)
                                ])
                                    .then((values) => {
                                    // create the file
                                    const files = values.map((content, index) => {
                                        const file = `mem://${commit.hashes.commit.slice(0, 8)}${index == 0 ? "^" : ""}/${arr[1]}`.asFileHandle();
                                        file.cache = content;
                                        file.info.mime = "text/plain";
                                        return file;
                                    });
                                    this._on_open_diff(files);
                                })
                                    .catch((e) => {
                                    OS.announcer.oserror(__("Unable to fetch diff of {0}: {1}", commit.hashes.commit, e.toString()), e);
                                });
                            }
                        });
                        a.text(arr[1]);
                        ul.append(li.append(a));
                    });
                    right.append(ul);
                })
                    .catch((e) => OS.announcer.oserror(__("Unable to get commit changes: {0}", e.toString()), e));
                // scroll down if necessary
                $(this.commit_detail_el)
                    .css("top", position.top)
                    .css("left", off_left)
                    .css("display", "flex")
                    .css("width", `calc(100% - ${off_left + this.options.x_offset}px)`)
                    .css("fflex-direction", "row");
                const delta = this.commit_detail_el.getBoundingClientRect().bottom -
                    this.options.target.getBoundingClientRect().bottom;
                if (delta > 0) {
                    this.options.target.scrollTop += delta + 10;
                }
            }
            render_commit(commit, color) {
                let current = false;
                const p = $("<p />")
                    .css("padding", "0")
                    .css("margin", "0")
                    .css("display", "block")
                    .css("height", `${this.options.y_offset}px`)
                    .css("line-height", `${this.options.y_offset}px`)
                    .css("color", color)
                    .css("vertical-align", "middle")
                    .css("white-space", "nowrap")
                    .css("overflow", "hidden");
                p.addClass("git_graph_commit_message");
                let html = `<i class="git_graph_commit_hash">${commit.hashes.commit.slice(0, 8)}</i> `;
                commit.branches = [];
                for (const tag of commit.extra.split(",").map(e => e.trim()).filter(e => e != "")) {
                    let found = tag.match(/HEAD -> (.*)/i);
                    if (found && found.length == 2) {
                        html += `<i class = "git_graph_commit_branch">${found[1]}</i> `;
                        p.addClass("git_graph_commit_current_head");
                        current = true;
                        commit.branches.push(found[1]);
                        this.current_head = commit;
                    }
                    else if ((found = tag.match(/tag: (.*)/i))) {
                        html += `<i class = "git_graph_commit_tag">${found[1]}</i> `;
                    }
                    else {
                        html += `<i class = "git_graph_commit_branch">${tag}</i> `;
                        commit.branches.push(tag);
                    }
                }
                html += `<i class ="git_graph_commit_text">${commit.message.split("\n")[0]}</i> `;
                html += `<i class ="git_graph_commit_author">${commit.committer.name}</i> `;
                html += `<i class ="git_graph_commit_date">${new Date(commit.committer.date).toDateString()}</i>`;
                p[0].innerHTML = html;
                p.on("click", (e) => {
                    this.open_popup(commit);
                });
                this.commits_list_element.insertBefore(p[0], this.load_more_el);
                commit.domel = p[0];
                return current;
            }
            draw_graph(data) {
                for (const commit of data) {
                    this.oldest_commit_date = commit.committer.date;
                    if (commit.extra.includes("refs/stash")) {
                        continue;
                    }
                    this.commits[commit.hashes.commit] = commit;
                    let merge = this.update_line_data(commit, this.current_y_offset);
                    let lines = merge.src;
                    // combine the lines
                    for (const linedata of lines.filter(o => o.x_offset != merge.dest.x_offset)) {
                        this.svg_element.appendChild(this.draw_line(merge.dest.x_offset, merge.dest.y_offset, linedata.x_offset, linedata.y_offset, linedata.color));
                    }
                    this.lines_data.sort((a, b) => a.x_offset - b.x_offset);
                    let x_offset = this.options.x_offset;
                    for (const linedata of this.lines_data) {
                        if (linedata.beginning && linedata.y_offset > this.current_y_offset) {
                            continue;
                        }
                        linedata.y_offset = this.current_y_offset;
                        if (!linedata.beginning) {
                            if (linedata.x_offset > x_offset) {
                                this.svg_element.appendChild(this.draw_line(linedata.x_offset, linedata.y_offset - this.options.y_offset, linedata.x_offset - this.options.x_offset, linedata.y_offset, linedata.color));
                                linedata.x_offset = x_offset;
                            }
                            else {
                                this.svg_element.appendChild(this.draw_line(linedata.x_offset, linedata.y_offset - this.options.y_offset, linedata.x_offset, linedata.y_offset, linedata.color));
                            }
                        }
                        x_offset += this.options.x_offset;
                        linedata.beginning = false;
                    }
                    let options = {
                        cx: merge.dest.x_offset,
                        cy: merge.dest.y_offset,
                        r: 4,
                        fill: merge.dest.color,
                        stroke: 'black',
                        "stroke-width": 0.0
                    };
                    if (this.render_commit(commit, merge.dest.color)) {
                        options.r = options.r * 1.5;
                    }
                    commit.cx = options.cx;
                    commit.color = options.fill;
                    const circle = this.make_svg_el("circle", options);
                    this.svg_element.appendChild(circle);
                    this.current_y_offset += this.options.y_offset;
                }
                const bbox = this.svg_element.getBBox();
                this.svg_element.setAttribute("width", (bbox.x + bbox.width).toString());
                this.svg_element.setAttribute("height", (bbox.y + bbox.height + this.options.y_offset / 2).toString());
                //$(this.commits_list_element).css("left", `-${bbox.x + bbox.width}px`);
                $(".git_graph_commit_message", this.commits_list_element).css("padding-left", `${bbox.x + bbox.width + this.options.x_offset / 2}px`);
            }
            list_file(hash) {
                let request = {
                    action: 'list_file',
                    args: {
                        commit: hash
                    }
                };
                return this.call(request);
            }
            get_changes(file, hash) {
                let request = {
                    action: 'get_changes',
                    args: {
                        commit: hash,
                        file: file
                    }
                };
                return this.call(request);
            }
            get_file(file, hash) {
                let request = {
                    action: 'get_file',
                    args: {
                        commit: hash,
                        file: file
                    }
                };
                return this.call(request);
            }
        }
        API.LibGitGraph = LibGitGraph;
    })(API = OS.API || (OS.API = {}));
})(OS || (OS = {}));
