namespace OS {
    declare var $:any;
    export namespace application {
        /**
         * A simple yet powerful code/text editor.
         *
         * CodePad is a text editor based on the ACE editor.
         *
         * @export
         * @class CodePad
         * @extends {BaseApplication}
         */
        export class CodePad extends BaseApplication {


            /**
             * Reference to the editor manager instance
             *
             * @private
             * @type {EditorModelManager}
             * @memberof CodePad
             */
            eum: EditorModelManager;

            /**
             * Reference to the current working directory
             *
             * @type {API.VFS.BaseFileHandle}
             * @memberof CodePad
             */
            currdir: API.VFS.BaseFileHandle;

            /**
             * Placeholder stores all extension actions loaded from
             * extensions.json
             *
             * @type {GenericObject<any>}
             * @memberof CodePad
             */
            extensions: GenericObject<any>;

            /**
             * Reference to the sidebar file view UI
             *
             * @private
             * @type {GUI.tag.FileViewTag}
             * @memberof CodePad
             */
            private fileview: GUI.tag.FileViewTag;

            /**
             * Reference to the sidebar
             *
             * @private
             * @type {GUI.tag.VBoxTag}
             * @memberof CodePad
             */
            private sidebar: GUI.tag.VBoxTag;

            /**
             * Reference to an instance of AntOSDKBuilder
             * @private
             * @type {any}
             * @memberof CodePad
             */
            private sdk: any;

            /**
             * Reference to the bottom bar
             *
             * @private
             * @type {GUI.tag.TabContainerTag}
             * @memberof CodePad
             */
            private bottombar: GUI.tag.TabContainerTag;


            /**
             * Reference to the language status bar
             *
             * @private
             * @type {GUI.tag.LabelTag}
             * @memberof CodePad
             */
            private langstat: GUI.tag.LabelTag;

            /**
             * Reference to the editor status bar
             *
             * @private
             * @type {GUI.tag.LabelTag}
             * @memberof CodePad
             */
            private editorstat: GUI.tag.LabelTag;

            /**
             * Reference to the file status bar
             *
             * @private
             * @type {GUI.tag.LabelTag}
             * @memberof CodePad
             */
            private filestat: GUI.tag.LabelTag;

            /**
             * Is the split mode enabled
             *
             * @private
             * @type {boolean}
             * @memberof CodePad
             */
            private split_mode: boolean;

            /**
             * Reference to the editor logger
             *
             * @type {Logger}
             * @memberof CodePad
             */
            logger: Logger;

            /**
             * Prototype definition of a Logger
             *
             * @static
             * @type {typeof Logger}
             * @memberof CodePad
             */
            static Logger: typeof Logger;

            /**
             *Creates an instance of CodePad.
             * @param {AppArgumentsType[]} args application arguments
             * @memberof CodePad
             */
            constructor(args: AppArgumentsType[]) {
                super("CodePad", args);
                this.currdir = undefined;
                this.sdk = undefined;
            }

            /**
             * Main application entry point
             *
             * @returns {void}
             * @memberof CodePad
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

                // add editor instance
                this.eum
                    .add(new ACEModel(
                        this,
                        this.find("left-tabbar") as GUI.tag.TabBarTag,
                        this.find("left-editorarea")) as BaseEditorModel)
                    .add(new ACEModel(
                        this,
                        this.find("right-tabbar") as GUI.tag.TabBarTag,
                        this.find("right-editorarea")) as BaseEditorModel);

                this.eum.onstatuschange = (st) =>
                    this.updateStatus(st)

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
                this.setup();
                return this.eum.active.openFile(file);
            }
            /**
             * Set up the text editor
             *
             * @private
             * @returns {void}
             * @memberof CodePad
             */
            private setup(): void {
                if (!this.setting.recent)
                    this.setting.recent = [];
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
                this.eum.contextmenuHandle = (e, m) => {
                    m.items = [
                        {
                            text: __("Change theme"),
                            onmenuselect: async (
                                e: GUI.TagEventType<GUI.tag.StackMenuEventData>
                            ) => {
                                try{
                                    const themes = this.eum.active.getThemes();
                                    const data = await this.openDialog("SelectionDialog", {
                                        title: __("Select theme"),
                                        data: themes
                                    });
                                    this.eum.active.setTheme(data.theme);
                                }
                                catch(error)
                                {
                                    this.error(__("Unable to set theme"), error);
                                }
                            },
                        },
                        {
                            text: __("Change language mode"),
                            onmenuselect: async (
                                e: GUI.TagEventType<GUI.tag.StackMenuEventData>
                            ) => {
                                try{
                                    const modes = this.eum.active.getModes().map(v => {
                                        return{ text: v.text, mode: v.mode }});
                                    const data = await this.openDialog("SelectionDialog", {
                                        title: __("Select language"),
                                        data: modes
                                    });
                                    this.eum.active.setMode(data);
                                }
                                catch(error)
                                {
                                    this.error(__("Unable to set language mode"), error);
                                }
                            },
                        },
                        {
                            text: __("Build with AntOSDK"),
                            shortcut: " (CTRL-ALT-B)",
                            onmenuselect: async (
                                e: GUI.TagEventType<GUI.tag.StackMenuEventData>
                            ) => {
                                try{
                                    this.build();
                                }
                                catch(error)
                                {
                                    this.error(__("Unable to build with AntOSDK: {0}", error.toString()), error);
                                }
                            },
                        }
                    ];
                    return m.show(e);
                };

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
                this.bindKey("CTRL-ALT-B", () => this.build());

                this.fileview.ondragndrop = (e) => {
                    //const src = e.data.from.data.path.asFileHandle();
                    const src = e.data.from[0].data.path.asFileHandle();
                    const des = e.data.to.data.path;
                    return src
                        .move(`${des}/${src.basename}`)
                        .then(function (d: any) {
                            const p1 = des;
                            const p2 = src.parent().path;
                            if (p1.length < p2.length) {
                                e.data.to.update(p1);
                                (e.data
                                    .from[0] as GUI.tag.TreeViewTag).parent.update(
                                        p2
                                    );
                            } else {
                                (e.data
                                    .from[0] as GUI.tag.TreeViewTag).parent.update(
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
                this.toggleSideBar();
                this.toggleSplitMode();
                this.applyAllSetting();
            }

            /**
             * Build using antosdk
             * @private
             * @memberof CodePad
             */
            private build() {
                if(!this.currdir)
                {
                    return;
                }
                /**load the lib */
                API.requires("pkg://libantosdk/main.js")
                    .then(async () => {
                        try{
                            if(! (OS.API as any).AntOSDKBuilder)
                            {
                                return;
                            }
                            if(!this.sdk)
                            {
                                this.sdk = new (API as any).AntOSDKBuilder(this.logger,"");
                            }
                            this.logger.clear();
                            this.showBottomBar(true);
                            // check for meta file
                            const meta_file = `${this.currdir.path}/build.json`.asFileHandle();
                            const meta = await meta_file.read("json");
                            meta.root = this.currdir.path;
                            const targets = Object.keys(meta.targets).map(e =>{
                                return {text: e};
                            });
                            const target = await this.openDialog("SelectionDialog",{
                                title: __("Select a build target"),
                                data: targets
                            });
                            await this.load(this.sdk.batch([target.text], meta));
                        }
                        catch(error)
                        {
                            this.logger.error(__("No {0} file found in the current directory, or the file is invalid format","build.json"));
                        }
                    })
                    .catch((e) => {
                        this.logger.error(__("{0} is not installed, please install it: {1}", "libantosdk"));
                    })
            }

            /**
             * Update the editor status bar
             *
             * @private
             * @memberof CodePad
             */
            private updateStatus(stat: GenericObject<any> = undefined): void {
                if (!stat)
                    stat = this.eum.active.getEditorStatus();
                this.editorstat.text = __(
                    "Row {0}, col {1}, lines: {2}",
                    stat.row + 1,
                    stat.column + 1,
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
             * @memberof CodePad
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
             * @memberof CodePad
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
             * @memberof CodePad
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
             * @memberof CodePad
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
             * @memberof CodePad
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
                                e: GUI.TagEventType<GUI.tag.StackMenuEventData>,
                                r: CodePad
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
                        e: GUI.TagEventType<GUI.tag.StackMenuEventData>,
                        r: CodePad
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
             * @memberof CodePad
             */
            private ctxFileMenuHandle(
                e: GUI.TagEventType<GUI.tag.StackMenuEventData>
            ): void {
                const el = e.data.item;
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
             * @memberof CodePad
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
             * @param {CodePad} [r]
             * @returns {void}
             * @memberof CodePad
             */
            private menuAction(dataid: string, r?: CodePad): any {
                let me: CodePad = this;
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
             * @memberof CodePad
             */
            cleanup(evt: BaseEvent): void {
                let v: GenericObject<any>;
                const dirties = this.eum.dirties();
                if (dirties.length === 0) {
                    // cleanup all extension
                    for (let k in this.extensions) {
                        if (this.extensions[k].ext && this.extensions[k].ext.cleanup) {
                            this.extensions[k].ext.cleanup();
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
             * @memberof CodePad
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
                            e: GUI.TagEventType<GUI.tag.StackMenuEventData>,
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

            get editors(): BaseEditorModel[] {
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

        CodePad.Logger = Logger;

        CodePad.dependencies = [
            "pkg://ACECore/core/ace.js",
            "pkg://ACECore/path.js",
            "pkg://ACECore/core/ext-language_tools.js",
            "pkg://ACECore/core/ext-modelist.js",
            "pkg://ACECore/core/ext-themelist.js",
            //"pkg://libantosdk/main.js"
        ];
    }
}
