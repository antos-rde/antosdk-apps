
var OS;
(function (OS) {
    let GUI;
    (function (GUI) {
        let tag;
        (function (tag) {
            class TextureListItem extends tag.ListViewItemTag {
                itemlayout() {
                    return {
                        el: "div",
                        children: [
                            {
                                el: "img",
                                ref: "img"
                            },
                            {
                                el: "p",
                                ref: "name"
                            }
                        ]
                    };
                }
                ondatachange() {
                    const v = this.data;
                    const img = this.refs.img;
                    const uri = v.path.asFileHandle().getlink();
                    img.src = uri;
                    $(this.refs.name).text(v.name);
                }
                init() {
                    this.closable = true;
                }
                reload(d) {
                }
            }
            tag.define("afx-shader-texture-item", TextureListItem);
        })(tag = GUI.tag || (GUI.tag = {}));
    })(GUI = OS.GUI || (OS.GUI = {}));
    let application;
    (function (application) {
        class AddTextureDialog extends GUI.BasicDialog {
            constructor() {
                super("AddTextureDialog", AddTextureDialog.scheme);
            }
            main() {
                super.main();
                const inputs = $("input", this.scheme);
                this.find("btnOk").onbtclick = (e) => {
                    let cdata = {};
                    for (const el of inputs) {
                        let input = el;
                        if (input.value.trim() == "") {
                            return this.notify(__("All fields should be filled"));
                        }
                        cdata[input.name] = input.value.trim();
                    }
                    if (this.handle)
                        this.handle(cdata);
                    this.quit();
                };
                this.find("btnFile").onbtclick = (e) => {
                    this.openDialog("FileDialog", {
                        title: __("Select image file"),
                        type: "file",
                        mimes: ["image/.*"]
                    })
                        .then((d) => {
                        this.find("txtPath").value = d.file.path;
                    });
                };
            }
        }
        AddTextureDialog.scheme = `\
<afx-app-window width='250' height='170'>
    <afx-hbox>
        <div data-width="5"></div>
        <afx-vbox>
            <div data-height="5"></div>
            <afx-label text="__(Name)" data-height="25"></afx-label>
            <input type="text" data-height="25" name="name"> </input>
            <div data-height="5"></div>
            <afx-label text="__(Path/URL)" data-height="25"></afx-label>
            <afx-hbox data-height="26">
                <input type="text" name="path" data-id="txtPath"> </input>
                <afx-button data-id="btnFile" iconclass = "bi bi-folder2-open" data-width="25"></afx-button>
            </afx-hbox>
            <div data-height="5"></div>
            <div style="text-align:right;">
                <afx-button text="__(Ok)" data-id="btnOk"></afx-button>
            </div>
            <div data-height="5"></div>
        </afx-vbox>
        <div data-width="5"></div>
    </afx-hbox>
</afx-app-window>\
`;
        class ShaderEditor {
            constructor(domel, renderer) {
                this.glsl_values = [ShaderEditor.frg_template, ""];
                this.renderer = renderer;
                this.ums = [new ace.UndoManager(), new ace.UndoManager()];
                this.current_idx = -1;
                this.tmp_canvas = $("<canvas />")[0];
                this.gl_compiling_ctx = this.tmp_canvas.getContext("webgl");
                this._filehandle = undefined;
                this.editormux = false;
                ace.require("ace/ext/language_tools");
                this._onfilechange = (v) => { };
                this._ontextureadded = (t) => { };
                this.editor = ace.edit(domel);
                this.editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    highlightActiveLine: true,
                    //fontSize: "9pt"
                });
                this.editor.getSession().setUseWrapMode(true);
                this.editor.session.setMode("ace/mode/glsl");
                this.editor.setTheme("ace/theme/monokai");
                this.cursors = [
                    this.editor.getCursorPosition(),
                    this.editor.getCursorPosition()
                ];
                this.editor.on("input", (e) => {
                    const value = this.editor.getValue();
                    const stype = this.current_idx == 0 ? this.gl_compiling_ctx.FRAGMENT_SHADER : this.gl_compiling_ctx.VERTEX_SHADER;
                    const errors = this.compile(value, stype);
                    if (this.filehandle.dirty === false && !this.editormux) {
                        this.filehandle.dirty = true;
                        this._onfilechange(`${this.filehandle.path}*`);
                    }
                    if (this.editormux) {
                        this.editormux = false;
                    }
                    if (errors) {
                        const reg_str = "ERROR:\\s*([0-9]+):([0-9]+):\\s*(.*)\\n";
                        const matches = errors.match(new RegExp(reg_str, "g"));
                        if (matches) {
                            this.editor.getSession().setAnnotations(matches.map((match) => {
                                const err_data = match.match(new RegExp(reg_str));
                                let ret = {};
                                if (err_data) {
                                    ret = {
                                        row: parseInt(err_data[2]) - 1,
                                        column: 0,
                                        text: err_data[3],
                                        type: "error"
                                    };
                                }
                                return ret;
                            }));
                        }
                    }
                    else {
                        this.editor.getSession().setAnnotations([]);
                        this.glsl_values[this.current_idx] = value;
                        this.renderer.apply_mat(this.glsl_values[0], this.glsl_values[1]);
                    }
                });
            }
            set onfilechange(fn) {
                this._onfilechange = fn;
            }
            set ontextureadded(fn) {
                this._ontextureadded = fn;
            }
            set filehandle(v) {
                this._filehandle = v;
                this.read();
            }
            get filehandle() {
                return this._filehandle;
            }
            read() {
                return new Promise(async (resolve, reject) => {
                    if (this._filehandle === undefined) {
                        this.renderer.textures.length = 0;
                        this._filehandle = "Untitled".asFileHandle();
                        this._onfilechange(this._filehandle.path);
                        this.glsl_values = [ShaderEditor.frg_template, ""];
                        if (this.current_idx != 2 && this.current_idx != -1) {
                            this.editormux = true;
                            this.editor.setValue(this.glsl_values[this.current_idx]);
                        }
                        this._ontextureadded(undefined);
                        return resolve(undefined);
                    }
                    try {
                        const data = await this._filehandle.read("json");
                        this.glsl_values[0] = data.source[0];
                        this.glsl_values[1] = data.source[1];
                        if (this.current_idx != 2 && this.current_idx != -1) {
                            this.editormux = true;
                            this.editor.setValue(this.glsl_values[this.current_idx]);
                        }
                        this._ontextureadded(undefined);
                        for (const v of data.textures) {
                            this._ontextureadded(v);
                        }
                        this._onfilechange(this._filehandle.path);
                        resolve(undefined);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }
            write(p) {
                return new Promise(async (resolve, reject) => {
                    let path = p;
                    const error = __("Unknown save path");
                    if (!path) {
                        if (this._filehandle === undefined)
                            return reject(error);
                        path = this._filehandle.path;
                    }
                    if (path === "Untitled") {
                        return reject(error);
                    }
                    try {
                        this._filehandle.setPath(path);
                        const data = {};
                        if (this.current_idx != 2) {
                            this.glsl_values[this.current_idx] = this.editor.getValue();
                        }
                        data.source = this.glsl_values;
                        data.textures = this.renderer.textures.map((v) => {
                            return {
                                name: v.name,
                                path: v.path
                            };
                        });
                        this.filehandle.cache = data;
                        const ret = await this.filehandle.write("object");
                        this._filehandle.dirty = false;
                        this._onfilechange(`${this.filehandle.path}`);
                        resolve(undefined);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }
            compile(code, type) {
                // Compiles either a shader of type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
                let shader = this.gl_compiling_ctx.createShader(type);
                this.gl_compiling_ctx.shaderSource(shader, code);
                this.gl_compiling_ctx.compileShader(shader);
                let errors = undefined;
                if (!this.gl_compiling_ctx.getShaderParameter(shader, this.gl_compiling_ctx.COMPILE_STATUS)) {
                    errors = this.gl_compiling_ctx.getShaderInfoLog(shader);
                }
                this.gl_compiling_ctx.deleteShader(shader);
                return errors;
            }
            edit(index) {
                if (index < 0) {
                    return;
                }
                if (index != 2 && this.current_idx != 2) {
                    if (index === 0) {
                        this.glsl_values[1] = this.editor.getValue();
                        this.cursors[1] = this.editor.getCursorPosition();
                    }
                    else if (index === 1) {
                        this.glsl_values[0] = this.editor.getValue();
                        this.cursors[0] = this.editor.getCursorPosition();
                    }
                }
                else if (index == 2) {
                    this.glsl_values[this.current_idx] = this.editor.getValue();
                    this.cursors[this.current_idx] = this.editor.getCursorPosition();
                    this.current_idx = index;
                    return;
                }
                this.current_idx = index;
                this.editormux = true;
                this.editor.getSession().setUndoManager(new ace.UndoManager());
                this.editor.setValue(this.glsl_values[index]);
                this.editor.getSession().setUndoManager(this.ums[index]);
                const c = this.cursors[index];
                this.editor.renderer.scrollCursorIntoView({
                    row: c.row,
                    column: c.column,
                }, 0.5);
                this.editor.selection.moveTo(c.row, c.column);
                this.editor.focus();
            }
            cleanup() {
                this.renderer.cleanup();
                $(this.tmp_canvas).remove();
            }
            resize() {
                this.editor.resize();
                this.renderer.viewport_resize();
            }
        }
        ;
        class ShaderRenderer {
            constructor(canvas) {
                this.textures = [];
                this.renderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    alpha: true
                });
                this.renderer.autoClearColor = false;
                this.clock = new THREE.Clock();
                this.camera = new THREE.OrthographicCamera(-1, // left
                1, // right
                1, // top
                -1, // bottom
                -1, // near,
                1);
                this.needupdateTexture = false;
                this.scene = new THREE.Scene();
                const material = new THREE.MeshBasicMaterial({
                    color: 'white',
                });
                const plane = new THREE.PlaneGeometry(2, 2);
                this.mesh = new THREE.Mesh(plane, material);
                this.scene.add(this.mesh);
                this.uniforms = {
                    u_resolution: { value: { x: 0, y: 0 } },
                    u_time: { value: 0.0 },
                    u_mouse: { value: { x: 0, y: 0 } },
                };
                this.viewport_resize();
                this.ani_request_id = requestAnimationFrame(() => this.viewport_render());
            }
            viewport_render() {
                if (this.needupdateTexture) {
                    this.update_textures();
                    this.needupdateTexture = false;
                }
                this.uniforms.u_time.value = this.clock.getElapsedTime();
                try {
                    this.renderer.render(this.scene, this.camera);
                }
                catch (e) {
                    console.error(e);
                }
                this.ani_request_id = requestAnimationFrame(() => this.viewport_render());
            }
            viewport_resize() {
                const canvas = this.renderer.domElement;
                const width = canvas.clientWidth;
                const height = canvas.clientHeight;
                this.uniforms.u_resolution.value.x = width;
                this.uniforms.u_resolution.value.y = height;
                const needResize = canvas.width !== width || canvas.height !== height;
                if (needResize) {
                    this.renderer.setSize(width, height, false);
                }
            }
            cleanup() {
                console.log("Stop the animation before quitting...");
                window.cancelAnimationFrame(this.ani_request_id);
            }
            update_textures() {
                for (const key in this.uniforms) {
                    if (["u_resolution", "u_time", "u_mouse"].indexOf(key) === -1) {
                        this.uniforms[key] = new THREE.MeshBasicMaterial({
                            color: 'black',
                        });
                    }
                }
                for (const v of this.textures) {
                    this.uniforms[v.name] = { value: v.texture };
                }
                console.log(this.uniforms);
            }
            apply_mat(fragment_shader, vertex_shader) {
                const empty_main = "void main(){}";
                const opts = {
                    fragmentShader: fragment_shader.trim() === "" ? empty_main : fragment_shader,
                    uniforms: this.uniforms,
                    vertexShader: undefined
                };
                if (vertex_shader.trim() != "")
                    opts.vertexShader = vertex_shader;
                const mat = new THREE.ShaderMaterial(opts);
                this.mesh.material = mat;
                console.log(this.uniforms);
            }
        }
        ShaderEditor.frg_template = `\
#ifdef GL_ES
precision mediump float;
#endif
// uniform vec2 u_resolution;
// uniform vec2 u_mouse;
uniform float u_time;

void main() {
    gl_FragColor = vec4(abs(sin(u_time)),0.0,0.0,1.0);
}\
        `;
        /**
         *
         * @class ShaderPlayground
         * @extends {BaseApplication}
         */
        class ShaderPlayground extends application.BaseApplication {
            constructor(args) {
                super("ShaderPlayground", args);
            }
            main() {
                this.init_editor();
                this.init_textures_list();
                this.bindKey("ALT-N", () => {
                    return this.newFile();
                });
                this.bindKey("ALT-O", () => {
                    return this.openFile();
                });
                this.bindKey("CTRL-S", () => {
                    return this.saveFile();
                });
            }
            /**
             * Init the editor for fragment and
             * vertex shader
             */
            init_editor() {
                this.tabbar = this.find("tabbar");
                this.tabbar.items = [
                    {
                        text: __("Fragment"),
                        iconclass: "bi bi-palette"
                    },
                    {
                        text: __("Vertex"),
                        iconclass: "bi bi-intersect"
                    },
                    {
                        text: __("Textures"),
                        iconclass: "bi bi-image-alt"
                    }
                ];
                this.tabbar.ontabselect = (_e) => {
                    this.selectTab();
                };
                this.editor = new ShaderEditor(this.find("editor-container"), new ShaderRenderer(this.find("viewport")));
                this.on("resize", (e) => {
                    this.editor.resize();
                });
                this.editor.onfilechange = (v) => {
                    this.scheme.apptitle = v;
                };
                this.editor.ontextureadded = (v) => {
                    this.add_texture(v);
                };
                this.editor.filehandle = undefined;
                this.tabbar.selected = 0;
            }
            add_texture(data) {
                {
                    const listview = this.find("texture-list");
                    if (!data) {
                        this.editor.renderer.textures = [];
                        listview.data = this.editor.renderer.textures;
                        this.editor.renderer.needupdateTexture = true;
                        return;
                    }
                    const loader = new THREE.TextureLoader();
                    const texture = loader.load(data.path.asFileHandle().getlink());
                    texture.minFilter = THREE.NearestFilter;
                    texture.magFilter = THREE.NearestFilter;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    data.texture = texture;
                    listview.push(data);
                    this.editor.renderer.needupdateTexture = true;
                }
            }
            init_textures_list() {
                const listview = this.find("texture-list");
                listview.buttons = [
                    {
                        text: "__(Add texture)",
                        iconclass: "bi bi-plus",
                        onbtclick: (_e) => {
                            this
                                .openDialog(new AddTextureDialog())
                                .then((data) => this.add_texture(data));
                        }
                    }
                ];
                listview.itemtag = "afx-shader-texture-item";
                listview.onitemclose = (e) => {
                    this.editor.renderer.needupdateTexture = true;
                    return true;
                };
                this.add_texture(undefined);
            }
            selectTab() {
                const index = this.tabbar.selected;
                if (index === 2) {
                    $(this.find("editor-container")).hide();
                    $(this.find("texture-list")).show();
                }
                else {
                    $(this.find("editor-container")).show();
                    $(this.find("texture-list")).hide();
                }
                this.editor.edit(index);
            }
            menu() {
                return [
                    {
                        text: "__(File)",
                        nodes: [
                            {
                                text: "__(New)",
                                dataid: "new",
                                shortcut: 'A-N'
                            },
                            {
                                text: "__(Open)",
                                dataid: "open",
                                shortcut: 'A-O'
                            },
                            {
                                text: "__(Save)",
                                dataid: "save",
                                shortcut: 'C-S'
                            }
                        ],
                        onchildselect: (e) => {
                            switch (e.data.item.data.dataid) {
                                case "new":
                                    return this.newFile();
                                case "open":
                                    return this.openFile();
                                case "save":
                                    return this.saveFile();
                            }
                        }
                    }
                ];
            }
            ignore_unsaved() {
                return new Promise(async (resolve, reject) => {
                    if (this.editor.filehandle.dirty === true) {
                        const r = await this.ask({
                            title: __("Unsaved shader"),
                            text: __("Ignore unsaved file?")
                        });
                        if (!r) {
                            return resolve(false);
                        }
                        return resolve(true);
                    }
                    return resolve(true);
                });
            }
            async newFile() {
                const ignore = await this.ignore_unsaved();
                if (!ignore)
                    return;
                this.editor.filehandle = undefined;
            }
            async openFile() {
                try {
                    const ignore = await this.ignore_unsaved();
                    if (!ignore)
                        return;
                    const d = await this.openDialog("FileDialog", {
                        title: __("Open file"),
                        mimes: this.meta().mimes
                    });
                    this.editor.filehandle.setPath(d.file.path);
                    await this.editor.read();
                }
                catch (e) {
                    this.error(__(e.toString()), e);
                }
            }
            async saveFile() {
                if (this.editor.filehandle.path !== "Untitled") {
                    return this.editor.write(undefined);
                }
                const f = await this.openDialog("FileDialog", {
                    title: __("Save as"),
                    file: this.editor.filehandle
                });
                let handle = f.file.path.asFileHandle();
                if (f.file.type === "file") {
                    handle = handle.parent();
                }
                try {
                    await this.editor.write(`${handle.path}/${f.name}`);
                }
                catch (e) {
                    this.error(__(e.toString()), e);
                }
            }
            cleanup(e) {
                if (this.editor.filehandle.dirty) {
                    this.ignore_unsaved()
                        .then((d) => {
                        if (d) {
                            this.editor.filehandle.dirty = false;
                            this.quit(true);
                        }
                    });
                    e.preventDefault();
                    return;
                }
                this.editor.cleanup();
            }
        }
        application.ShaderPlayground = ShaderPlayground;
        /**
         * Application dependenicies preload
        */
        ShaderPlayground.dependencies = [
            "pkg://libthreejs/main.js",
            "pkg://ACECore/core/ace.js",
            "pkg://ACECore/path.js",
            "pkg://ACECore/core/ext-language_tools.js"
        ];
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));
