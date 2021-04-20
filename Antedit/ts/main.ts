declare var __monaco_public_path__;
__monaco_public_path__ = "VFS/get/"+ "pkg://MonacoCore/bundle/".asFileHandle().path + "/";
namespace OS {
    export namespace application {
        
        declare var require: any;
        export type AnteditLogger = typeof Logger;
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
        export class Antedit extends BaseApplication {

            static EditorBaseExtension: AnteditBaseExtension;
            /**
             * Reference to the editor manager instance
             *
             * @private
             * @type {EditorModelManager}
             * @memberof Antedit
             */
            eum: EditorModelManager;

            /**
             * Reference to the current working directory
             *
             * @type {API.VFS.BaseFileHandle}
             * @memberof Antedit
             */
            currdir: API.VFS.BaseFileHandle;

            /**
             * Placeholder stores all extension actions loaded from
             * extensions.json
             *
             * @type {GenericObject<any>}
             * @memberof Antedit
             */
            extensions: GenericObject<any>;

            /**
             * Reference to the sidebar file view UI
             *
             * @private
             * @type {GUI.tag.FileViewTag}
             * @memberof Antedit
             */
            private fileview: GUI.tag.FileViewTag;

            /**
             * Reference to the sidebar
             *
             * @private
             * @type {GUI.tag.VBoxTag}
             * @memberof Antedit
             */
            private sidebar: GUI.tag.VBoxTag;

            /**
             * Reference to the bottom bar
             *
             * @private
             * @type {GUI.tag.TabContainerTag}
             * @memberof Antedit
             */
            private bottombar: GUI.tag.TabContainerTag;


            /**
             * Reference to the language status bar
             *
             * @private
             * @type {GUI.tag.LabelTag}
             * @memberof Antedit
             */
            private langstat: GUI.tag.LabelTag;

            /**
             * Reference to the editor status bar
             *
             * @private
             * @type {GUI.tag.LabelTag}
             * @memberof Antedit
             */
            private editorstat: GUI.tag.LabelTag;

            /**
             * Reference to the file status bar
             *
             * @private
             * @type {GUI.tag.LabelTag}
             * @memberof Antedit
             */
            private filestat: GUI.tag.LabelTag;


            /**
             * Is the split mode enabled
             *
             * @private
             * @type {boolean}
             * @memberof Antedit
             */
            private split_mode: boolean;

            /**
             * Reference to the editor logger
             *
             * @type {Logger}
             * @memberof Antedit
             */
            logger: Logger;

            /**
             * Extension prototype definition will be stored
             * in this class variable
             *
             * @static
             * @type {GenericObject<any>}
             * @memberof Antedit
             */
            static extensions: GenericObject<any>;

            /**
             * Prototype definition of a Logger
             *
             * @static
             * @type {AnteditLogger}
             * @memberof Antedit
             */
            static Logger: AnteditLogger;

            /**
             *Creates an instance of Antedit.
             * @param {AppArgumentsType[]} args application arguments
             * @memberof Antedit
             */
            constructor(args: AppArgumentsType[]) {
                super("Antedit", args);
                this.currdir = undefined;
            }

            /**
             * Main application entry point
             *
             * @returns {void}
             * @memberof Antedit
             */
            main(): void {
                this.extensions = {};
                this.eum = new EditorModelManager();
                this.fileview = this.find("fileview") as GUI.tag.FileViewTag;
                this.sidebar = this.find("sidebar") as GUI.tag.VBoxTag;
                this.bottombar = this.find("bottombar") as GUI.tag.TabContainerTag;
                this.langstat = this.find("langstat") as GUI.tag.LabelTag;
                this.editorstat = this.find("editorstat") as GUI.tag.LabelTag;
                this.filestat = this.find("current-file-lbl") as GUI.tag.LabelTag;
                this.logger = new Logger(this.find("output-tab"));

                this.split_mode = true;

                this.fileview.fetch = (path) =>
                    new Promise(async function (resolve, reject) {
                        let dir: API.VFS.BaseFileHandle;
                        if (typeof path === "string") {
                            dir = path.asFileHandle();
                        } else {
                            dir = path;
                        }
                        try {
                            const d = await dir
                                .read();
                            if (d.error) {
                                return reject(d.error);
                            }
                            return resolve(d.result);
                        } catch (e) {
                            return reject(__e(e));
                        }
                    });
                let file = "Untitled".asFileHandle() as EditorFileHandle;
                if (this.args && this.args.length > 0) {
                    this.addRecent(this.args[0].path);
                    if (this.args[0].type === "dir") {
                        this.currdir = this.args[0].path.asFileHandle() as EditorFileHandle;
                    } else {
                        file = this.args[0].path.asFileHandle() as EditorFileHandle;
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
                    .add(new OS.application.MonacoEditorModel(
                        this,
                        this.find("left-tabbar") as GUI.tag.TabBarTag,
                        this.find("left-editorarea")) as BaseEditorModel)
                    .add(new OS.application.MonacoEditorModel(
                        this,
                        this.find("right-tabbar") as GUI.tag.TabBarTag,
                        this.find("right-editorarea")) as BaseEditorModel);
                this.eum.onstatuschange = (st) =>
                    this.updateStatus(st)
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
            private setup(): void {
                this.fileview.onfileopen = (e) => {
                    if (!e.data || !e.data.path) {
                        return;
                    }
                    if (e.data.type === "dir") {
                        return;
                    }
                    this.addRecent(e.data.path);
                    return this.eum.active.openFile(
                        e.data.path.asFileHandle() as EditorFileHandle
                    );
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
                        .then(function (d: any) {
                            const p1 = des;
                            const p2 = src.parent().path;
                            if (p1.length < p2.length) {
                                e.data.to.update(p1);
                                (e.data
                                    .from as GUI.tag.TreeViewTag).parent.update(
                                        p2
                                    );
                            } else {
                                (e.data
                                    .from as GUI.tag.TreeViewTag).parent.update(
                                        p2
                                    );
                                e.data.to.update(p1);
                            }
                        })
                        .catch((e: Error) =>
                            this.error(__("Unable to move file/folder"), e)
                        );
                };

                this.on("filechange", (data) => {
                    let { path } = data.file;
                    if (data.type === "file") {
                        ({ path } = data.file.parent());
                    }
                    return this.fileview.update(path);
                });

                (this.find("logger-clear") as GUI.tag.ButtonTag).onbtclick = () => {
                    this.logger.clear()
                }

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
            private updateStatus(stat: GenericObject<any> = undefined): void {
                if (!stat)
                    stat = this.eum.active.getEditorStatus();
                this.editorstat.text = __(
                    "Row {0}, col {1}, lines: {2}",
                    stat.row ,
                    stat.column,
                    stat.line
                );
                if (stat.langmode)
                    this.langstat.text = stat.langmode.text;
                this.filestat.text = stat.file
                let win = this.scheme as GUI.tag.WindowTag;
                if (win.apptitle != stat.file)
                    win.apptitle = stat.file;
            }

            /**
             * Show or hide the SideBar
             *
             * @memberof Antedit
             */
            toggleSideBar(): void {
                if (this.currdir) {
                    $(this.sidebar).show();
                    this.fileview.path = this.currdir.path;
                } else {
                    $(this.sidebar).hide();
                }
                this.trigger("resize");
            }

            showOutput(toggle: boolean = false): void {
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
            protected applySetting(k: string): void {
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
            public showBottomBar(v: boolean): void {
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
            private toggleBottomBar(): void {
                this.showBottomBar(!this.setting.showBottomBar);
            }

            private toggleSplitMode(): void {
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
                    right_editor.openFile("Untitled".asFileHandle() as EditorFileHandle);
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
            private fileMenu(): GUI.BasicItemType {
                const recent = this.setting.recent.map((i: string) => {
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
                            onchildselect: (
                                e: GUI.TagEventType<GUI.tag.MenuEventData>,
                                r: Antedit
                            ) => {
                                const handle = e.data.item.data.text.asFileHandle();
                                handle.onready().then((meta: any) => {
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
                    onchildselect: (
                        e: GUI.TagEventType<GUI.tag.MenuEventData>,
                        r: Antedit
                    ) => {
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
            private ctxFileMenuHandle(
                e: GUI.TagEventType<GUI.tag.MenuEventData>
            ): void {
                const el = e.data.item as GUI.tag.MenuEntryTag;
                if (!el) {
                    return;
                }
                const data = el.data;
                if (!data) {
                    return;
                }
                let file: API.VFS.BaseFileHandle | API.FileInfoType = this
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
                            } catch (e) {
                                return this.error(
                                    __("Fail to create: {0}", e.stack),
                                    e
                                );
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
                            } catch (e) {
                                return this.error(
                                    __("Fail to create: {0}", dir.path),
                                    e
                                );
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
                            } catch (e) {
                                return this.error(
                                    __("Fail to rename: {0}", file.path),
                                    e
                                );
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
                            text: __(
                                "Do you really want to delete: {0}?",
                                file.filename
                            ),
                        }).then(async (d) => {
                            if (!d) {
                                return;
                            }
                            file = file.path.asFileHandle();
                            dir = file.parent();
                            try {
                                const r = await file.remove();
                                return this.fileview.update(dir.path);
                            } catch (e) {
                                return this.error(
                                    __("Fail to delete: {0}", file.path),
                                    e
                                );
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
            private addRecent(file: string): void {
                if (!this.setting.recent)
                    this.setting.recent = [];
                if (this.setting.recent.includes(file)) {
                    return;
                }
                this.setting.recent.push(file);
                if(this.setting.recent.length > 10)
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
            private menuAction(dataid: string, r?: Antedit): any {
                let me: Antedit = this;
                if (r) {
                    me = r;
                }
                switch (dataid) {
                    case "new":
                        return me.eum.active.openFile("Untitled".asFileHandle() as EditorFileHandle);
                    case "open":
                        return me
                            .openDialog("FileDialog", {
                                title: __("Open file"),
                                mimes: Array.from(me.meta().mimes).filter(
                                    (v) => v !== "dir"
                                ),
                            })
                            .then((f: API.FileInfoType) => {
                                this.addRecent(f.file.path);
                                me.eum.active.openFile(f.file.path.asFileHandle());
                            });
                    case "opendir":
                        return me
                            .openDialog("FileDialog", {
                                title: __("Open folder"),
                                mimes: ["dir"],
                            })
                            .then(function (f: API.FileInfoType) {
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
            cleanup(evt: BaseEvent): void {
                let v: GenericObject<any>;
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
                    text: __(
                        "Ignore all unsaved files: {0} ?",
                        (() => {
                            const result1 = [];
                            for (v of Array.from(dirties)) {
                                result1.push(v.filename);
                            }
                            return result1;
                        })().join(", ")
                    ),
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
            menu(): GUI.BasicItemType[] {
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
                        onchildselect: (
                            e: GUI.TagEventType<GUI.tag.MenuEventData>,
                            r: EditorFileHandle
                        ) => {
                            switch (e.data.item.data.dataid) {
                                case "bottombar":
                                    return this.toggleBottomBar();

                                case "splitview":
                                    return this.toggleSplitMode();
                                    break;

                                default:
                                    break;
                            }
                            r
                        },
                    },
                ];
            }
            
            /**
             * Load the extension meta data from `extension.json` file
             *
             * @memberof AntEdit
             */
            loadExtensionMetaData(): void {
                this.loadExtensionMetaFromFile(`${this.meta().path}/extensions/extensions.json`)
                    .catch((e) => {
                        return this.error(
                            __("Cannot load extension meta data"),
                            e
                        );
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
            private loadExtensionMetaFromFile(path: string | API.VFS.BaseFileHandle): Promise<void> {
                return new Promise((resolve, reject) => {
                    path
                        .asFileHandle()
                        .read("json")
                        .then((d: GenericObject<any>[]) => {
                            for (let extension of d) {
                                for(let act of extension.actions)
                                {
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
            loadAndRunExtensionAction(name: string, action: string, root?:string): void {
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
                            return this.error(
                                __("unable to load extension: {0}", name),
                                e
                            );
                        });
                } else {
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
            private runExtensionAction(name: string, action: string): void {
                if (!this.extensions[name]) {
                    if (!Antedit.extensions[name]) {
                        return this.error(
                            __("Unable to find extension: {0}", name)
                        );
                    }
                    this.extensions[name] = new Antedit.extensions[name](this);
                }
                
                if (!this.extensions[name][action]) {
                    return this.error(__("Unable to find action: {0}", action));
                }

                this.extensions[name].preload()
                    .then(() => this.extensions[name][action]())
                    .catch((e: Error) => {
                        return this.error(__("Unable to preload extension"), e);
                    });
            }
        }

        /**
         * Helper class to manager several instances
         * of editor models
         *
         * @class EditorModelManager
         */
        class EditorModelManager {

            /**
             * Referent to the active editor model
             *
             * @private
             * @type {BaseEditorModel}
             * @memberof EditorModelManager
             */
            private active_editor: BaseEditorModel;

            /**
             * Store a list of editor models
             *
             * @private
             * @type {BaseEditorModel[]}
             * @memberof EditorModelManager
             */
            private models: BaseEditorModel[];

            /**
             * Creates an instance of EditorModelManager.
             * @memberof EditorModelManager
             */
            constructor() {
                this.active_editor = undefined;
                this.models = [];
            }

            get editors(): OS.application.BaseEditorModel[] {
                return this.models;
            }
            set contextmenuHandle(cb: (e: any, m: any) => void) {
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
            get active(): BaseEditorModel {
                return this.active_editor;
            }

            /**
             * Add a model to the manager
             *
             * @param {BaseEditorModel} model
             * @memberof EditorModelManager
             */
            add(model: BaseEditorModel): EditorModelManager {
                this.models.push(model);
                if (!this.active_editor)
                    this.active_editor = model;
                model.on("focus", () => {
                    this.active_editor = model;
                });
                return this;
            }
            
            addAction(extension: GenericObject<any>, action: GenericObject<any>, callback): void {
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
                for(let ed of this.models)
                {
                    const editor = ed.getEditor();
                    if(!editor.getAction(ed_action.id))
                        editor.addAction(ed_action);
                }
            }

            set onstatuschange(cb: (stat: GenericObject<any>) => void) {
                for (let ed of this.models) {
                    ed.onstatuschange = cb;
                }
            }

            dirties(): EditorFileHandle[] {
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
            resize(): void {
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
             * Referent to the log container
             *
             * @private
             * @type {HTMLElement}
             * @memberof Logger
             */
            private target: HTMLElement;


            /**
             * Creates an instance of Logger.
             * @param {HTMLElement} el target container
             * @memberof Logger
             */
            constructor(el: HTMLElement) {
                this.target = el;
            }

            /**
             * Log level info
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            info(s: string | FormattedString): void {
                this.log("info", s, true);
            }

            /**
             * Log level warning
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            warn(s: string | FormattedString): void {
                this.log("warn", s, true);
            }

            /**
             * Log level error
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            error(s: string | FormattedString): void {
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
            private log(c: string, s: string | FormattedString, showtime: boolean): void {
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
            print(s: string | FormattedString): void {
                this.log("info", s, false);
            }

            /**
             * Empty the log container
             *
             * @memberof Logger
             */
            clear(): void {
                $(this.target).empty();
            }
        }

        Antedit.Logger = Logger;
        
        Antedit.dependencies = [
            "pkg://MonacoCore/bundle/app.bundle.js"
        ];
    }
}