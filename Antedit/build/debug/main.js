
var OS;
(function (OS) {
    let API;
    (function (API) {
        let VFS;
        (function (VFS) {
            class DiffEditorFileHandle extends OS.API.VFS.BaseFileHandle {
                constructor(files) {
                    super("");
                    this.path = `${files[0].path} -> ${files[1].path}`;
                    this.cache = files;
                    this.basename = `${files[0].basename} -> ${files[1].basename}`;
                    this.info = {
                        type: "file",
                        mime: undefined,
                        size: 0,
                        name: this.basename,
                        path: this.path
                    };
                    this.ready = true;
                }
                meta() {
                    return new Promise(async (resolve, reject) => {
                        try {
                            await Promise.all([this.cache[0].meta(), this.cache[1].meta]);
                            resolve({
                                result: this.info,
                                error: false,
                            });
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                }
                _rd(_t) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            this.cache[0].cache = await this.cache[0].read();
                            this.cache[1].cache = await this.cache[1].read();
                            resolve(this.cache);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                }
                _wr(t, d) {
                    this.cache = d;
                    return new Promise((resolve, reject) => {
                        resolve({
                            result: true,
                            error: false,
                        });
                    });
                }
                setPath(s) {
                    // do nothing
                }
            }
            VFS.DiffEditorFileHandle = DiffEditorFileHandle;
        })(VFS = API.VFS || (API.VFS = {}));
    })(API = OS.API || (OS.API = {}));
    let application;
    (function (application) {
        class BaseEditorModel {
            /**
             * Editor mutex
             *
             * @private
             * @type {boolean}
             * @memberof BaseEditorModel
             */
            //private editormux: boolean;
            /**
             * Creates an instance of BaseEditorModel.
             *
             * @param {Antedit} app parent app
             * @param {GUI.tag.TabBarTag} tabbar tabbar DOM element
             * @param {HTMLElement} editorarea editor container DOM element
             * @memberof BaseEditorModel
             */
            constructor(app, tabbar, editorarea) {
                this.container = editorarea;
                this.currfile = "Untitled".asFileHandle();
                this.tabbar = tabbar;
                this.editorSetup(editorarea);
                this.app = app;
                // this.editormux = false;
                this.onstatuschange = undefined;
                this.on("focus", () => {
                    if (this.onstatuschange)
                        this.onstatuschange(this.getEditorStatus());
                });
                this.on("input", () => {
                    // console.log(this.editormux, this.currfile.dirty);
                    /*if (this.editormux) {
                        this.editormux = false;
                        console.log("set editor mux to false");
                        return false;
                    }*/
                    if (!this.currfile.dirty) {
                        console.log("dirty", this.currfile.path);
                        this.currfile.dirty = true;
                        this.currfile.text += "*";
                        return this.tabbar.update(undefined);
                    }
                });
                this.on("changeCursor", () => {
                    if (this.onstatuschange)
                        this.onstatuschange(this.getEditorStatus());
                });
                this.tabbar.ontabselect = (e) => {
                    return this.selecteTab($(e.data.item).index());
                };
                this.tabbar.ontabclose = (e) => {
                    const it = e.data.item;
                    if (!it) {
                        return false;
                    }
                    if (!it.data.dirty) {
                        return this.closeTab(it);
                    }
                    this.app.openDialog("YesNoDialog", {
                        title: __("Close tab"),
                        text: __("Close without saving ?"),
                    }).then((d) => {
                        if (d) {
                            return this.closeTab(it);
                        }
                        return this.focus();
                    });
                    return false;
                };
            }
            /**
             * Find a tab on the tabbar corresponding to a file handle
             *
             * @private
             * @param {EditorFileHandle} file then file handle to search
             * @returns {number}
             * @memberof BaseEditorModel
             */
            findTabByFile(file) {
                const lst = this.tabbar.items;
                const its = (() => {
                    const result = [];
                    for (let i = 0; i < lst.length; i++) {
                        const d = lst[i];
                        if (d.hash() === file.hash()) {
                            result.push(i);
                        }
                    }
                    return result;
                })();
                if (its.length === 0) {
                    return -1;
                }
                return its[0];
            }
            /**
             * Create new tab when opening a file
             *
             * @private
             * @param {EditorFileHandle} file
             * @memberof BaseEditorModel
             */
            newTab(file) {
                file.text = file.basename ? file.basename : file.path;
                if (!file.cache) {
                    file.cache = "";
                }
                file.textModel = this.newTextModelFrom(file);
                this.currfile.selected = false;
                file.selected = true;
                //console.log cnt
                this.tabbar.push(file);
            }
            /**
             * Close a tab when a file is closed
             *
             * @param {GUI.tag.ListViewItemTag} it reference to the tab to close
             * @returns {boolean}
             * @memberof BaseEditorModel
             */
            closeTab(it) {
                this.tabbar.delete(it);
                const cnt = this.tabbar.items.length;
                if (cnt === 0) {
                    this.openFile("Untitled".asFileHandle());
                    return false;
                }
                this.tabbar.selected = cnt - 1;
                return false;
            }
            /**
             * Select a tab by its index
             *
             * @private
             * @param {number} i tab index
             * @returns {void}
             * @memberof BaseEditorModel
             */
            selecteTab(i) {
                //return if i is @tabbar.get "selidx"
                const file = this.tabbar.items[i];
                if (!file) {
                    return;
                }
                //return if file is @currfile
                if (this.currfile !== file) {
                    this.currfile.textModel = this.getTexModel();
                    this.currfile.selected = false;
                    this.currfile = file;
                }
                // this.editormux = true;
                this.setTextModel(file.textModel);
                this.focus();
            }
            /**
             * Select an opened file, this will select the corresponding tab
             *
             * @param {(EditorFileHandle | string)} file
             * @memberof BaseEditorModel
             */
            selectFile(file) {
                const i = this.findTabByFile(file.asFileHandle());
                if (i !== -1) {
                    this.tabbar.selected = i;
                }
            }
            /**
             * Open a file in new tab. If the file is already opened,
             * the just select the tab
             *
             *
             * @param {EditorFileHandle} file file to open
             * @returns {void}
             * @memberof BaseEditorModel
             */
            openFile(file) {
                //find tab
                const i = this.findTabByFile(file);
                if (i !== -1) {
                    this.tabbar.selected = i;
                    return;
                }
                if (file.path.toString() === "Untitled") {
                    this.newTab(file);
                    return;
                }
                file.read()
                    .then((d) => {
                    file.cache = d || "";
                    return this.newTab(file);
                })
                    .catch((e) => {
                    return this.app.error(__("Unable to open: {0}", file.path), e);
                });
            }
            /**
             * write a file
             *
             * @private
             * @param {EditorFileHandle} file
             * @memberof BaseEditorModel
             */
            write() {
                this.currfile.cache = this.getValue();
                this.currfile.write("text/plain")
                    .then((d) => {
                    this.currfile.dirty = false;
                    this.currfile.text = this.currfile.basename;
                    this.tabbar.update(undefined);
                })
                    .catch((e) => this.app.error(__("Unable to save file: {0}", this.currfile.path), e));
            }
            /**
             * Save the current opened file
             *
             * @return {*}  {void}
             * @memberof BaseEditorModel
             */
            save() {
                this.currfile.cache = this.getValue();
                if (this.currfile.basename) {
                    return this.write();
                }
                return this.saveAs();
            }
            /**
             * Save the current file as another file
             *
             * @public
             * @memberof BaseEditorModel
             */
            saveAs() {
                this.app.openDialog("FileDialog", {
                    title: __("Save as"),
                    file: this.currfile,
                }).then((f) => {
                    let d = f.file.path.asFileHandle();
                    if (f.file.type === "file") {
                        d = d.parent();
                    }
                    this.currfile.setPath(`${d.path}/${f.name}`);
                    this.write();
                });
            }
            /**
             * Get all dirty file handles in the editor
             *
             * @return {*}  {EditorFileHandle[]}
             * @memberof BaseEditorModel
             */
            dirties() {
                const result = [];
                for (let v of Array.from(this.tabbar.items)) {
                    if (v.dirty) {
                        result.push(v);
                    }
                }
                return result;
            }
            /**
             * Context menu handle for the editor
             *
             * @memberof BaseEditorModel
             */
            set contextmenuHandle(cb) {
                this.container.contextmenuHandle = cb;
            }
            /**
             * Close all opened files
             *
             * @memberof BaseEditorModel
             */
            closeAll() {
                this.tabbar.items = [];
                this.openFile("Untitled".asFileHandle());
                this.resetEditor();
            }
            /**
             * Check whether the editor is dirty
             *
             * @return {*}  {boolean}
             * @memberof BaseEditorModel
             */
            isDirty() {
                return this.dirties().length > 0;
            }
            /**
             * Set model tabbar menu context event
             *
             * @memberof BaseEditorModel
             */
            setTabbarCtxMenu(items, handle) {
                this.tabbar.contextmenuHandle = (evt, m) => {
                    m.items = items;
                    m.onmenuselect = (e) => {
                        if (handle) {
                            /**
                             * get the tab under the cursor
                             */
                            const tab = $(evt.target).closest("afx-list-item");
                            handle(tab[0], e.data.item.data);
                        }
                    };
                    return m.show(evt);
                };
            }
        }
        application.BaseEditorModel = BaseEditorModel;
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));

var OS;
(function (OS) {
    //declare var monaco: any;
    let application;
    (function (application) {
        /**
         * Wrapper model for the ACE text editor
         *
         * @export
         * @class MonacoEditorModel
         * @extends {BaseEditorModel}
         */
        class MonacoEditorModel extends OS.application.BaseEditorModel {
            /**
             * Creates an instance of MonacoEditorModel.
             * @param {MonacoEditorModel} app MonacoEditorModel instance
             * @param {GUI.tag.TabBarTag} tabbar tabbar element
             * @param {HTMLElement} editorarea main editor container element
             * @memberof MonacoEditorModel
             */
            constructor(app, tabbar, editorarea) {
                super(app, tabbar, editorarea);
            }
            /**
             * Reset the editor
             *
             * @protected
             * @memberof MonacoEditorModel
             */
            resetEditor() {
            }
            /**
             * Get a text model from the current editor session
             *
             * @protected
             * @return {*}
             * @memberof MonacoEditorModel
             */
            getTexModel() {
                return {
                    model: this.editor.getModel(),
                    position: this.editor.getPosition()
                };
            }
            /**
             * Set text model to current editor session
             *
             * @protected
             * @param {*} model
             * @memberof MonacoEditorModel
             */
            setTextModel(model) {
                this.editor.setModel(model.model);
                if (model.position) {
                    this.editor.setPosition(model.position);
                    this.editor.revealLineInCenter(model.position.lineNumber);
                }
            }
            /**
             * Create new editor model from file
             *
             * @protected
             * @param {EditorFileHandle} file
             * @return {*}  {*}
             * @memberof MonacoEditorModel
             */
            newTextModelFrom(file) {
                if (Array.isArray(file.cache)) {
                    return {
                        model: {
                            original: this.newTextModelFrom(file.cache[0]).model,
                            modified: this.newTextModelFrom(file.cache[1]).model
                        }
                    };
                }
                else {
                    if (file.path.toString() === "Untitled") {
                        return {
                            model: monaco.editor.createModel(file.cache, "textplain")
                        };
                    }
                    const uri = monaco.Uri.parse(file.protocol + "://antedit/file/" + file.genealogy.join("/"));
                    const model = monaco.editor.getModel(uri);
                    if (model) {
                        model.setValue(file.cache);
                        return { model: model };
                    }
                    return {
                        model: monaco.editor.createModel(file.cache, undefined, uri)
                    };
                }
            }
            /**
             * Get language modes
             *
             * @return {*}  {GenericObject<any>[]}
             * @memberof MonacoEditorModel
             */
            getModes() {
                //const list = [];
                //return list;
                return monaco.languages.getLanguages().map(e => {
                    const item = e;
                    if (e.aliases)
                        item.text = e.aliases[0];
                    else
                        item.text = e.id;
                    return e;
                });
            }
            /**
             * Set the editor theme
             *
             * @param {string} theme theme name
             * @memberof MonacoEditorModel
             */
            setTheme(theme) {
            }
            /**
             * Set editor language mode
             *
             * The mode object should be in the following format:
             * ```ts
             * {
             *  text: string,
             *  mode: string
             * }
             * ```
             *
             * @param {GenericObject<any>} m language mode object
             * @memberof MonacoEditorModel
             */
            setMode(m) {
                if (this.editor == this._code_editor) {
                    monaco.editor.setModelLanguage(this.editor.getModel(), m.id);
                }
                else {
                    for (const model of this.editor.getModel()) {
                        monaco.editor.setModelLanguage(model, m.id);
                    }
                }
                if (this.onstatuschange)
                    this.onstatuschange(this.getEditorStatus());
            }
            /**
             * Getter get current editor instance based on current file
             *
             * @private
             * @type {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            get editor() {
                if (Array.isArray(this.currfile.cache)) {
                    return this._diff_editor;
                }
                return this._code_editor;
            }
            /**
             * Setup the editor
             *
             * @protected
             * @param {HTMLElement} el editor container DOM
             * @memberof MonacoEditorModel
             */
            editorSetup(el) {
                // create two editor instancs for code mode and diff mode
                this.code_container = $("<div />")
                    .css("width", "100%")
                    .css("height", "100%");
                this.diff_container = $("<div />")
                    .css("width", "100%")
                    .css("height", "100%")
                    .css("display", "none");
                $(el).append(this.code_container);
                $(el).append(this.diff_container);
                this._code_editor = monaco.editor.create(this.code_container[0], {
                    value: "",
                    language: 'textplain'
                });
                this._diff_editor = monaco.editor.createDiffEditor(this.diff_container[0], {
                    readOnly: true
                });
                if (!MonacoEditorModel.modes) {
                    MonacoEditorModel.modes = {};
                    monaco.languages.getLanguages().forEach((el) => {
                        MonacoEditorModel.modes[el.id] = el;
                    });
                }
            }
            /**
             * Register to editor event
             *
             * @param {string} evt_str event name
             * @param {() => void} callback callback function
             * @memberof MonacoEditorModel
             */
            on(evt_str, callback) {
                switch (evt_str) {
                    case "input":
                        this._code_editor.onDidChangeModelContent(callback);
                        break;
                    case "focus":
                        this._code_editor.onDidFocusEditorText(callback);
                        this._diff_editor.getOriginalEditor().onDidFocusEditorText(callback);
                        this._diff_editor.getModifiedEditor().onDidFocusEditorText(callback);
                        break;
                    case "changeCursor":
                        this._code_editor.onDidChangeCursorPosition(callback);
                        this._diff_editor.getOriginalEditor().onDidChangeCursorPosition(callback);
                        this._diff_editor.getModifiedEditor().onDidChangeCursorPosition(callback);
                        break;
                    default:
                        break;
                }
            }
            /**
             * Resize the editor
             *
             * @memberof MonacoEditorModel
             */
            resize() {
                if (this.editor)
                    this.editor.layout();
            }
            /**
             * Focus on the editor
             *
             * @memberof MonacoEditorModel
             */
            focus() {
                if (Array.isArray(this.currfile.cache)) {
                    this.code_container.hide();
                    this.diff_container.show();
                }
                else {
                    this.code_container.show();
                    this.diff_container.hide();
                }
                if (this.editor) {
                    this.editor.layout();
                    this.editor.focus();
                }
            }
            /**
             * Get language mode from path
             *
             * @protected
             * @param {string} path
             * @return {*}  {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            getModeForPath(path) {
                return {};
            }
            /**
             * Get the editor status
             *
             * @return {*}  {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            getEditorStatus() {
                let ed = undefined;
                if (this.editor == this._code_editor) {
                    ed = this.editor;
                }
                else {
                    ed = this.editor.getOriginalEditor();
                    if (this.editor.getModifiedEditor().hasTextFocus()) {
                        ed = this.editor.getModifiedEditor();
                    }
                }
                const pos = ed.getPosition();
                let mode = undefined;
                const model = ed.getModel();
                if (model) {
                    mode = MonacoEditorModel.modes[model.getLanguageId()];
                }
                return {
                    row: pos.lineNumber,
                    column: pos.column,
                    line: model ? model.getLineCount() : 0,
                    langmode: {
                        text: mode ? mode.aliases[0] : "",
                        mode: mode
                    },
                    file: this.currfile.path
                };
            }
            /**
             * Get editor value
             *
             * @return {*}  {string}
             * @memberof MonacoEditorModel
             */
            getValue() {
                if (this.editor == this._code_editor)
                    return this.editor.getValue();
                return this.currfile.cache;
            }
            /**
             * Set editor value
             *
             * @param {string} value
             * @memberof MonacoEditorModel
             */
            setValue(value) {
                if (this.editor == this._code_editor)
                    this.editor.setValue(value);
            }
            getEditor() {
                return this.editor;
            }
        }
        application.MonacoEditorModel = MonacoEditorModel;
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));

var OS;
(function (OS) {
    let GUI;
    (function (GUI) {
        let tag;
        (function (tag) {
            class AntEditExtensionListItem extends tag.ListViewItemTag {
                itemlayout() {
                    return {
                        el: "div",
                        children: [
                            { el: "afx-label", ref: "label" },
                            { el: "p", ref: "desc", id: "ext-list-item-d-p" },
                            {
                                el: "p",
                                id: "ext-list-item-b-p",
                                children: [
                                    {
                                        el: "i",
                                        ref: "intall_status"
                                    },
                                    {
                                        el: "afx-button",
                                        ref: "btn_remove"
                                    },
                                    {
                                        el: "afx-button",
                                        ref: "btn_install"
                                    }
                                ]
                            }
                        ]
                    };
                }
                ondatachange() {
                    const v = this.data;
                    if (!v) {
                        return;
                    }
                    const label = this.refs.label;
                    label.iconclass = "bi bi-puzzle";
                    label.text = `${v.text} - v${v.version}`;
                    // add description
                    const p_desc = this.refs.desc;
                    $(p_desc).text(v.description);
                    // button install
                    const btn_install = this.refs.btn_install;
                    // button remove
                    const btn_remove = this.refs.btn_remove;
                    if (v.installed) {
                        $(btn_remove).show();
                        btn_remove.iconclass = "bi bi-trash-fill";
                        btn_install.iconclass = "bi bi-arrow-repeat";
                        $(this.refs.intall_status).text(__("Installed: v{0} ", v.installed).__());
                    }
                    else {
                        $(btn_remove).hide();
                        btn_install.iconclass = "fa bi-cloud-download-fill";
                        $(this.refs.intall_status).text(" ");
                    }
                }
                init() {
                    this.closable = false;
                    this.data = {};
                    // button install
                    const btn_install = this.refs.btn_install;
                    // button remove
                    const btn_remove = this.refs.btn_remove;
                    btn_install.onbtclick = (e) => {
                        if (!this.data.download || !this.data.install_action) {
                            return;
                        }
                        this.data.install_action(this.data.download, (v) => {
                            this.data.installed = v;
                            this.update(undefined);
                        });
                    };
                    btn_remove.onbtclick = (e) => {
                        if (!this.data.installed || !this.data.uninstall_action) {
                            return;
                        }
                        this.data.uninstall_action(this.data.name, () => {
                            delete this.data.installed;
                            this.update(undefined);
                        });
                    };
                }
                reload(d) {
                    this.data = this.data;
                }
            }
            tag.define("afx-antedit-ext-list-item", AntEditExtensionListItem);
        })(tag = GUI.tag || (GUI.tag = {}));
    })(GUI = OS.GUI || (OS.GUI = {}));
    let application;
    (function (application) {
        const DEFAULT_REPO = "https://raw.githubusercontent.com/lxsang/antos-antedit-extensions/master/extensions.json";
        /**
         * A simple yet powerful code/text editor.
         *
         * Antedit is the default text editor shipped with
         * AntOS base system. It is based on the Monaco editor
         * which power the VS Code IDE.
         *
         * @export
         * @class Antedit
         * @extends {BaseApplication}
         */
        class Antedit extends application.BaseApplication {
            /**
             *Creates an instance of Antedit.
             * @param {AppArgumentsType[]} args application arguments
             * @memberof Antedit
             */
            constructor(args) {
                super("Antedit", args);
                this.currdir = undefined;
                this.diff_buffer = [undefined, undefined];
            }
            /**
             * Main application entry point
             *
             * @returns {void}
             * @memberof Antedit
             */
            main() {
                this.extensions = {};
                this.eum = new EditorModelManager();
                this.fileview = this.find("fileview");
                this.sidebar = this.find("sidebar");
                this.sidebar_container = this.find("sidebar-tab-container");
                this.bottombar = this.find("bottombar");
                this.langstat = this.find("langstat");
                this.editorstat = this.find("editorstat");
                this.filestat = this.find("current-file-lbl");
                this.extension_list_view = this.find("extension-list");
                this.logger = new Logger(this.find("output-tab"));
                this.split_mode = true;
                this.fileview.fetch = (path) => new Promise(async function (resolve, reject) {
                    let dir;
                    if (typeof path === "string") {
                        dir = path.asFileHandle();
                    }
                    else {
                        dir = path;
                    }
                    try {
                        const d = await dir
                            .read();
                        if (d.error) {
                            return reject(d.error);
                        }
                        return resolve(d.result);
                    }
                    catch (e) {
                        return reject(__e(e));
                    }
                });
                let file = "Untitled".asFileHandle();
                if (this.args && this.args.length > 0) {
                    this.addRecent(this.args[0].path);
                    if (this.args[0].type === "dir") {
                        this.currdir = this.args[0].path.asFileHandle();
                    }
                    else {
                        file = this.args[0].path.asFileHandle();
                        this.currdir = file.parent();
                    }
                }
                if (!this.setting.recent)
                    this.setting.recent = [];
                if (!this.setting.extension_repos)
                    this.setting.extension_repos = [DEFAULT_REPO];
                const wrapper = this.find("wrapper");
                $(wrapper).css('visibility', 'hidden');
                monaco.editor.setTheme("vs-dark");
                // add editor instance
                const left_editor = new OS.application.MonacoEditorModel(this, this.find("left-tabbar"), this.find("left-editorarea"));
                const right_editor = new OS.application.MonacoEditorModel(this, this.find("right-tabbar"), this.find("right-editorarea"));
                left_editor.setTabbarCtxMenu(this.tb_ctxmenu, (tab, data) => this.tabbar_ctx_menu_handle(tab, data, left_editor));
                right_editor.setTabbarCtxMenu(this.tb_ctxmenu, (tab, data) => this.tabbar_ctx_menu_handle(tab, data, right_editor));
                this.eum.add(left_editor).add(right_editor);
                this.eum.onstatuschange = (st) => this.updateStatus(st);
                $(wrapper).css('visibility', 'visible');
                this.setup();
                this.eum.active.openFile(file);
            }
            /**
             * Get the context menu items
             */
            get tb_ctxmenu() {
                return [
                    { text: "__(Close)", id: "close" },
                    { text: "__(Close All)", id: "close-all" },
                    { text: "__(Move to other side)", id: "mv-side" },
                ];
            }
            tabbar_ctx_menu_handle(tab, data, model) {
                switch (data.id) {
                    case "close":
                        if (!tab) {
                            return;
                        }
                        model.closeTab(tab);
                        break;
                    case "close-all":
                        model.closeAll();
                        break;
                    case "mv-side":
                        if (!tab) {
                            return;
                        }
                        let other_model = this.eum.editors[0];
                        if (model == other_model) {
                            other_model = this.eum.editors[1];
                        }
                        other_model.openFile(tab.data);
                        model.closeTab(tab);
                        if (this.split_mode == false) {
                            this.toggleSplitMode();
                        }
                        break;
                    default:
                        break;
                }
            }
            /**
             * Set up the text editor
             *
             * @private
             * @returns {void}
             * @memberof Antedit
             */
            setup() {
                this.sidebar_container.selectedIndex = 0;
                this.extension_list_view.itemtag = "afx-antedit-ext-list-item";
                this.fileview.onfileopen = (e) => {
                    if (!e.data || !e.data.path) {
                        return;
                    }
                    this.addRecent(e.data.path);
                    if (e.data.type === "dir") {
                        return;
                    }
                    return this.eum.active.openFile(e.data.path.asFileHandle());
                };
                this.fileview.onfileselect = (e) => {
                    if (!e.data || !e.data.path) {
                        return;
                    }
                    if (e.data.type === "dir") {
                        return;
                    }
                    this.eum.active.selectFile(e.data.path);
                };
                this.on("resize", () => this.eum.resize());
                this.on("focus", () => this.eum.active.focus());
                this.fileview.contextmenuHandle = (e, m) => {
                    let file = this
                        .fileview.selectedFile;
                    const items = [
                        { text: "__(New file)", id: "new" },
                        { text: "__(New folder)", id: "newdir" },
                        { text: "__(Rename)", id: "rename" },
                        { text: "__(Delete)", id: "delete" },
                        { text: "__(Upload)", id: "upload" },
                    ];
                    if (file && file.type === "file") {
                        items.push({ text: "__(Select for compare)", id: "diff-org" });
                        items.push({ text: "__(Compare with selected)", id: "diff-mod" });
                    }
                    m.items = items;
                    m.onmenuselect = (e) => {
                        return this.ctxFileMenuHandle(e);
                    };
                    return m.show(e);
                };
                this.bindKey("ALT-N", () => this.menuAction("new"));
                this.bindKey("ALT-O", () => this.menuAction("open"));
                this.bindKey("ALT-F", () => this.menuAction("opendir"));
                this.bindKey("CTRL-S", () => this.menuAction("save"));
                this.bindKey("ALT-W", () => this.menuAction("saveas"));
                this.fileview.ondragndrop = (e) => {
                    if (!e.data.from || !e.data.to) {
                        return;
                    }
                    const src = e.data.from[0].data.path.asFileHandle();
                    const des = e.data.to.data.path;
                    return src
                        .move(`${des}/${src.basename}`)
                        .then(function (d) {
                        const p1 = des;
                        const p2 = src.parent().path;
                        if (p1.length < p2.length) {
                            e.data.to.update(p1);
                            e.data
                                .from[0].parent.update(p2);
                        }
                        else {
                            e.data
                                .from[0].parent.update(p2);
                            e.data.to.update(p1);
                        }
                    })
                        .catch((e) => this.error(__("Unable to move file/folder"), e));
                };
                this.on("filechange", (data) => {
                    let { path } = data.file;
                    if (data.type === "file") {
                        ({ path } = data.file.parent());
                    }
                    return this.fileview.update(path);
                });
                this.find("logger-clear").onbtclick = () => {
                    this.logger.clear();
                };
                if (this.setting.showBottomBar === undefined) {
                    this.setting.showBottomBar = false;
                }
                const extension = {
                    name: "Editor",
                    text: __("Editor")
                };
                const action = {
                    name: "langmode",
                    text: __("Change language mode"),
                    shortcut: 'CTRL-K'
                };
                this.eum.addAction(extension, action, async (e) => {
                    try {
                        const data = await this.openDialog("SelectionDialog", {
                            "title": __("Select language"),
                            data: this.eum.active.getModes()
                        });
                        this.eum.active.setMode(data);
                    }
                    catch (e) {
                        console.log(e);
                    }
                });
                $(this.find("txt_ext_search")).keyup((e) => this.extension_search(e));
                this.loadExtensionMetaData();
                this.toggleSideBar();
                this.toggleSplitMode();
                this.applyAllSetting();
            }
            /**
             * Search an extension from the extension list
             *
             * @private
             * @meberof Antedit
             */
            extension_search(e) {
                let k;
                const search_box = this.find("txt_ext_search");
                switch (e.which) {
                    case 37:
                        return e.preventDefault();
                    case 38:
                        this.extension_list_view.selectPrev();
                        return e.preventDefault();
                    case 39:
                        return e.preventDefault();
                    case 40:
                        this.extension_list_view.selectNext();
                        return e.preventDefault();
                    case 13:
                        return e.preventDefault();
                    default:
                        var text = search_box.value;
                        var result = [];
                        if (text.length === 2) {
                            this.extension_list_view.data = this.extension_meta_data;
                            return;
                        }
                        if (text.length < 3) {
                            return;
                        }
                        var term = new RegExp(text, "i");
                        for (k in this.extension_meta_data) {
                            if (this.extension_meta_data[k].text.match(term)) {
                                result.push(this.extension_meta_data[k]);
                            }
                        }
                        this.extension_list_view.data = result;
                }
            }
            /**
             * Refresh editor extensions list on the side bar
             *
             * @private
             * @memberof Antedit
             */
            refreshExtensionRepositories() {
                const promises = [];
                const meta_file = `${this.meta().path}/extensions/extensions.json`;
                for (let url of [meta_file].concat(this.setting.extension_repos)) {
                    promises.push(url.asFileHandle().read('json'));
                }
                Promise.all(promises)
                    .then((results) => {
                    const meta = {};
                    for (let el of results.shift()) {
                        meta[el.name] = el;
                    }
                    this.extension_meta_data = [];
                    for (let result of results) {
                        for (let ext of result) {
                            if (meta[ext.name]) {
                                ext.installed = meta[ext.name].version;
                            }
                            ext.install_action = (url, callback) => {
                                (new Antedit.extensions["EditorExtensionMaker"](this))
                                    .installZip(url)
                                    .then(() => {
                                    this.loadExtensionMetaData();
                                    if (callback) {
                                        callback(ext.version);
                                    }
                                    this.notify(__("Extension '{0}' installed", ext.text));
                                })
                                    .catch((error) => {
                                    this.error(__("Unable to install '{0}': {1}", ext.text, error.toString()), error);
                                });
                            };
                            ext.uninstall_action = (name, callback) => {
                                (new Antedit.extensions["EditorExtensionMaker"](this))
                                    .uninstall(name)
                                    .then(() => {
                                    this.loadExtensionMetaData();
                                    if (callback) {
                                        callback();
                                    }
                                    this.notify(__("Extension '{0}' uninstalled", name));
                                })
                                    .catch((error) => {
                                    this.error(__("Unable to uninstall '{0}': {1}", name, error.toString()), error);
                                });
                            };
                            this.extension_meta_data.push(ext);
                        }
                    }
                    this.extension_list_view.data = this.extension_meta_data;
                })
                    .catch((error) => {
                    this.error(__("Unable to read extension from repositories: {0}", error.toString()), error);
                });
            }
            /**
             * Update the editor status bar
             *
             * @private
             * @memberof Antedit
             */
            updateStatus(stat = undefined) {
                if (!stat)
                    stat = this.eum.active.getEditorStatus();
                this.editorstat.text = __("Row {0}, col {1}, lines: {2}", stat.row, stat.column, stat.line);
                if (stat.langmode)
                    this.langstat.text = stat.langmode.text;
                this.filestat.text = stat.file;
                let win = this.scheme;
                if (win.apptitle != stat.file)
                    win.apptitle = stat.file;
            }
            /**
             * Show or hide the SideBar
             *
             * @memberof Antedit
             */
            toggleSideBar() {
                if (this.currdir) {
                    $(this.sidebar).show();
                    this.fileview.path = this.currdir.path;
                    this.refreshExtensionRepositories();
                }
                else {
                    $(this.sidebar).hide();
                }
                this.trigger("resize");
            }
            showOutput(toggle = false) {
                if (toggle)
                    this.showBottomBar(true);
                this.bottombar.selectedIndex = 0;
            }
            openDiff(files) {
                const diff_file = new OS.API.VFS.DiffEditorFileHandle(files);
                this.eum.active.openFile(diff_file);
            }
            /**
             * Apply [[showBottomBar]] from user setting value
             *
             * @protected
             * @param {string} k
             * @memberof Antedit
             */
            applySetting(k) {
                if (k == "showBottomBar") {
                    this.showBottomBar(this.setting.showBottomBar);
                }
            }
            /**
             * Show or hide the bottom bar and
             * save the value to user setting
             *
             * @param {boolean} v
             * @memberof Antedit
             */
            showBottomBar(v) {
                this.setting.showBottomBar = v;
                if (v) {
                    $(this.bottombar).show();
                }
                else {
                    $(this.bottombar).hide();
                }
                this.trigger("resize");
            }
            /**
             * toggle the bottom bar
             *
             * @memberof Antedit
             */
            toggleBottomBar() {
                this.showBottomBar(!this.setting.showBottomBar);
            }
            /**
             * Toogle split mode
             *
             * #memberof Antedit
            **/
            toggleSplitMode() {
                const right_pannel = this.find("right-panel");
                const right_editor = this.eum.editors[1];
                const left_editor = this.eum.editors[0];
                if (this.split_mode) {
                    // before hide check if there is dirty files
                    if (right_editor.isDirty()) {
                        this.notify(__("Unable to disable split view: Please save changes of modified files on the right panel"));
                        return;
                    }
                    right_editor.closeAll();
                    $(right_pannel).hide();
                    this.split_mode = false;
                    left_editor.focus();
                }
                else {
                    $(right_pannel).show();
                    this.split_mode = true;
                    right_editor.openFile("Untitled".asFileHandle());
                    right_editor.focus();
                }
                this.trigger("resize");
            }
            /**
             * File menu definition
             *
             * @private
             * @returns {GUI.BasicItemType}
             * @memberof Antedit
             */
            fileMenu() {
                const recent = this.setting.recent.map((i) => {
                    return { text: i };
                });
                return {
                    text: __("File"),
                    nodes: [
                        { text: __("New"), dataid: "new", shortcut: "A-N" },
                        {
                            text: __("Open Recent"),
                            dataid: "recent",
                            nodes: recent,
                            onchildselect: (e, r) => {
                                const handle = e.data.item.data.text.asFileHandle();
                                handle.onready().then((meta) => {
                                    if (!meta) {
                                        return;
                                    }
                                    if (meta.type == "dir") {
                                        this.currdir = handle;
                                        this.toggleSideBar();
                                    }
                                    else {
                                        this.eum.active.openFile(handle);
                                    }
                                });
                            }
                        },
                        { text: __("Open"), dataid: "open", shortcut: "A-O" },
                        {
                            text: __("Open Folder"),
                            dataid: "opendir",
                            shortcut: "A-F",
                        },
                        { text: __("Save"), dataid: "save", shortcut: "C-S" },
                        {
                            text: __("Save as"),
                            dataid: "saveas",
                            shortcut: "A-W",
                        },
                    ],
                    onchildselect: (e, r) => {
                        return this.menuAction(e.data.item.data.dataid, r);
                    },
                };
            }
            /**
             * Context menu definition
             *
             * @private
             * @param {GUI.TagEventType} e
             * @returns {void}
             * @memberof Antedit
             */
            ctxFileMenuHandle(e) {
                const el = e.data.item;
                if (!el) {
                    return;
                }
                const data = el.data;
                if (!data) {
                    return;
                }
                let file = this
                    .fileview.selectedFile;
                let dir = this.currdir;
                if (file && file.type === "dir") {
                    dir = file.path.asFileHandle();
                }
                if (file && file.type === "file") {
                    dir = file.path.asFileHandle().parent();
                }
                switch (data.id) {
                    case "new":
                        if (!dir) {
                            return;
                        }
                        this.openDialog("PromptDialog", {
                            title: "__(New file)",
                            label: "__(File name)",
                        }).then(async (d) => {
                            const fp = `${dir.path}/${d}`.asFileHandle();
                            try {
                                const r = await fp.write("text/plain");
                                return this.fileview.update(dir.path);
                            }
                            catch (e) {
                                return this.error(__("Fail to create: {0}", e.stack), __e(e));
                            }
                        });
                        break;
                    case "newdir":
                        if (!dir) {
                            return;
                        }
                        this.openDialog("PromptDialog", {
                            title: "__(New folder)",
                            label: "__(Folder name)",
                        }).then(async (d) => {
                            try {
                                const r = await dir.mk(d);
                                return this.fileview.update(dir.path);
                            }
                            catch (e) {
                                return this.error(__("Fail to create: {0}", dir.path), __e(e));
                            }
                        });
                        break;
                    case "rename":
                        if (!file) {
                            return;
                        }
                        this.openDialog("PromptDialog", {
                            title: "__(Rename)",
                            label: "__(File name)",
                            value: file.filename,
                        }).then(async (d) => {
                            if (d === file.filename) {
                                return;
                            }
                            file = file.path.asFileHandle();
                            dir = file.parent();
                            try {
                                const r = await file.move(`${dir.path}/${d}`);
                                return this.fileview.update(dir.path);
                            }
                            catch (e) {
                                return this.error(__("Fail to rename: {0}", file.path), __e(e));
                            }
                        });
                        break;
                    case "delete":
                        if (!file) {
                            return;
                        }
                        this.openDialog("YesNoDialog", {
                            title: "__(Delete)",
                            iconclass: "fa fa-question-circle",
                            text: __("Do you really want to delete: {0}?", file.filename),
                        }).then(async (d) => {
                            if (!d) {
                                return;
                            }
                            file = file.path.asFileHandle();
                            dir = file.parent();
                            try {
                                const r = await file.remove();
                                return this.fileview.update(dir.path);
                            }
                            catch (e) {
                                return this.error(__("Fail to delete: {0}", file.path), __e(e));
                            }
                        });
                        break;
                    case "upload":
                        if (!dir) {
                            return;
                        }
                        dir.upload()
                            .then((d) => {
                            this.notify(__("File uploaded to: {0}", dir.path));
                            return this.fileview.update(dir.path);
                        })
                            .catch((e) => this.error(__("Unable to upload file: {e}", e.toString()), __e(e)));
                        break;
                    case "diff-org":
                        if (!file)
                            return;
                        this.diff_buffer[0] = file.path.asFileHandle();
                        break;
                    case "diff-mod":
                        if (!file)
                            return;
                        if (!this.diff_buffer[0])
                            return;
                        this.diff_buffer[1] = file.path.asFileHandle();
                        this.openDiff(this.diff_buffer);
                        break;
                    default:
                }
            }
            /**
             * Add a file to recent files setting
             *
             * @private
             * @param {string} file
             * @memberof Antedit
             */
            addRecent(file) {
                if (!this.setting.recent)
                    this.setting.recent = [];
                if (this.setting.recent.includes(file)) {
                    return;
                }
                this.setting.recent.unshift(file);
                if (this.setting.recent.length > 10)
                    this.setting.recent = this.setting.recent.slice(0, 10);
            }
            /**
             * Menu action definition
             *
             * @private
             * @param {string} dataid
             * @param {Antedit} [r]
             * @returns {void}
             * @memberof Antedit
             */
            menuAction(dataid, r) {
                let me = this;
                if (r) {
                    me = r;
                }
                switch (dataid) {
                    case "new":
                        return me.eum.active.openFile("Untitled".asFileHandle());
                    case "open":
                        return me
                            .openDialog("FileDialog", {
                            title: __("Open file"),
                            mimes: Array.from(me.meta().mimes).filter((v) => v !== "dir"),
                        })
                            .then((f) => {
                            this.addRecent(f.file.path);
                            me.eum.active.openFile(f.file.path.asFileHandle());
                        });
                    case "opendir":
                        return me
                            .openDialog("FileDialog", {
                            title: __("Open folder"),
                            mimes: ["dir"],
                        })
                            .then(function (f) {
                            me.addRecent(f.file.path);
                            me.currdir = f.file.path.asFileHandle();
                            return me.toggleSideBar();
                        });
                    case "save":
                        return me.eum.active.save();
                    case "saveas":
                        return me.eum.active.saveAs();
                    default:
                        return console.log(dataid);
                }
            }
            /**
             * Cleanup the editor before exiting.
             *
             * @param {BaseEvent} evt
             * @returns {void}
             * @memberof Antedit
             */
            cleanup(evt) {
                let v;
                const dirties = this.eum.dirties();
                if (dirties.length === 0) {
                    // cleanup all extension
                    for (let k in this.extensions) {
                        if (this.extensions[k] && this.extensions[k].cleanup) {
                            this.extensions[k].cleanup();
                        }
                    }
                    return;
                }
                evt.preventDefault();
                this.openDialog("YesNoDialog", {
                    title: "__(Quit)",
                    text: __("Ignore all unsaved files: {0} ?", (() => {
                        const result1 = [];
                        for (v of Array.from(dirties)) {
                            result1.push(v.filename);
                        }
                        return result1;
                    })().join(", ")),
                }).then((d) => {
                    if (d) {
                        for (v of Array.from(dirties)) {
                            v.dirty = false;
                        }
                        return this.quit(false);
                    }
                });
            }
            /**
             * Application menu definition
             *
             * @returns {GUI.BasicItemType[]}
             * @memberof Antedit
             */
            menu() {
                return [
                    this.fileMenu(),
                    {
                        text: "__(View)",
                        nodes: [
                            {
                                text: "__(Toggle bottom bar)",
                                dataid: "bottombar"
                            },
                            {
                                text: "__(Toggle split view)",
                                dataid: "splitview"
                            }
                        ],
                        onchildselect: (e, r) => {
                            switch (e.data.item.data.dataid) {
                                case "bottombar":
                                    return this.toggleBottomBar();
                                case "splitview":
                                    return this.toggleSplitMode();
                                    break;
                                default:
                                    break;
                            }
                            r;
                        },
                    },
                ];
            }
            /**
             * Load the extension meta data from `extension.json` file
             *
             * @memberof AntEdit
             */
            loadExtensionMetaData() {
                this.loadExtensionMetaFromFile(`${this.meta().path}/extensions/extensions.json`)
                    .catch((e) => {
                    return this.error(__("Cannot load extension meta data"), e);
                });
            }
            /**
             * Load extension meta-data from specific file
             *
             * @private
             * @param {string} path
             * @return {*}  {Promise<void>}
             * @memberof AntEdit
             */
            loadExtensionMetaFromFile(path) {
                return new Promise((resolve, reject) => {
                    path
                        .asFileHandle()
                        .read("json")
                        .then((d) => {
                        for (let extension of d) {
                            for (let act of extension.actions) {
                                this.eum.addAction(extension, act, (e_name, a_name) => {
                                    this.loadAndRunExtensionAction(e_name, a_name, extension.root);
                                });
                            }
                        }
                        resolve();
                    })
                        .catch((e) => {
                        reject(__e(e));
                    });
                });
            }
            /**
             * Load extension then run an action
             *
             * @param name extension name
             * @param action action name
             * @memberof AntEdit
             */
            loadAndRunExtensionAction(name, action, root) {
                //verify if the extension is load
                if (!Antedit.extensions[name]) {
                    //load the extension
                    let path = `${this.meta().path}/extensions/${name}/main.js`;
                    if (root)
                        path = `${root}/main.js`;
                    this._api
                        .requires(path, true)
                        .then(() => this.runExtensionAction(name, action))
                        .catch((e) => {
                        return this.error(__("unable to load extension: {0}", name), e);
                    });
                }
                else {
                    this.runExtensionAction(name, action);
                }
            }
            /**
             * Run an extension action from the command palette
             *
             * @private
             * @param {string} name extension name
             * @param {string} action action name
             * @returns {void}
             * @memberof AntEdit
             */
            runExtensionAction(name, action) {
                if (!this.extensions[name]) {
                    if (!Antedit.extensions[name]) {
                        return this.error(__("Unable to find extension: {0}", name));
                    }
                    this.extensions[name] = new Antedit.extensions[name](this);
                }
                if (!this.extensions[name][action]) {
                    return this.error(__("Unable to find action: {0}", action));
                }
                this.extensions[name].preload()
                    .then(() => this.extensions[name][action]())
                    .catch((e) => {
                    return this.error(__("Unable to preload extension"), e);
                });
            }
        }
        application.Antedit = Antedit;
        /**
         * Helper class to manager several instances
         * of editor models
         *
         * @class EditorModelManager
         */
        class EditorModelManager {
            /**
             * Creates an instance of EditorModelManager.
             * @memberof EditorModelManager
             */
            constructor() {
                this.active_editor = undefined;
                this.models = [];
            }
            get editors() {
                return this.models;
            }
            set contextmenuHandle(cb) {
                for (let ed of this.models) {
                    ed.contextmenuHandle = cb;
                }
            }
            /**
             * Get the active editor model
             *
             * @readonly
             * @type {BaseEditorModel}
             * @memberof EditorModelManager
             */
            get active() {
                return this.active_editor;
            }
            /**
             * Add a model to the manager
             *
             * @param {BaseEditorModel} model
             * @memberof EditorModelManager
             */
            add(model) {
                this.models.push(model);
                if (!this.active_editor)
                    this.active_editor = model;
                model.on("focus", () => {
                    this.active_editor = model;
                });
                return this;
            }
            /**
             * Add an action to the editor
             *
             * @param {GenericObject<any>} extension
             * @param {GenericObject<any>} action
             * @param callback
             * @memberof EditorModelManager
             */
            addAction(extension, action, callback) {
                const ed_action = {
                    id: `${extension.name}:${action.name}`,
                    label: `${extension.text.__()}: ${action.text.__()}`,
                    keybindings: [],
                    precondition: null,
                    keybindingContext: null,
                    contextMenuGroupId: extension.name,
                    //contextMenuOrder: 1.5,
                    run: () => callback(extension.name, action.name)
                };
                if (action.shortcut) {
                    const keys = action.shortcut.split("-");
                    let binding = 0;
                    for (const key of keys) {
                        switch (key) {
                            case "CTRL":
                                binding = binding | monaco.KeyMod.CtrlCmd;
                                break;
                            case "ALT":
                                binding = binding | monaco.KeyMod.Alt;
                                break;
                            case "SHIFT":
                                binding = binding | monaco.KeyMod.Shift;
                                break;
                            case "SUPPER":
                                binding = binding | monaco.KeyMod.WinCtrl;
                                break;
                            default:
                                const k = `Key${key}`;
                                if (monaco.KeyCode[k]) {
                                    binding = binding | monaco.KeyCode[k];
                                }
                                else {
                                    binding = 0;
                                }
                        }
                    }
                    if (binding != 0)
                        ed_action.keybindings.push(binding);
                }
                for (let ed of this.models) {
                    const editor = ed.getEditor();
                    if (!editor.getAction(ed_action.id))
                        editor.addAction(ed_action);
                }
            }
            set onstatuschange(cb) {
                for (let ed of this.models) {
                    ed.onstatuschange = cb;
                }
            }
            dirties() {
                let list = [];
                for (let ed of this.models) {
                    list = list.concat(ed.dirties());
                }
                return list;
            }
            /**
             * Resize all editor
             *
             * @memberof EditorModelManager
             */
            resize() {
                for (let ed of this.models) {
                    ed.resize();
                }
            }
        }
        /**
         * This class handles log output to the Editor output container
         *
         * @class Logger
         */
        class Logger {
            /**
             * Creates an instance of Logger.
             * @param {HTMLElement} el target container
             * @memberof Logger
             */
            constructor(el) {
                this.target = el;
            }
            /**
             * Log level info
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            info(s) {
                this.log("info", s, true);
            }
            /**
             * Log level warning
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            warn(s) {
                this.log("warn", s, true);
            }
            /**
             * Log level error
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            error(s) {
                this.log("error", s, true);
            }
            /**
             * Log a string to target container
             *
             * @private
             * @param {string} c class name of the appended log element
             * @param {string|FormattedString} s log string
             * @param {boolean} showtime define whether the logger should insert datetime prefix
             * in the log string
             * @memberof Logger
             */
            log(c, s, showtime) {
                let el = $("<pre></pre>")
                    .attr("class", `code-pad-log-${c}`);
                if (showtime) {
                    let date = new Date();
                    let prefix = date.getDate() + "/"
                        + (date.getMonth() + 1) + "/"
                        + date.getFullYear() + " "
                        + date.getHours() + ":"
                        + date.getMinutes() + ":"
                        + date.getSeconds();
                    el.text(`[${prefix}]: ${s.__()}`);
                }
                else {
                    el.text(s.__());
                }
                $(this.target).append(el);
                $(this.target).scrollTop($(this.target)[0].scrollHeight);
            }
            /**
             * Print a log message without prefix
             *
             * @param {string|FormattedString} s text to print
             * @memberof Logger
             */
            print(s) {
                if (s.match(/warn/i)) {
                    this.log("warn", s, false);
                }
                else if (s.match(/error/i)) {
                    this.log("error", s, false);
                }
                else {
                    this.log("info", s, false);
                }
            }
            /**
             * Empty the log container
             *
             * @memberof Logger
             */
            clear() {
                $(this.target).empty();
            }
        }
        Antedit.Logger = Logger;
        Antedit.dependencies = [
            "pkg://MonacoCore/path.js",
            "pkg://MonacoCore/bundle/app.bundle.js"
        ];
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));

var OS;
(function (OS) {
    /**
     *
     *
     * @class EditorBaseExtension
     */
    class EditorBaseExtension {
        constructor(name, app) {
            this.app = app;
            this.name = name;
        }
        /**
         *
         *
         * @returns {Promise<any>}
         * @memberof EditorBaseExtension
         */
        preload() {
            return OS.API.require(OS.application.Antedit.extensions[this.name].dependencies);
        }
        /**
         *
         *
         * @protected
         * @returns {string}
         * @memberof EditorBaseExtension
         */
        basedir() {
            return `${this.app.meta().path}/extensions/${this.name}`;
        }
        /**
         *
         *
         * @protected
         * @param {(string | FormattedString)} m
         * @returns {void}
         * @memberof EditorBaseExtension
         */
        notify(m) {
            return this.app.notify(m);
        }
        /**
         *
         *
         * @protected
         * @param {(string | FormattedString)} m
         * @param {Error} e
         * @returns {void}
         * @memberof EditorBaseExtension
         */
        error(m, e) {
            return this.app.error(m, e);
        }
        /**
         *
         *
         * @protected
         * @return {AnteditLogger} editor logger
         * @memberof EditorBaseExtension
         */
        logger() {
            if (!this.app.setting.showBottomBar) {
                this.app.showOutput(true);
            }
            else {
                this.app.showOutput(false);
            }
            return this.app.logger;
        }
        /**
         *
         *
         * @protected
         * @param {string} file
         * @returns {Promise<GenericObject<any>>}
         * @memberof EditorBaseExtension
         */
        metadata(file) {
            return new Promise((resolve, reject) => {
                if (!this.app.currdir) {
                    return reject(OS.API.throwe(__("Current folder is not found")));
                }
                `${this.app.currdir.path}/${file}`
                    .asFileHandle()
                    .read("json")
                    .then((data) => {
                    if (!data.root && this.app.currdir) {
                        data.root = this.app.currdir.path;
                    }
                    resolve(data);
                })
                    .catch((e) => {
                    // try to ask user to select a folder
                    this.app.openDialog("FileDialog", {
                        title: __("Select build directory"),
                        root: this.app.currdir.path,
                        mimes: ["dir"]
                    })
                        .then((d) => {
                        `${d.file.path}/${file}`
                            .asFileHandle()
                            .read("json")
                            .then((data) => {
                            if (!data.root) {
                                data.root = d.file.path;
                            }
                            resolve(data);
                        })
                            .catch((e1) => reject(e1));
                    })
                        .catch((e1) => reject(OS.API.throwe(__("Unable to read meta-data"))));
                });
            });
        }
    }
    EditorBaseExtension.dependencies = [];
    OS.application.Antedit.extensions = {};
    OS.application.Antedit.EditorBaseExtension = EditorBaseExtension;
    class EditorExtensionMaker extends EditorBaseExtension {
        constructor(app) {
            super("EditorExtensionMaker", app);
        }
        create() {
            this.logger().clear();
            this.app
                .openDialog("FileDialog", {
                title: "__(New extension at)",
                file: { basename: __("ExtensionName") },
                mimes: ["dir"],
            })
                .then((d) => {
                return this.mktpl(d.file.path, d.name);
            });
        }
        build(callback) {
            this.logger().clear();
            this.metadata("extension.json")
                .then(async (meta) => {
                try {
                    const jsrc = await OS.API.VFS.cat(meta.javascripts.map(v => `${meta.root}/${v}`), "");
                    await `${meta.root}/build/debug/main.js`
                        .asFileHandle()
                        .setCache(jsrc)
                        .write("text/plain");
                    await `${meta.root}/build/debug/extension.json`
                        .asFileHandle()
                        .setCache(meta.meta)
                        .write("object");
                    await OS.API.VFS.copy(meta.copies.map(v => `${meta.root}/${v}`), `${meta.root}/build/debug`);
                    this.logger().info(__("Files generated in {0}", `${meta.root}/build/debug`));
                    if (callback)
                        callback();
                }
                catch (e) {
                    return this.logger().error(__("Unable to build extension:{0}", e.stack));
                }
            })
                .catch((e) => this.logger().error(__("Unable to read meta-data:{0}", e.stack)));
        }
        run() {
            this.logger().clear();
            this.metadata("extension.json")
                .then(async (meta) => {
                if (!meta || !meta.meta || !meta.meta.name)
                    return this.logger().error(__("Invalid extension meta-data"));
                try {
                    const path = `${meta.root}/build/debug/main.js`;
                    if (OS.API.shared[path]) {
                        delete OS.API.shared[path];
                    }
                    await OS.API.requires(path);
                    if (this.app.extensions[meta.meta.name] && this.app.extensions[meta.meta.name].cleanup) {
                        this.app.extensions[meta.meta.name].cleanup();
                    }
                    this.app.extensions[meta.meta.name] = new OS.application.Antedit.extensions[meta.meta.name](this.app);
                    for (let v of meta.meta.actions) {
                        this.app.eum.addAction(meta.meta, v, (e_name, a_name) => {
                            this.app.loadAndRunExtensionAction(e_name, a_name, `${meta.root}/build`);
                        });
                    }
                    this.app.eum.active.getEditor().trigger(meta.meta.name, 'editor.action.quickCommand');
                }
                catch (e) {
                    return this.logger().error(__("Unable to run extension:{0}", e.stack));
                }
            })
                .catch((e) => this.logger().error(__("Unable to read meta-data:{0}", e.stack)));
        }
        release() {
            this.logger().clear();
            this.metadata("extension.json")
                .then(async (meta) => {
                this.build(async () => {
                    try {
                        await OS.API.VFS.mkar(`${meta.root}/build/debug`, `${meta.root}/build/release/${meta.meta.name}.zip`);
                        this.logger().info(__("Archive created at {0}", `${meta.root}/build/release/${meta.meta.name}.zip`));
                    }
                    catch (e) {
                        return this.logger().error(__("Unable to create archive: {0}", e.stack));
                    }
                });
            })
                .catch((e) => this.logger().error(__("Unable to read meta-data: {0}", e.stack)));
        }
        install() {
            this.logger().clear();
            this.app
                .openDialog("FileDialog", {
                title: "__(Select extension archive)",
                mimes: [".*/zip"],
            })
                .then(async (d) => {
                try {
                    await this.installZip(d.file.path);
                    this.logger().info(__("Extension installed"));
                    return this.app.loadExtensionMetaData();
                }
                catch (e) {
                    return this.logger().error(__("Unable to install extension: {0}", e.stack));
                }
            });
        }
        installFromURL() {
            this.logger().clear();
            this.app
                .openDialog("PromptDialog", {
                title: __("Enter URI"),
                label: __("Please enter extension URI:")
            })
                .then(async (v) => {
                if (!v)
                    return;
                try {
                    await this.installZip(v);
                    this.logger().info(__("Extension installed"));
                    return this.app.loadExtensionMetaData();
                }
                catch (e) {
                    return this.app.error(__("Unable to install extension: {0}", v));
                }
            });
        }
        /**
         *
         *
         * @private
         * @param {string} path
         * @param {string} name
         * @memberof EditorExtensionMaker
         */
        mktpl(path, name) {
            const rpath = `${path}/${name}`;
            const dirs = [
                rpath,
                `${rpath}/build`,
                `${rpath}/build/release`,
                `${rpath}/build/debug`,
            ];
            const files = [
                ["main.tpl", `${rpath}/${name}.js`],
                ["meta.tpl", `${rpath}/extension.json`],
            ];
            OS.API.VFS.mkdirAll(dirs, true)
                .then(async () => {
                try {
                    await OS.API.VFS.mktpl(files, this.basedir(), (data) => {
                        return data.format(name, `${path}/${name}`);
                    });
                    this.app.currdir = rpath.asFileHandle();
                    this.app.toggleSideBar();
                    return this.app.eum.active.openFile(`${rpath}/${name}.js`.asFileHandle());
                }
                catch (e) {
                    return this.logger().error(__("Unable to create extension template: {0}", e.stack));
                }
            })
                .catch((e) => this.logger().error(__("Unable to create extension directories: {0}", e.stack)));
        }
        /**
         *
         *
         * @param {string} name extension name
         * @returns {Promise<any>}
         * @memberof EditorExtensionMaker
         */
        uninstall(name) {
            return new Promise(async (resolve, reject) => {
                try {
                    const ext_path = `${this.app.meta().path}/extensions`;
                    const fp = `${ext_path}/extensions.json`.asFileHandle();
                    const meta = await fp.read("json");
                    let ext_meta = undefined;
                    let ext_index = undefined;
                    for (let idx in meta) {
                        if (meta[idx].name === name) {
                            ext_meta = meta[idx];
                            ext_index = idx;
                            break;
                        }
                    }
                    if (ext_meta === undefined) {
                        return resolve();
                    }
                    // remove the directory
                    await `${ext_path}/${name}`.asFileHandle().remove();
                    // update the extension file
                    meta.splice(ext_index, 1);
                    fp.cache = meta;
                    await fp.write('object');
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        /**
         *
         *
         * @param {string} path
         * @returns {Promise<any>}
         * @memberof EditorExtensionMaker
         */
        installZip(path) {
            return new Promise(async (resolve, reject) => {
                try {
                    await OS.API.requires("os://scripts/jszip.min.js");
                    const data = await path.asFileHandle().read("binary");
                    const zip = await JSZip.loadAsync(data);
                    const d = await zip.file("extension.json").async("uint8array");
                    const meta = JSON.parse(new TextDecoder("utf-8").decode(d));
                    // uninstall if exists
                    await this.uninstall(meta.name);
                    const pth = this.ext_dir(meta.name);
                    const dir = [pth];
                    const files = [];
                    for (let name in zip.files) {
                        const file = zip.files[name];
                        if (file.dir) {
                            dir.push(pth + "/" + name);
                        }
                        else if (name != "extension.json") {
                            files.push(name);
                        }
                    }
                    if (dir.length > 0) {
                        await OS.API.VFS.mkdirAll(dir, true);
                        await this.installFiles(files, zip, meta);
                    }
                    else {
                        await this.installFiles(files, zip, meta);
                    }
                    resolve();
                }
                catch (e) {
                    reject(__e(e));
                }
            });
        }
        ext_dir(en) {
            return `${this.app.meta().path}/extensions/${en}`;
        }
        /**
         *
         *
         * @private
         * @param {string[]} files
         * @param {*} zip
         * @param {GenericObject<any>} meta
         * @returns {Promise<any>}
         * @memberof EditorExtensionMaker
         */
        installFiles(files, zip, meta) {
            if (files.length === 0) {
                return this.installMeta(meta);
            }
            return new Promise(async (resolve, reject) => {
                try {
                    const file = files.splice(0, 1)[0];
                    const path = `${this.ext_dir(meta.name)}/${file}`;
                    const d = await zip.file(file).async("uint8array");
                    const r = await path.asFileHandle()
                        .setCache(new Blob([d], { type: "octet/stream" }))
                        .write("text/plain");
                    if (r.error) {
                        return reject(r.error);
                    }
                    await this.installFiles(files, zip, meta);
                    resolve();
                }
                catch (e) {
                    reject(__e(e));
                }
            });
        }
        /**
         *
         *
         * @private
         * @param {GenericObject<any>} meta
         * @returns {Promise<void>}
         * @memberof EditorExtensionMaker
         */
        installMeta(meta) {
            return new Promise(async (resolve, reject) => {
                const file = `${this.ext_dir("")}/extensions.json`.asFileHandle();
                try {
                    const data = await file.read("json");
                    const names = [];
                    for (let v of data) {
                        names.push(v.name);
                    }
                    const idx = names.indexOf(meta.name);
                    if (idx >= 0) {
                        data.splice(idx, 1);
                    }
                    data.push(meta);
                    try {
                        await file.setCache(data).write("object");
                        return resolve();
                    }
                    catch (e) {
                        return reject(__e(e));
                    }
                }
                catch (e_1) {
                    // try to create new file
                    try {
                        await file.setCache([meta]).write("object");
                        return resolve();
                    }
                    catch (e_2) {
                        return reject(__e(e_2));
                    }
                }
            });
        }
    }
    OS.application.Antedit.extensions.EditorExtensionMaker = EditorExtensionMaker;
})(OS || (OS = {}));
