
// Copyright 2017-2018 Xuan Sang LE <xsang.le AT gmail DOT com>
// AnTOS Web desktop is is licensed under the GNU General Public
// License v3.0, see the LICENCE file for more information
// This program is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of 
// the License, or (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
// You should have received a copy of the GNU General Public License
//along with this program. If not, see https://www.gnu.org/licenses/.
var OS;
(function (OS) {
    let application;
    (function (application) {
        class Blogger extends application.BaseApplication {
            constructor(args) {
                super("Blogger", args);
                this.previewOn = false;
            }
            async init_db() {
                try {
                    const f = await this.openDialog("FileDialog", {
                        title: __("Open/create new database"),
                        file: "Untitled.db"
                    });
                    var d_1 = f.file.path.asFileHandle();
                    if (f.file.type === "file") {
                        d_1 = d_1.parent();
                    }
                    const target = `${d_1.path}/${f.name}`.asFileHandle();
                    this.dbhandle = `sqlite://${target.genealogy.join("/")}`.asFileHandle();
                    const tables = await this.dbhandle.read();
                    /**
                     * Init following tables if not exist:
                     * - user
                     * - cvcat
                     * - cvsec
                     * - blogdb
                    */
                    if (!tables.user) {
                        this.dbhandle.cache = {
                            address: "TEXT",
                            Phone: "TEXT",
                            shortbiblio: "TEXT",
                            fullname: "TEXT",
                            email: "TEXT", url: "TEXT",
                            photo: "TEXT"
                        };
                        const r = await this.dbhandle.write("user");
                        if (r.error) {
                            throw new Error(r.error);
                        }
                    }
                    if (!tables.cv_cat) {
                        this.dbhandle.cache = {
                            publish: "NUMERIC",
                            name: "TEXT",
                            pid: "NUMERIC"
                        };
                        const r = await this.dbhandle.write("cv_cat");
                        if (r.error) {
                            throw new Error(r.error);
                        }
                    }
                    if (!tables.cv_sections) {
                        this.dbhandle.cache = {
                            title: "TEXT",
                            start: "NUMERIC",
                            location: "TEXT",
                            end: "NUMERIC",
                            content: "TEXT",
                            subtitle: "TEXT",
                            publish: "NUMERIC",
                            cid: "NUMERIC"
                        };
                        const r = await this.dbhandle.write("cv_sections");
                        if (r.error) {
                            throw new Error(r.error);
                        }
                    }
                    if (!tables.blogs) {
                        this.dbhandle.cache = {
                            tags: "TEXT",
                            content: "TEXT",
                            utime: "NUMERIC",
                            rendered: "TEXT",
                            title: "TEXT",
                            utimestr: "TEXT",
                            ctime: "NUMERIC",
                            ctimestr: "TEXT",
                            publish: "INTEGER DEFAULT 0",
                        };
                        const r = await this.dbhandle.write("blogs");
                        if (r.error) {
                            throw new Error(r.error);
                        }
                    }
                    if (!tables.st_similarity) {
                        this.dbhandle.cache = {
                            pid: "NUMERIC",
                            sid: "NUMERIC",
                            score: "NUMERIC"
                        };
                        const r = await this.dbhandle.write("st_similarity");
                        if (r.error) {
                            throw new Error(r.error);
                        }
                    }
                    if (!tables.subscribers) {
                        this.dbhandle.cache = {
                            name: "TEXT",
                            email: "TEXT"
                        };
                        const r = await this.dbhandle.write("subscribers");
                        if (r.error) {
                            throw new Error(r.error);
                        }
                    }
                    this.userdb = `${this.dbhandle.path}@user`.asFileHandle();
                    this.cvcatdb = `${this.dbhandle.path}@cv_cat`.asFileHandle();
                    this.cvsecdb = `${this.dbhandle.path}@cv_sections`.asFileHandle();
                    this.blogdb = `${this.dbhandle.path}@blogs`.asFileHandle();
                    this.subdb = `${this.dbhandle.path}@subscribers`.asFileHandle();
                    await this.loadBlogs();
                }
                catch (e) {
                    this.error(__("Unable to init database file: {0}", e.toString()), e);
                    this.dbhandle = undefined;
                }
            }
            main() {
                this.user = {};
                this.cvlist = this.find("cv-list");
                this.cvlist.ontreeselect = (d) => {
                    if (!d) {
                        return;
                    }
                    const { data } = d.data.item;
                    return this.CVSectionByCID(Number(data.id));
                };
                this.inputtags = this.find("input-tags");
                this.bloglist = this.find("blog-list");
                this.seclist = this.find("cv-sec-list");
                let el = this.find("photo");
                $(el)
                    .on("click", async (e) => {
                    try {
                        const ret = await this.openDialog("FileDialog", {
                            title: __("Select image file"),
                            mimes: ["image/.*"]
                        });
                        return el.value = ret.file.path;
                    }
                    catch (e) {
                        return this.error(__("Unable to get file"), e);
                    }
                });
                this.tabcontainer = this.find("tabcontainer");
                this.tabcontainer.ontabselect = (e) => {
                    return this.fetchData(e.data.container.aid);
                };
                this.find("bt-user-save").onbtclick = (e) => {
                    return this.saveUser();
                };
                this.find("cv-cat-add").onbtclick = async (e) => {
                    try {
                        const tree = await this.fetchCVCat();
                        const d = await this.openDialog(new application.blogger.BloggerCategoryDialog(), {
                            title: __("Add category"),
                            tree
                        });
                        this.cvcatdb.cache = {
                            name: d.value,
                            pid: d.p.id,
                            publish: 1
                        };
                        const r = await this.cvcatdb.write(undefined);
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        await this.refreshCVCat();
                    }
                    catch (e) {
                        this.error(__("cv-cat-add: {0}", e.toString()), e);
                    }
                };
                this.find("cv-cat-edit").onbtclick = async (e) => {
                    try {
                        const sel = this.cvlist.selectedItem;
                        if (!sel) {
                            return;
                        }
                        const cat = sel.data;
                        if (!cat) {
                            return;
                        }
                        const tree = await this.fetchCVCat();
                        const d = await this.openDialog(new application.blogger.BloggerCategoryDialog(), {
                            title: __("Edit category"),
                            tree, cat
                        });
                        this.cvcatdb.cache = {
                            id: cat.id,
                            publish: cat.publish,
                            pid: d.p.id,
                            name: d.value
                        };
                        const r = await this.cvcatdb.write(undefined);
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        await this.refreshCVCat();
                    }
                    catch (e) {
                        this.error(__("cv-cat-edit: {0}", e.toString()), e);
                    }
                };
                this.find("cv-cat-del").onbtclick = async (e) => {
                    try {
                        const sel = this.cvlist.selectedItem;
                        if (!sel) {
                            return;
                        }
                        const cat = sel.data;
                        if (!cat) {
                            return;
                        }
                        const d = await this.openDialog("YesNoDialog", {
                            title: __("Delete category"),
                            iconclass: "fa fa-question-circle",
                            text: __("Do you really want to delete: {0}?", cat.name)
                        });
                        if (!d) {
                            return;
                        }
                        await this.deleteCVCat(cat);
                    }
                    catch (e) {
                        this.error(__("cv-cat-del: {0}", e.toString()), e);
                    }
                };
                this.find("cv-sec-add").onbtclick = async (e) => {
                    try {
                        const sel = this.cvlist.selectedItem;
                        if (!sel) {
                            return;
                        }
                        const cat = sel.data;
                        if (!cat || (cat.id === "0")) {
                            return this.toast(__("Please select a category"));
                        }
                        const d = await this.openDialog(new application.blogger.BloggerCVSectionDiaglog(), {
                            title: __("New section entry for {0}", cat.name)
                        });
                        d.cid = Number(cat.id);
                        d.start = Number(d.start);
                        d.end = Number(d.end);
                        this.cvsecdb.cache = d;
                        // d.publish = 1
                        const r = await this.cvsecdb.write(undefined);
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        await this.CVSectionByCID(Number(cat.id));
                    }
                    catch (e) {
                        this.error(__("cv-sec-add: {0}", e.toString()), e);
                    }
                };
                this.find("cv-sec-move").onbtclick = async (e) => {
                    try {
                        const sel = this.seclist.selectedItem;
                        if (!sel) {
                            return this.toast(__("Please select a section to move"));
                        }
                        const sec = sel.data;
                        const tree = await this.fetchCVCat();
                        const d = await this.openDialog(new application.blogger.BloggerCategoryDialog(), {
                            title: __("Move to"),
                            tree,
                            selonly: true
                        });
                        this.cvsecdb.cache = {
                            id: sec.id,
                            cid: d.p.id
                        };
                        const r = await this.cvsecdb.write(undefined);
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        await this.CVSectionByCID(sec.cid);
                        this.seclist.unselect();
                    }
                    catch (e) {
                        this.error(__("cv-sec-move: {0}", e.toString()), e);
                    }
                };
                this.find("cv-sec-edit").onbtclick = async (e) => {
                    try {
                        const sel = this.seclist.selectedItem;
                        if (!sel) {
                            return this.toast(__("Please select a section to edit"));
                        }
                        const sec = sel.data;
                        const d = await this.openDialog(new application.blogger.BloggerCVSectionDiaglog(), {
                            title: __("Modify section entry"),
                            section: sec
                        });
                        d.cid = Number(sec.cid);
                        d.start = Number(d.start);
                        d.end = Number(d.end);
                        this.cvsecdb.cache = d;
                        //d.publish = Number sec.publish
                        const r = await this.cvsecdb.write(undefined);
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        await this.CVSectionByCID(Number(sec.cid));
                    }
                    catch (e) {
                        this.error(__("cv-sec-edit: {0}", e.toString()), e);
                    }
                };
                this.seclist.onitemclose = (evt) => {
                    if (!evt) {
                        return;
                    }
                    const data = evt.data.item.data;
                    this.openDialog("YesNoDialog", {
                        iconclass: "fa fa-question-circle",
                        text: __("Do you really want to delete: {0}?", data.title)
                    }).then(async (b) => {
                        if (!b) {
                            return;
                        }
                        try {
                            const r = await this.cvsecdb.remove({
                                where: {
                                    id: data.id
                                }
                            });
                            if (r.error) {
                                throw new Error(r.error);
                            }
                            return this.seclist.delete(evt.data.item);
                        }
                        catch (e) {
                            return this.error(__("Cannot delete the section: {0}", e.toString()), e);
                        }
                    });
                    return false;
                };
                this.editor = new EasyMDE({
                    element: this.find("markarea"),
                    autoDownloadFontAwesome: false,
                    autofocus: true,
                    tabSize: 4,
                    indentWithTabs: true,
                    toolbar: [
                        {
                            name: __("New"),
                            className: "fa fa-file",
                            action: (e) => {
                                this.bloglist.unselect();
                                return this.clearEditor();
                            }
                        },
                        {
                            name: __("Save"),
                            className: "fa fa-save",
                            action: (e) => {
                                return this.saveBlog();
                            }
                        },
                        "|", "bold", "italic", "heading", "|", "quote", "code",
                        "unordered-list", "ordered-list", "|", "link",
                        "image", "table", "horizontal-rule",
                        {
                            name: "image",
                            className: "fa fa-file-image-o",
                            action: (_) => {
                                return this.openDialog("FileDialog", {
                                    title: __("Select image file"),
                                    mimes: ["image/.*"]
                                }).then((d) => {
                                    return d.file.path.asFileHandle().publish()
                                        .then((r) => {
                                        const doc = this.editor.codemirror.getDoc();
                                        return doc.replaceSelection(`![](${this._api.handle.shared}/${r.result})`);
                                    }).catch((e) => this.error(__("Cannot export file for embedding to text"), e));
                                });
                            }
                        },
                        {
                            name: "Youtube",
                            className: "fa fa-youtube",
                            action: (e) => {
                                const doc = this.editor.codemirror.getDoc();
                                return doc.replaceSelection("[[youtube:]]");
                            }
                        },
                        "|",
                        {
                            name: __("Preview"),
                            className: "fa fa-eye no-disable",
                            action: (e) => {
                                this.previewOn = !this.previewOn;
                                EasyMDE.togglePreview(e);
                                ///console.log @select ".editor-preview editor-preview-active"
                                renderMathInElement(this.find("editor-container"));
                            }
                        },
                        "|",
                        {
                            name: __("Send mail"),
                            className: "fa fa-paper-plane",
                            action: async (e) => {
                                try {
                                    const d = await this.subdb.read();
                                    const sel = this.bloglist.selectedItem;
                                    if (!sel) {
                                        return this.error(__("No post selected"));
                                    }
                                    const data = sel.data;
                                    await this.openDialog(new application.blogger.BloggerSendmailDiaglog(), {
                                        title: __("Send mail"),
                                        content: this.editor.value(),
                                        mails: d,
                                        id: data.id
                                    });
                                    this.toast(__("Emails sent"));
                                }
                                catch (e) {
                                    this.error(__("Error sending mails: {0}", e.toString()), e);
                                }
                            }
                        }
                    ]
                });
                this.bloglist.onlistselect = (e) => {
                    const el = this.bloglist.selectedItem;
                    if (!el) {
                        return;
                    }
                    const sel = el.data;
                    if (!sel) {
                        return;
                    }
                    return this.blogdb.read({
                        where: {
                            id: Number(sel.id)
                        }
                    })
                        .then((r) => {
                        this.editor.value(r.content);
                        this.inputtags.value = r.tags;
                        return this.find("blog-publish").swon = Number(r.publish) ? true : false;
                    }).catch((e) => {
                        return this.error(__("Cannot fetch the entry content"), e);
                    });
                };
                this.bloglist.onitemclose = (e) => {
                    if (!e) {
                        return;
                    }
                    const el = e.data.item;
                    const data = el.data;
                    this.openDialog("YesNoDialog", {
                        title: __("Delete a post"),
                        iconclass: "fa fa-question-circle",
                        text: __("Do you really want to delete this post ?")
                    }).then(async (b) => {
                        if (!b) {
                            return;
                        }
                        const r = await this.blogdb.remove({
                            where: {
                                id: Number(data.id)
                            }
                        });
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        this.bloglist.delete(el);
                        this.bloglist.unselect();
                        return this.clearEditor();
                    });
                    return false;
                };
                this.bindKey("CTRL-S", () => {
                    const sel = this.tabcontainer.selectedTab;
                    if (!sel || (sel.container.aid !== "blog-container")) {
                        return;
                    }
                    return this.saveBlog();
                });
                this.on("resize", () => {
                    return this.resizeContent();
                });
                this.resizeContent();
                return this.init_db();
            }
            // @fetchData 0
            // USER TAB
            fetchData(idx) {
                switch (idx) {
                    case "user-container": //user info
                        return this.userdb.read()
                            .then((d) => {
                            if (!d || d.length == 0) {
                                return;
                            }
                            this.user = d[0];
                            const inputs = this.select("[input-class='user-input']");
                            return inputs.map((i, v) => ($(v)).val(this.user[v.name]));
                        }).catch((e) => this.error(__("Cannot fetch user data"), e));
                    case "cv-container": // category
                        return this.refreshCVCat();
                    default:
                        return this.loadBlogs();
                }
            }
            async saveUser() {
                try {
                    const inputs = this.select("[input-class='user-input']");
                    for (let v of inputs) {
                        this.user[v.name] = ($(v)).val();
                    }
                    if (!this.user.fullname || (this.user.fullname === "")) {
                        return this.toast(__("Full name must be entered"));
                    }
                    //console.log @user
                    let fp = this.userdb;
                    if (this.user && this.user.id) {
                        fp = `${this.userdb.path}@${this.user.id}`.asFileHandle();
                    }
                    fp.cache = this.user;
                    const r = await fp.write(undefined);
                    if (r.error) {
                        throw new Error(r.error);
                    }
                    if (!this.user.id) {
                        this.user.id = r.result;
                    }
                    this.toast(__("User data updated"));
                }
                catch (e) {
                    this.error(__("Cannot save user data: {0}", e.toString()), e);
                }
            }
            // PORFOLIO TAB
            refreshCVCat() {
                return this.fetchCVCat().then((data) => {
                    this.cvlist.data = data;
                    return this.cvlist.expandAll();
                }).catch((e) => this.error(__("Unable to load categories"), e));
            }
            fetchCVCat() {
                return new Promise(async (resolve, reject) => {
                    try {
                        const data = {
                            text: "Porfolio",
                            id: "0",
                            nodes: []
                        };
                        const filter = {
                            order: ["name$asc"]
                        };
                        const d = await this.cvcatdb.read(filter);
                        this.catListToTree(d, data, "0");
                        resolve(data);
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            //it = (@cvlist.find "pid", "2")[0]
            //@cvlist.set "selectedItem", it
            catListToTree(table, data, id) {
                let v;
                const result = table.filter((e) => {
                    e.pid == id;
                });
                if (result.length === 0) {
                    return data.nodes = null;
                }
                for (let v of result) {
                    v.nodes = [];
                    v.text = v.name;
                    this.catListToTree(table, v, v.id);
                    data.nodes.push(v);
                }
            }
            deleteCVCat(cat) {
                return new Promise(async (resolve, reject) => {
                    try {
                        let v;
                        const ids = [];
                        var func = function (c) {
                            ids.push(c.id);
                            if (c.nodes) {
                                c.nodes.map((v) => func(v));
                            }
                        };
                        func(cat);
                        // delete all content
                        let r = await this.cvsecdb.remove({
                            where: {
                                $or: {
                                    cid: ids
                                }
                            }
                        });
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        r = await this.cvcatdb.remove({
                            where: {
                                $or: {
                                    id: ids
                                }
                            }
                        });
                        if (r.error) {
                            throw new Error(r.error);
                        }
                        await this.refreshCVCat();
                        this.seclist.data = [];
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            CVSectionByCID(cid) {
                return new Promise(async (resolve, reject) => {
                    try {
                        const d = await this.cvsecdb.read({
                            where: { cid },
                            order: ["start$desc"]
                        });
                        const items = [];
                        this.find("cv-sec-status").text = __("Found {0} sections", d.length);
                        for (let v of d) {
                            v.closable = true;
                            v.tag = "afx-blogger-cvsection-item";
                            v.start = Number(v.start);
                            v.end = Number(v.end);
                            if (v.start < 1000) {
                                v.start = undefined;
                            }
                            if (v.end < 1000) {
                                v.end = undefined;
                            }
                            items.push(v);
                        }
                        this.seclist.data = items;
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            // blog
            async saveBlog() {
                try {
                    let sel = undefined;
                    const selel = this.bloglist.selectedItem;
                    if (selel) {
                        sel = selel.data;
                    }
                    const tags = this.inputtags.value;
                    const content = this.editor.value();
                    const title = (new RegExp("^#+(.*)\n", "g")).exec(content);
                    if (!title || (title.length !== 2)) {
                        return this.toast(__("Please insert a title in the text: beginning with heading"));
                    }
                    if (tags === "") {
                        return this.toast(__("Please enter tags"));
                    }
                    const d = new Date();
                    const data = {
                        content,
                        title: title[1].trim(),
                        tags,
                        ctime: sel ? sel.ctime : d.timestamp(),
                        ctimestr: sel ? sel.ctimestr : d.toString(),
                        utime: d.timestamp(),
                        utimestr: d.toString(),
                        rendered: this.process(this.editor.options.previewRender(content)),
                        publish: this.find("blog-publish").swon ? 1 : 0
                    };
                    if (sel) {
                        data.id = sel.id;
                    }
                    //save the data
                    this.blogdb.cache = data;
                    const r = await this.blogdb.write(undefined);
                    if (r.error) {
                        throw new Error(r.error);
                    }
                    await this.loadBlogs();
                }
                catch (e) {
                    this.error(__("Cannot save blog: {0}", e.toString()), e);
                }
            }
            process(text) {
                // find video tag and rendered it
                let found;
                const embed = (id) => `\
<iframe
class = "embeded-video"
width="560" height="315" 
src="https://www.youtube.com/embed/${id}"
frameborder="0" allow="encrypted-media" allowfullscreen
></iframe>\
`;
                const re = /\[\[youtube:([^\]]*)\]\]/g;
                const replace = [];
                while ((found = re.exec(text)) !== null) {
                    replace.push(found);
                }
                if (!(replace.length > 0)) {
                    return text;
                }
                let ret = "";
                let begin = 0;
                for (let it of replace) {
                    ret += text.substring(begin, it.index);
                    ret += embed(it[1]);
                    begin = it.index + it[0].length;
                }
                ret += text.substring(begin, text.length);
                //console.log ret
                return ret;
            }
            clearEditor() {
                this.editor.value("");
                this.inputtags.value = "";
                return this.find("blog-publish").swon = false;
            }
            // load blog
            loadBlogs() {
                return new Promise(async (ok, reject) => {
                    try {
                        let selidx = -1;
                        const el = this.bloglist.selectedItem;
                        selidx = $(el).index();
                        const filter = {
                            order: ["ctime$desc"],
                            fields: [
                                "id",
                                "title",
                                "ctimestr",
                                "ctime",
                                "utime",
                                "utimestr"
                            ]
                        };
                        const r = await this.blogdb.read(filter);
                        for (let v of r) {
                            v.tag = "afx-blogger-post-item";
                        }
                        this.bloglist.data = r;
                        if (selidx !== -1) {
                            return this.bloglist.selected = selidx;
                        }
                        else {
                            this.clearEditor();
                            return this.bloglist.selected = -1;
                        }
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            resizeContent() {
                const container = this.find("editor-container");
                const children = ($(".EasyMDEContainer", container)).children();
                const titlebar = (($(this.scheme)).find(".afx-window-top"))[0];
                const toolbar = children[0];
                const statusbar = children[3];
                const cheight = ($(this.scheme)).height() - ($(titlebar)).height() - ($(toolbar)).height() - ($(statusbar)).height() - 90;
                return ($(children[1])).css("height", cheight + "px");
            }
        }
        application.Blogger = Blogger;
        Blogger.singleton = true;
        Blogger.dependencies = [
            "pkg://SimpleMDE/main.js",
            "pkg://SimpleMDE/main.css",
            "pkg://Katex/main.js",
            "pkg://Katex/main.css",
            "pkg://SQLiteDB/libsqlite.js",
        ];
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));

// Copyright 2017-2018 Xuan Sang LE <xsang.le AT gmail DOT com>
// AnTOS Web desktop is is licensed under the GNU General Public
// License v3.0, see the LICENCE file for more information
// This program is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of 
// the License, or (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
// You should have received a copy of the GNU General Public License
//along with this program. If not, see https://www.gnu.org/licenses/.
var OS;
(function (OS) {
    let application;
    (function (application) {
        let blogger;
        (function (blogger) {
            class BloggerCategoryDialog extends OS.GUI.BasicDialog {
                constructor() {
                    super("BloggerCategoryDialog", BloggerCategoryDialog.scheme);
                }
                main() {
                    super.main();
                    this.tree = this.find("tree");
                    this.txtinput = this.find("txtinput");
                    this.find("bt-ok").onbtclick = (e) => {
                        const sel = this.tree.selectedItem;
                        if (!sel) {
                            return this.notify(__("Please select a parent category"));
                        }
                        const seldata = sel.data;
                        const val = this.txtinput.value;
                        if ((val === "") && !this.data.selonly) {
                            return this.notify(__("Please enter category name"));
                        }
                        if (this.data.cat && (this.data.cat.id === seldata.id)) {
                            return this.notify(__("Parent can not be the category itself"));
                        }
                        if (this.handle) {
                            this.handle({ p: seldata, value: val });
                        }
                        return this.quit();
                    };
                    this.find("bt-cancel").onbtclick = (e) => {
                        return this.quit();
                    };
                    if (this.data && this.data.tree) {
                        if (this.data && this.data.cat) {
                            let seldata;
                            this.txtinput.value = this.data.cat.name;
                            if (this.data.cat.pid === "0") {
                                seldata = this.data.tree;
                            }
                            else {
                                seldata = this.findDataByID(this.data.cat.pid, this.data.tree.nodes);
                            }
                            if (seldata) {
                                seldata.selected = true;
                            }
                        }
                        this.tree.data = this.data.tree;
                        return this.tree.expandAll();
                    }
                }
                // TODO set selected category name
                findDataByID(id, list) {
                    for (let data of list) {
                        if (data.id === id) {
                            return data;
                        }
                        if (data.nodes) {
                            this.findDataByID(id, data.nodes);
                        }
                    }
                    return undefined;
                }
            }
            blogger.BloggerCategoryDialog = BloggerCategoryDialog;
            BloggerCategoryDialog.scheme = `\
<afx-app-window width='300' height='400'>
    <afx-vbox padding="5">
        <afx-label text="__(Pick a parent)" data-height="25" class="lbl-header" ></afx-label>
        <afx-tree-view data-id="tree" ></afx-tree-view>
        <afx-label text="__(Category name)" data-height="25" class="lbl-header" ></afx-label>
        <input type="text" data-height="25" data-id = "txtinput"/ >
        <afx-hbox data-height = '35'>
            <div  style=' text-align:right;'>
                <afx-button data-id = "bt-ok" text = "__(Ok)"></afx-button>
                <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>\s
        `;
            // This dialog is use for cv section editing
            class BloggerCVSectionDiaglog extends OS.GUI.BasicDialog {
                constructor() {
                    super("BloggerCVSectionDiaglog");
                }
                main() {
                    super.main();
                    this.editor = new EasyMDE({
                        autoDownloadFontAwesome: false,
                        element: this.find("contentarea"),
                        status: false,
                        toolbar: false
                    });
                    ($((this.select('[class = "CodeMirror-scroll"]'))[0])).css("min-height", "50px");
                    ($((this.select('[class="CodeMirror cm-s-paper CodeMirror-wrap"]'))[0])).css("min-height", "50px");
                    const inputs = this.select("[input-class='user-input']");
                    if (this.data && this.data.section) {
                        for (let v of inputs) {
                            ($(v)).val(this.data.section[v.name]);
                        }
                    }
                    if (this.data && this.data.section) {
                        this.editor.value(this.data.section.content);
                    }
                    this.find("section-publish").swon = (this.data && this.data.section && Number(this.data.section.publish) ? true : false);
                    this.find("bt-cv-sec-save").onbtclick = (e) => {
                        const data = {};
                        for (let v of inputs) {
                            data[v.name] = ($(v)).val();
                        }
                        data.content = this.editor.value();
                        if ((data.title === "") && (data.content === "")) {
                            return this.notify(__("Title or content must not be blank"));
                        }
                        //return @notify "Content must not be blank" if data.content is ""
                        if (this.data && this.data.section) {
                            data.id = this.data.section.id;
                        }
                        const val = this.find("section-publish").swon;
                        if (val === true) {
                            data.publish = 1;
                        }
                        else {
                            data.publish = 0;
                        }
                        if (this.handle) {
                            this.handle(data);
                        }
                        return this.quit();
                    };
                    this.on("resize", () => this.resizeContent());
                    return this.resizeContent();
                }
                resizeContent() {
                    const container = this.find("editor-container");
                    const children = ($(".EasyMDEContainer", container)).children();
                    const cheight = ($(container)).height() - 30;
                    return ($(children[0])).css("height", cheight + "px");
                }
            }
            blogger.BloggerCVSectionDiaglog = BloggerCVSectionDiaglog;
            BloggerCVSectionDiaglog.scheme = `\
<afx-app-window data-id = "blogger-cv-sec-win" apptitle="Porforlio section" width="450" height="400">
    <afx-vbox padding="5">
        <afx-hbox data-height = "30" >
            <afx-label data-width= "70" text = "__(Title)"></afx-label>
            <input type = "text" name="title" input-class = "user-input"></input>
        </afx-hbox>
        <afx-hbox data-height = "30" >
            <afx-label text = "__(Subtitle)" data-width= "70"></afx-label>
            <input type = "text" name="subtitle" input-class = "user-input"></input>
        </afx-hbox>
        <afx-hbox data-height = "30" >
            <afx-label text = "__(Location)" data-width= "70"></afx-label>
            <input type = "text" name="location" input-class = "user-input"></input>
        </afx-hbox>
        <afx-hbox data-height = "30" >
            <afx-label text = "__(From)" data-width= "70"></afx-label>
            <input type = "text" name="start" input-class = "user-input"></input>
            <afx-label text = "To:" style="text-align:center;" data-width= "70"></afx-label>
            <input type = "text"  name="end" input-class = "user-input"></input>
        </afx-hbox>
        <afx-label data-height = "30" text = "Content" style = "margin-left:5px;"></afx-label>
        <div data-id="editor-container">
        <textarea name="content" data-id = "contentarea" ></textarea>
        </div>
        <div data-height = "35" style="text-align: right;">
            <afx-switch  data-id = "section-publish" data-width="30"></afx-switch>
            <afx-button iconclass = "fa fa-save" data-id = "bt-cv-sec-save"  text = "__(Save)"></afx-button>
        </div>
    </afx-vbox>
</afx-app-window>`;
            // this dialog is for send mail
            class BloggerSendmailDiaglog extends OS.GUI.BasicDialog {
                constructor() {
                    super("BloggerSendmailDiaglog");
                }
                main() {
                    super.main();
                    this.maillinglist = this.find("email-list");
                    const title = (new RegExp("^#+(.*)\n", "g")).exec(this.data.content);
                    this.find("mail-title").value = title[1];
                    const content = (this.data.content.substring(0, 500)) + "...";
                    this.find("contentarea").value = BloggerSendmailDiaglog.template.format(this.data.id, content);
                    const mlist = this.data.mails.map((el) => {
                        return {
                            text: el.name,
                            email: el.email,
                            switch: true,
                            checked: true
                        };
                    });
                    this.maillinglist.data = mlist;
                    return this.find("bt-sendmail").onbtclick = (e) => {
                        const items = this.maillinglist.data;
                        const emails = [];
                        for (let v of items) {
                            if (v.checked === true) {
                                console.log(v.email);
                                emails.push(v.email);
                            }
                        }
                        if (emails.length === 0) {
                            return this.notify(__("No email selected"));
                        }
                        // send the email
                        const data = {
                            path: `${this.meta().path}/sendmail.lua`,
                            parameters: {
                                to: emails,
                                title: this.find("mail-title").value,
                                content: this.find("contentarea").value
                            }
                        };
                        return this._api.apigateway(data, false)
                            .then((d) => {
                            if (d.error) {
                                return this.notify(__("Unable to send mail to: {0}", d.result.join(",")));
                            }
                            return this.quit();
                        }).catch((e) => {
                            console.log(e);
                            return this.error(__("Error sending mail: {0}", e.toString()), e);
                        });
                    };
                }
            }
            blogger.BloggerSendmailDiaglog = BloggerSendmailDiaglog;
            BloggerSendmailDiaglog.scheme = `\
<afx-app-window data-id = "blogger-send-mail-win" apptitle="Send mail" width="500" height="400" resizable = "false">
    <afx-hbox>
        <afx-menu data-width="150" data-id="email-list"></afx-menu>
        <afx-resizer data-width="3"></afx-resizer>
        <div data-width="5"></div>
        <afx-vbox >
                <div data-height="5"></div>
                <afx-label data-height="20" text = "__(Title)"></afx-label>
                <input type = "text" data-height="20" name="title" data-id = "mail-title"></input>
                <afx-label data-height = "20" text = "Content" ></afx-label>
                <textarea name="content" data-id = "contentarea" ></textarea>
                <div data-height="5"></div>
                <afx-hbox data-height = "30">
                    <div></div>
                    <afx-button iconclass = "fa fa-paper-plane" data-id = "bt-sendmail" data-width="60" text = "__(Send)"></afx-button>
                </afx-hbox>
        </afx-vbox>
        <div data-width="5"></div>
    </afx-hbox>
</afx-app-window>`;
            BloggerSendmailDiaglog.template = `\
Hello,

Xuan Sang LE has just published a new post on his blog: https://blog.iohub.dev/post/id/{0}

==========
{1}
==========


Read the full article via:
https://blog.iohub.dev/post/id/{0}

You receive this email because you have been subscribed to his blog.

Have a nice day,

Sent from Blogger, an AntOS application\
`;
        })(blogger = application.blogger || (application.blogger = {}));
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));

var OS;
(function (OS) {
    let application;
    (function (application) {
        let blogger;
        (function (blogger) {
            class CVSectionListItemTag extends OS.GUI.tag.ListViewItemTag {
                constructor() {
                    super();
                }
                ondatachange() {
                    if (!this.data) {
                        return;
                    }
                    const v = this.data;
                    const nativel = ["content", "start", "end"];
                    this.closable = v.closable;
                    return (() => {
                        const result = [];
                        for (let k in this.refs) {
                            const el = this.refs[k];
                            if (v[k] && (v[k] !== "")) {
                                if (nativel.includes(k)) {
                                    result.push($(el).text(v[k]));
                                }
                                else {
                                    result.push(el.text = v[k]);
                                }
                            }
                            else {
                                result.push(undefined);
                            }
                        }
                        return result;
                    })();
                }
                reload() { }
                init() { }
                itemlayout() {
                    return {
                        el: "div", children: [
                            { el: "afx-label", ref: "title", class: "afx-cv-sec-title" },
                            { el: "afx-label", ref: "subtitle", class: "afx-cv-sec-subtitle" },
                            { el: "p", ref: "content", class: "afx-cv-sec-content" },
                            {
                                el: "p", class: "afx-cv-sec-period", children: [
                                    { el: "i", ref: "start" },
                                    { el: "i", ref: "end", class: "period-end" }
                                ]
                            },
                            { el: "afx-label", ref: "location", class: "afx-cv-sec-loc" }
                        ]
                    };
                }
            }
            OS.GUI.tag.define("afx-blogger-cvsection-item", CVSectionListItemTag);
            class BlogPostListItemTag extends OS.GUI.tag.ListViewItemTag {
                constructor() {
                    super();
                }
                ondatachange() {
                    if (!this.data) {
                        return;
                    }
                    const v = this.data;
                    v.closable = true;
                    this.closable = v.closable;
                    this.refs.title.text = v.title;
                    this.refs.ctimestr.text = __("Created: {0}", v.ctimestr);
                    this.refs.utimestr.text = __("Updated: {0}", v.utimestr);
                }
                reload() { }
                init() { }
                itemlayout() {
                    return {
                        el: "div", children: [
                            { el: "afx-label", ref: "title", class: "afx-blogpost-title" },
                            { el: "afx-label", ref: "ctimestr", class: "blog-dates" },
                            { el: "afx-label", ref: "utimestr", class: "blog-dates" },
                        ]
                    };
                }
            }
            OS.GUI.tag.define("afx-blogger-post-item", BlogPostListItemTag);
        })(blogger = application.blogger || (application.blogger = {}));
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));
