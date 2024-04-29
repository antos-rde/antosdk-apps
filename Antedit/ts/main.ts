namespace OS {

    export namespace GUI {
        export namespace tag {
            class AntEditExtensionListItem extends ListViewItemTag
            {
                protected itemlayout(): TagLayoutType {
                     return { 
                        el: "div",
                        children: [
                            {el:"afx-label", ref: "label"},
                            {el:"p", ref:"desc", id: "ext-list-item-d-p"},
                            {
                                el:"p",
                                id: "ext-list-item-b-p",
                                children:[
                                    {
                                        el: "i",
                                        ref:"intall_status"
                                    },
                                    {
                                        el: "afx-button",
                                        ref:"btn_remove"
                                    },
                                    {
                                        el: "afx-button",
                                        ref:"btn_install"
                                    }
                                ]
                            }
                        ]
                    };
                }
                protected ondatachange(): void {
                    const v = this.data;
                    if (!v) {
                        return;
                    }
                    const label = this.refs.label as LabelTag;
                    label.iconclass = "bi bi-puzzle";
                    label.text = `${v.text} - v${v.version}`;
                    // add description
                    const p_desc = this.refs.desc as HTMLParagraphElement;
                    $(p_desc).text(v.description);
                    
                    // button install
                    const btn_install = this.refs.btn_install as ButtonTag;
                    // button remove
                    const btn_remove = this.refs.btn_remove as ButtonTag;
                    
                    if(v.installed)
                    {
                        $(btn_remove).show();
                        btn_remove.iconclass = "bi bi-trash-fill";
                         btn_install.iconclass = "bi bi-arrow-repeat";
                         $(this.refs.intall_status).text(__("Installed: v{0} ", v.installed).__());
                    }
                    else
                    {
                        $(btn_remove).hide();
                        btn_install.iconclass = "fa bi-cloud-download-fill";
                        $(this.refs.intall_status).text(" ");
                    }
                }
                protected init(): void {
                    this.closable = false;
                    this.data = {};
                    // button install
                    const btn_install = this.refs.btn_install as ButtonTag;
                    // button remove
                    const btn_remove = this.refs.btn_remove as ButtonTag;
                    btn_install.onbtclick = (e) => {
                        if(!this.data.download || !this.data.install_action)
                        {
                            return;
                        }
                        this.data.install_action(this.data.download, (v: string) =>{
                            this.data.installed = v;
                            this.update(undefined);
                        });
                    };

                    btn_remove.onbtclick = (e) => {
                        if(!this.data.installed || !this.data.uninstall_action)
                        {
                            return;
                        }
                        this.data.uninstall_action(this.data.name, () => {
                            delete this.data.installed;
                            this.update(undefined);
                        });
                    };
                }
                protected reload(d?: any): void {
                    this.data = this.data;
                }
            }

            define("afx-antedit-ext-list-item", AntEditExtensionListItem)
        }
    }
    export namespace application {
        
        declare var require: any;
        export type AnteditLogger = typeof Logger;
        const DEFAULT_REPO = "https://raw.githubusercontent.com/lxsang/antos-antedit-extensions/master/extensions.json"

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
             * Variable stores all available extension meta-data
             * @type {GenericObject<any>[]}
             * @meberof Antedit
             */
            private extension_meta_data: GenericObject<any>[];

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
             * Reference to the sidebar tab container
             *
             * @private
             * @type {GUI.tag.TabContainerTag}
             * @memberof Antedit
             */
            private sidebar_container: GUI.tag.TabContainerTag;
            
             /**
             * Reference to the extension list UI
             *
             * @private
             * @type {GUI.tag.ListViewTag}
             * @memberof Antedit
             */
            private extension_list_view: GUI.tag.ListViewTag;

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
             * Buffer for open diff
             *
             * @private
             * @type {EditorFileHandle[]}
             * @memberof Antedit
             */
            private diff_buffer: EditorFileHandle[];

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
                this.diff_buffer = [undefined, undefined];
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
                this.sidebar_container = this.find("sidebar-tab-container") as GUI.tag.TabContainerTag;
                this.bottombar = this.find("bottombar") as GUI.tag.TabContainerTag;
                this.langstat = this.find("langstat") as GUI.tag.LabelTag;
                this.editorstat = this.find("editorstat") as GUI.tag.LabelTag;
                this.filestat = this.find("current-file-lbl") as GUI.tag.LabelTag;
                this.extension_list_view = this.find("extension-list") as GUI.tag.ListViewTag;
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
                if(!this.setting.extension_repos)
                    this.setting.extension_repos = [DEFAULT_REPO];
                    
                const wrapper = this.find("wrapper");
                $(wrapper).css('visibility', 'hidden');
                
                monaco.editor.setTheme("vs-dark");
                // add editor instance
                const left_editor = new OS.application.MonacoEditorModel(
                        this,
                        this.find("left-tabbar") as GUI.tag.TabBarTag,
                        this.find("left-editorarea")) as BaseEditorModel;
                const right_editor = new OS.application.MonacoEditorModel(
                        this,
                        this.find("right-tabbar") as GUI.tag.TabBarTag,
                        this.find("right-editorarea")) as BaseEditorModel;
                left_editor.setTabbarCtxMenu(this.tb_ctxmenu, (tab, data) => this.tabbar_ctx_menu_handle(tab,data, left_editor));
                right_editor.setTabbarCtxMenu(this.tb_ctxmenu, (tab, data) => this.tabbar_ctx_menu_handle(tab,data, right_editor));
                this.eum.add(left_editor).add(right_editor);
                this.eum.onstatuschange = (st) =>
                    this.updateStatus(st)
                $(wrapper).css('visibility', 'visible');
                this.setup();
                this.eum.active.openFile(file);
            }

            /**
             * Get the context menu items
             */
            private get tb_ctxmenu(): GenericObject<any>[]
            {
                return [
                    { text: "__(Close)", id: "close" },
                    { text: "__(Reload)", id: "reload", shortcut: "A-R"},
                    { text: "__(Close All)", id: "close-all" },
                    { text: "__(Move to other side)", id: "mv-side" },
                ];
            }

            private tabbar_ctx_menu_handle(tab: GUI.tag.ListViewItemTag, data: GenericObject<any>, model: BaseEditorModel): void {
                switch(data.id)
                {
                    case "close":
                        if(!tab)
                        {
                            return;
                        }
                        model.closeTab(tab);
                        break;
                    case "close-all":
                        model.closeAll();
                        break;
                    case "reload":
                        this.eum.active.reload();
                        break;
                    case "mv-side":
                        if(!tab)
                        {
                            return;
                        }
                        let other_model = this.eum.editors[0];
                        if(model == other_model)
                        {
                            other_model = this.eum.editors[1];
                        }
                        other_model.openFile(tab.data as EditorFileHandle);
                        model.closeTab(tab);
                        if(this.split_mode == false)
                        {
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
            private setup(): void {
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
                    let file: API.VFS.BaseFileHandle | API.FileInfoType = this
                        .fileview.selectedFile;
                    const items = [
                        { text: "__(New file)", id: "new" },
                        { text: "__(New folder)", id: "newdir" },
                        { text: "__(Rename)", id: "rename" },
                        { text: "__(Delete)", id: "delete" },
                        { text: "__(Upload)", id: "upload" },
                    ];
                    if(file && file.type === "file")
                    {
                        items.push( { text: "__(Select for compare)", id: "diff-org" });
                        items.push( { text: "__(Compare with selected)", id: "diff-mod" });
                        items.push( { text: "__(Open to right)", id: "open-right" });
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
                this.bindKey("ALT-R", () =>  this.eum.active.reload());
                
                const list_container = $(".list-container", this.find("editor-main-container"));
                list_container.each((i,el) => {
                    $(el).on("wheel", (evt)=>{
                        el.scrollLeft += (evt.originalEvent as WheelEvent).deltaY;
                    });
                });
                this.on("tab-opened", (el) => {
                    const container = $(el).closest(".list-container");
                    if(container && container[0])
                        container[0].scrollLeft = container[0].scrollWidth;
                });
                this.fileview.ondragndrop = (e) => {
                    if(!e.data.from || !e.data.to)
                    {
                        return;
                    }
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
                const extension = {
                    name: "Editor",
                    text: __("Editor")
                };
                const action = {
                    name: "langmode",
                    text: __("Change language mode"),
                    shortcut: 'CTRL-K'
                }
                this.eum.addAction(extension, action, async (e) =>
                {
                    try{
                        
                        const data = await this.openDialog("SelectionDialog", {
                            "title": __("Select language"),
                            data: this.eum.active.getModes()
                        });
                        this.eum.active.setMode(data);
                    }catch(e)
                    {
                        console.log(e);
                    }
                });
                $(this.find("txt_ext_search")).keyup((e) => this.extension_search(e));
                this.loadExtensionMetaData();
                this.toggleSideBar();
                this.toggleSplitMode();
                //this.applyAllSetting();
            }

            /**
             * Search an extension from the extension list
             * 
             * @private
             * @meberof Antedit
             */
            private extension_search(e: JQuery.KeyUpEvent): void
            {
                let k: string;
                const search_box = this.find("txt_ext_search") as HTMLInputElement;
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
            private refreshExtensionRepositories(): void {
                const promises = [];
                const meta_file = `${this.meta().path}/extensions/extensions.json`;
                for(let url of [meta_file].concat(this.setting.extension_repos))
                {
                    promises.push(url.asFileHandle().read('json'));
                }
                Promise.all(promises)
                    .then((results) => {
                        const meta = {};
                        for(let el of results.shift())
                        {
                            meta[el.name] = el;
                        }
                        this.extension_meta_data = [];
                        for(let result of results)
                        {
                            for(let ext of result)
                            {
                                if(meta[ext.name])
                                {
                                    ext.installed = meta[ext.name].version;
                                }
                                ext.install_action = (url: string,callback: (arg0: string) => void) => {
                                    (new Antedit.extensions["EditorExtensionMaker"](this))
                                        .installZip(url)
                                        .then(() => {
                                            this.loadExtensionMetaData();
                                            if(callback)
                                            {
                                                callback(ext.version);
                                            }
                                            this.notify(__("Extension '{0}' installed", ext.text));
                                        })
                                        .catch((error: Error) => {
                                            this.error(__("Unable to install '{0}': {1}", ext.text , error.toString()), error);
                                        });
                                    
                                };
                                ext.uninstall_action = (name: string, callback: () => void) => {
                                    (new Antedit.extensions["EditorExtensionMaker"](this))
                                        .uninstall(name)
                                        .then(() => {
                                            this.loadExtensionMetaData();
                                            if(callback)
                                            {
                                                callback();
                                            }
                                            this.notify(__("Extension '{0}' uninstalled", name));
                                        })
                                        .catch((error: Error) => {
                                            this.error(__("Unable to uninstall '{0}': {1}", name , error.toString()), error);
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
                    this.refreshExtensionRepositories();
                } else {
                    $(this.sidebar).hide();
                }
                this.trigger("resize");
            }

            showOutput(toggle: boolean = false): void {
                if (toggle)
                    this.setting.showBottomBar = true;
                this.bottombar.selectedIndex = 0;
            }
            
            openDiff(files: EditorFileHandle[])
            {
                const diff_file = new API.VFS.DiffEditorFileHandle(files);
                this.eum.active.openFile(diff_file as EditorFileHandle);
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
                this.setting.showBottomBar = !this.setting.showBottomBar;
            }
            
            /**
             * Toogle split mode
             * 
             * #memberof Antedit
            **/
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
                                e: GUI.TagEventType<GUI.tag.StackMenuEventData>,
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
                        e: GUI.TagEventType<GUI.tag.StackMenuEventData>,
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
                                    __e(e)
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
                                    __e(e)
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
                                    __e(e)
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
                                    __e(e)
                                );
                            }
                        });
                        break;
                    case "upload":
                        if(!dir)
                        {
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
                        if(!file) return;
                        this.diff_buffer[0] = file.path.asFileHandle() as EditorFileHandle;
                        break;
                    case "diff-mod":
                        if(!file) return;
                        if(!this.diff_buffer[0]) return;
                        this.diff_buffer[1] = file.path.asFileHandle() as EditorFileHandle;
                        this.openDiff(this.diff_buffer);
                        break;
                    case "open-right":
                        if(!file || file.type === "dir") return;
                        if(this.split_mode == false)
                        {
                            this.toggleSplitMode();
                        }
                        this.eum.editors[1].openFile(file.path.asFileHandle() as EditorFileHandle);
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
                this.setting.recent.unshift(file);
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
            
            /**
             * Add an action to the editor
             *
             * @param {GenericObject<any>} extension
             * @param {GenericObject<any>} action
             * @param callback
             * @memberof EditorModelManager
             */
            addAction(extension: GenericObject<any>, action: GenericObject<any>, callback): void {
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
                if(action.shortcut)
                {
                    const keys = action.shortcut.split("-");
                    let binding: number = 0;
                    for(const key of keys)
                    {
                        switch(key)
                        {
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
                                if(monaco.KeyCode[k])
                                {
                                    binding = binding | monaco.KeyCode[k];
                                }
                                else
                                {
                                    binding = 0;
                                }
                        }
                    }
                    if(binding != 0)
                        ed_action.keybindings.push(binding);
                }
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
                if(s.match(/warn/i))
                {
                    this.log("warn", s, false);
                }
                else if(s.match(/error/i))
                {
                    this.log("error", s, false);
                }
                else
                {
                    this.log("info", s, false);
                }
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
            "pkg://MonacoCore/path.js",
            "pkg://MonacoCore/bundle/app.bundle.js"
        ];
    }
}