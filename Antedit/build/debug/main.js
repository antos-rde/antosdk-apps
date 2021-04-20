
var OS;
(function (OS) {
    let application;
    (function (application) {
        class BaseEditorModel {
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
                this.editormux = false;
                this.onstatuschange = undefined;
                this.on("focus", () => {
                    if (this.onstatuschange)
                        this.onstatuschange(this.getEditorStatus());
                });
                this.on("input", () => {
                    if (this.editormux) {
                        this.editormux = false;
                        return false;
                    }
                    if (!this.currfile.dirty) {
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
             * @private
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
                this.editormux = true;
                this.setTextModel(file.textModel);
                if (this.onstatuschange)
                    this.onstatuschange(this.getEditorStatus());
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
            write(file) {
                this.currfile.cache = this.getValue();
                file.write("text/plain")
                    .then((d) => {
                    file.dirty = false;
                    file.text = file.basename;
                    this.tabbar.update(undefined);
                })
                    .catch((e) => this.app.error(__("Unable to save file: {0}", file.path), e));
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
                    return this.write(this.currfile);
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
                    this.write(this.currfile);
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
        }
        application.BaseEditorModel = BaseEditorModel;
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));

var OS;
(function (OS) {
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
                this.setValue("");
                // TODO create new textmodel
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
                if (file.path.toString() === "Untitled") {
                    return {
                        model: monaco.editor.createModel(file.cache, "textplain")
                    };
                }
                const uri = monaco.Uri.parse(file.path);
                const model = monaco.editor.getModel(uri);
                if (model) {
                    return { model: model };
                }
                return {
                    model: monaco.editor.createModel(file.cache, undefined, uri)
                };
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
                return monaco.languages.getLanguages();
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
            }
            /**
             * Setup the editor
             *
             * @protected
             * @param {HTMLElement} el editor container DOM
             * @memberof MonacoEditorModel
             */
            editorSetup(el) {
                this.editor = monaco.editor.create(el, {
                    value: "",
                    language: 'textplain'
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
                        this.editor.onDidChangeModelContent(callback);
                        break;
                    case "focus":
                        this.editor.onDidFocusEditorText(callback);
                        break;
                    case "changeCursor":
                        this.editor.onDidChangeCursorPosition(callback);
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
                if (this.editor)
                    this.editor.focus();
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
                const pos = this.editor.getPosition();
                const mode = MonacoEditorModel.modes[this.editor.getModel().getModeId()];
                return {
                    row: pos.lineNumber,
                    column: pos.column,
                    line: this.editor.getModel().getLineCount(),
                    langmode: {
                        text: mode.aliases[0],
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
                return this.editor.getValue();
            }
            /**
             * Set editor value
             *
             * @param {string} value
             * @memberof MonacoEditorModel
             */
            setValue(value) {
                this.editor.setValue(value);
            }
            getEditor() {
                return this.editor;
            }
        }
        application.MonacoEditorModel = MonacoEditorModel;
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));

__monaco_public_path__ = "VFS/get/" + "pkg://MonacoCore/bundle/".asFileHandle().path + "/";
var OS;
(function (OS) {
    let application;
    (function (application) {
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
                this.bottombar = this.find("bottombar");
                this.langstat = this.find("langstat");
                this.editorstat = this.find("editorstat");
                this.filestat = this.find("current-file-lbl");
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
                const wrapper = this.find("wrapper");
                $(wrapper).css('visibility', 'hidden');
                monaco.editor.setTheme("vs-dark");
                // add editor instance
                this.eum
                    .add(new OS.application.MonacoEditorModel(this, this.find("left-tabbar"), this.find("left-editorarea")))
                    .add(new OS.application.MonacoEditorModel(this, this.find("right-tabbar"), this.find("right-editorarea")));
                this.eum.onstatuschange = (st) => this.updateStatus(st);
                $(wrapper).css('visibility', 'visible');
                this.setup();
                this.eum.active.openFile(file);
                /*this.load(new Promise((resolve, reject) => {
                    require.config({ paths: { 'vs': "pkg://MonacoCore/vs".asFileHandle().getlink() }});
                    require(['vs/editor/editor.main'], () => {
                        
                        resolve(undefined);
                    });
                }))*/
            }
            /**
             * Set up the text editor
             *
             * @private
             * @returns {void}
             * @memberof Antedit
             */
            setup() {
                this.fileview.onfileopen = (e) => {
                    if (!e.data || !e.data.path) {
                        return;
                    }
                    if (e.data.type === "dir") {
                        return;
                    }
                    this.addRecent(e.data.path);
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
                    m.items = [
                        { text: "__(New file)", id: "new" },
                        { text: "__(New folder)", id: "newdir" },
                        { text: "__(Rename)", id: "rename" },
                        { text: "__(Delete)", id: "delete" },
                    ];
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
                    const src = e.data.from.data.path.asFileHandle();
                    const des = e.data.to.data.path;
                    return src
                        .move(`${des}/${src.basename}`)
                        .then(function (d) {
                        const p1 = des;
                        const p2 = src.parent().path;
                        if (p1.length < p2.length) {
                            e.data.to.update(p1);
                            e.data
                                .from.parent.update(p2);
                        }
                        else {
                            e.data
                                .from.parent.update(p2);
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
                this.loadExtensionMetaData();
                this.toggleSideBar();
                this.toggleSplitMode();
                this.applyAllSetting();
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
                                return this.error(__("Fail to create: {0}", e.stack), e);
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
                                return this.error(__("Fail to create: {0}", dir.path), e);
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
                                return this.error(__("Fail to rename: {0}", file.path), e);
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
                                return this.error(__("Fail to delete: {0}", file.path), e);
                            }
                        });
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
                this.setting.recent.push(file);
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
            addAction(extension, action, callback) {
                const ed_action = {
                    id: `${extension.name}:${action.name}`,
                    label: `${extension.text.__()}: ${action.text.__()}`,
                    /*
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.F10,
                        // chord
                        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
                    ]*/
                    precondition: null,
                    keybindingContext: null,
                    contextMenuGroupId: extension.name,
                    //contextMenuOrder: 1.5,
                    run: () => callback(extension.name, action.name)
                };
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
                this.log("info", s, false);
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
                title: "__(New CodePad extension at)",
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
         * @private
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
