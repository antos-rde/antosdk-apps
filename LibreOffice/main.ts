namespace OS {

    export namespace application {
        const BUTTON_ICONS = {
            opendoc: "pkg://LibreOffice/open.png".asFileHandle().getlink(),
            newdoc: "pkg://LibreOffice/new.png".asFileHandle().getlink()
        }
        const DEFAULT_LOO_URL = "https://loo.iohub.dev/hosting/discovery";
        /**
         *
         * @class LibreOffice
         * @extends {BaseApplication}
         */
        export class LibreOffice extends BaseApplication {
            private access_token: string;
            private curr_file: API.VFS.BaseFileHandle;
            private placeholder: HTMLDivElement;
            private eid: string;
            private iframe: HTMLIFrameElement;
            private editor_meta: GenericObject<GenericObject<string>>;
            private post_msg_handle: (e:any) => void;
            private mimes: string[];
            private current_mode: string;

            constructor(args: AppArgumentsType[]) {
                super("LibreOffice", args);
                this.access_token = undefined;
                this.curr_file = undefined;
                this.eid = `id${Math.random().toString(36).replace(".","")}`;
                this.iframe = undefined;
                this.mimes = this.meta().mimes.map(e=>e);
                this.current_mode = undefined;
                this.post_msg_handle = (e) =>
                {
                    this.process_iframe_msg(e);
                }
            }
            main(): void {
                if(this.args && this.args.length > 0)
                {
                    this.curr_file = this.args[0].path.asFileHandle();
                }
            
                this.placeholder = this.find("editor-area") as HTMLDivElement;
                this.placeholder.id = this.eid;

                (this.find("btn-open-file") as GUI.tag.ButtonTag).onbtclick = (e) =>
                {
                    this.openFile();
                }
                (this.find("btn-new-doc") as GUI.tag.ButtonTag).onbtclick = (e) =>
                {
                    this.create("word");
                }
            
                (this.find("btn-new-cell") as GUI.tag.ButtonTag).onbtclick = (e) =>
                {
                    this.create("sheet");
                }
                
                (this.find("btn-new-slide") as GUI.tag.ButtonTag).onbtclick = (e) =>
                {
                    this.create("slide");
                }
                $(window).on("message", this.post_msg_handle);
                if(!this.setting.loo_url)
                {
                    this.setting.loo_url = DEFAULT_LOO_URL;
                }
                this.discover()
                    .then((data) =>
                    {
                        this.editor_meta = data;
                        if(this.curr_file)
                            this.open()
                    })
                    .catch((e) =>{
                        this.error(__("Unable to discover LibreOffice service: {0}", e.toString()), e);
                        //this.quit(true);
                    });
            }
            menu(): OS.GUI.BasicItemType[]{
                const nodes = [
                    { text: "__(New)", dataid :"new" },
                    { text: "__(Open)", dataid :"open" }
                ]
                if(this.current_mode == "edit")
                {
                    nodes.push({ text: "__(Save)", dataid :"save"});
                    nodes.push({ text: "__(Save As)", dataid :"saveas"});
                }
                return [ 
                    {
                        text: "__(File)",
                        nodes: nodes,
                        onchildselect: (e) =>
                        {
                            switch(e.data.item.data.dataid)
                            {
                                case "new":
                                    this.check_dirty().then((_)=>this.new_document());
                                    break;
                                case "open":
                                    this.check_dirty().then((_)=>this.openFile());
                                    break;
                                case "save":
                                    this.post_message("Action_Save", {
                                        DontTerminateEdit: true,
                                        DontSaveIfUnmodified: true,
                                        Notify: true
                                    });
                                    break;
                                case "saveas":
                                    this.check_dirty().then((_)=>this.save_as());
                                    break;
                                default:
                            }
                        }
                    },
                    {
                        text: "__(Document server URI)",
                        onmenuselect: async (_) =>
                        {
                            try{
                                const data = await this.openDialog("PromptDialog", {
                                    title: __("Document server URI"),
                                    label: __("Please enter LOO discovery URI"),
                                    value: this.setting.loo_url
                                });
                                this.setting.loo_url= data;
                                const meta = await this.discover();
                                this.editor_meta = meta;
                                if(this.curr_file)
                                    this.open();
                            }
                            catch(e)
                            {
                                this.error(__("Unable to set new document server URI: {0}", e.toString()), e);
                            } 
                        }
                    }
                ]
            }
            private update_title()
            {
                let title = this.curr_file.path;
                if(this.curr_file.dirty)
                {
                    title += ` ${__("(modified)")}`;
                }
                (this.scheme as GUI.tag.WindowTag).apptitle = title;
            }
            private post_message(id:string, values?: GenericObject<any>)
            {
                let msg:GenericObject<any> = {MessageId: id,SendTime: Date.now()};
                if(values)
                    msg.Values = values;
                this.iframe.contentWindow.postMessage(JSON.stringify(msg),"*");
            }
            private process_iframe_msg(e:any)
            {
                if(e.originalEvent.source != this.iframe.contentWindow)
                    return;
                let orgevt = e.originalEvent;
                let data = JSON.parse(orgevt.data);
                console.log("receive data", data);
                switch(data.MessageId)
                {
                    case 'Action_Load_Resp':
                        if(!data.Values.success)
                        {
                            this.error(data.Values.errorMsg);
                        }
                        break;
                    case 'App_LoadingStatus':
                        if(data.Values.Status == "Document_Loaded")
                        {
                            this.post_message("Host_PostmessageReady");
                            this.trigger("document_file_loaded");
                            if(this.current_mode == "edit")
                            {
                                this.post_message("Insert_Button",
                                {
                                    id:'lool_new_file',
                                    imgurl:BUTTON_ICONS.newdoc,
                                    label: __("New file").__(),
                                    hint: __("Create new document").__(),
                                    insertBefore: 'save'
                                }
                                );
                                this.post_message("Insert_Button",
                                    {
                                        id:'lool_open_file',
                                        imgurl:BUTTON_ICONS.opendoc,
                                        label: __("Open file").__(),
                                        hint: __("Open document").__(),
                                        insertBefore: 'lool_new_file'
                                    }
                                );
                            }
                        }
                        if(data.Values.Status == "Frame_Ready")
                        {
                            $(this.iframe).css("visibility","visible");
                        }
                        break;
                    case 'Doc_ModifiedStatus':
                        this.curr_file.dirty = data.Values.Modified;
                        this.update_title();
                        break;
                    case "Clicked_Button":
                        switch(data.Values.Id)
                        {
                            case 'lool_open_file':
                                this.check_dirty().then((_)=>this.openFile());
                                break;
                            case 'lool_new_file':
                                this.check_dirty().then((_)=>this.new_document());
                                break;
                            default:
                        }
                        break;
                    case "UI_SaveAs":
                        this.check_dirty().then((_)=>this.save_as(data.Values.format));
                        break;
                    default:
                        console.log(data);
                }          
                //console.log(this.eid, e);

            }
            private save_as(format:string = undefined)
            {
                if(!format) {
                    format = this.curr_file.ext;
                }
                const out_file = `${this.curr_file.parent().path}/${this.curr_file.basename.replace(/\..*$/, '.'+format)}`;
                console.log("export file data as ", out_file);
                this.openDialog("FileDialog",
                {
                    title: __("Save file as"),
                    type: "dir",
                    file: out_file.asFileHandle()
                })
                .then(async (d) =>
                {
                    const file = `${d.file.path}/${d.name}`.asFileHandle();
                    try
                    {
                        if(this.curr_file.ext == file.ext)
                        {
                            const r = await this.exec(
                            {
                                action: 'duplicate',
                                args:{src: this.curr_file.path, dest: file.path}
                            });
                            if(r.error)
                            {
                                throw r.error;
                            }
                            this.curr_file = file;
                            this.open();
                        }
                        else
                        {
                            this.post_message("Action_SaveAs", {
                                Filename: `${this.enb64u(file.path)}.${format}`,
                                Notify: true
                            });
                        }
                    }
                    catch(e)
                    {
                        this.error(__("Unable to save file as {0}: {1}", file.path, e.toString()),e);
                    }
                });
            }
            private new_document()
            {
                this.openDialog("SelectionDialog", {
                    title: __("Create new"),
                    data:[
                        {
                            text: __("Document"),
                            iconclass: "fa  fa-file-word-o",
                            type: "word"
                        },
                        {
                            text: __("Spreadsheet"),
                            iconclass: "fa  fa-file-excel-o",
                            type: "sheet"
                        },
                        {
                            text: __("Presentation"),
                            iconclass: "fa  fa-file-powerpoint-o",
                            type: "slide"
                        },
                    ]
                })
                .then((d) =>
                {
                    this.create(d.type);
                });
            }
            private discover(): Promise<GenericObject<any>>
            {
                return new Promise(async (resolve, reject) => {
                    try{
                        let xml_text = await this.setting.loo_url.asFileHandle().read();
                        let parser = new DOMParser();
                        let xml_doc = parser.parseFromString(xml_text,"text/xml");
                        let apps = xml_doc.getElementsByTagName("app");
                        let meta = {};
                        if(apps)
                        {
                            for(let app of apps){
                                let name = app.getAttribute("name")
                                if(name.match(/^[^\/]*\/[^\/]*$/g))
                                {
                                    if(!(this.mimes as any).includes(name))
                                    {
                                        this.mimes.push(name);
                                    }
                                }
                                let actions = app.getElementsByTagName("action");
                                if(actions)
                                {
                                    for(let action of actions)
                                    {
                                        let ext = action.getAttribute("ext");
                                        let mode = action.getAttribute("name");
                                        let urlsrc = action.getAttribute("urlsrc");
                                        if(ext && ext != "" && urlsrc)
                                        {
                                            meta[ext] = 
                                            {
                                                url: urlsrc,
                                                mode: mode
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        resolve(meta);
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }

                });
            }
            private openFile(): void {
                this.openDialog("FileDialog", {
                    title: __("Open file"),
                    type: "file",
                    mimes: this.mimes
                })
                .then((d) =>
                {
                    this.curr_file = d.file.path.asFileHandle();
                    this.open();
                });
            }

            private create(type: string): void
            {
                let ext = undefined
                switch (type)
                {
                    case 'word':
                        ext = "docx";
                        break;
                    case 'sheet':
                        ext = "xlsx";
                        break;
                    case "slide":
                        ext = "pptx";
                        break;
                    default:
                        this.error(__("Unknown doc type {0}", type));
                }
                this.openDialog("FileDialog", {
                    title: __("Save file as"),
                    type: "dir",
                    file: `home://Untitled.${ext}`.asFileHandle()
                })
                .then(async (d) =>
                {
                    try{
                        let file = `${d.file.path}/${d.name}`.asFileHandle();
                        let model = `${this.path()}/templates/model.${ext}`.asFileHandle();
                        let data = await model.read("binary");
                        let blob = new Blob([data], {
                            type: model.info.mime,
                        });
                        file.cache = blob;
                        await file.write(model.info.mime);
                        file.cache = undefined;
                        this.curr_file = file;
                        this.open();
                    }
                    catch(e)
                    {
                        this.error(__("Unable to create document {0}", e.toString()),e);
                    }
                });

            }

            private open(): void 
            {
                (this.scheme as GUI.tag.WindowTag).apptitle = __("Libre Office Online");
                if(!this.curr_file)
                    return;
                this.exec({
                    action: 'token',
                    args:{file: this.curr_file.path}
                })
                .then((r) =>{
                    if(r.error)
                    {
                        this.error(r.error);
                        return;
                    }
                    this.access_token = r.result.sid;
                    let mt = this.editor_meta[this.curr_file.ext];
                    if(!mt || !mt.url)
                    {
                        return this.error(__("Unknown editor for extension {0}", this.curr_file.ext));
                    }
                    this.current_mode = mt.mode;
                    // refresh the file menu
                    //this.appmenu.nodes = this.baseMenu() || [];
                    $(this.placeholder).empty();
                    let el = $('<iframe>', {
                        src: `${mt.url}?WOPISrc=${this.uapi()}`,
                        frameborder: 0
                    });
                    this.iframe = el[0] as HTMLIFrameElement;
                    el
                        .css("width", "100%")
                        .css("height", "100%")
                        .css("display", "block")
                        .css("visibility","hidden")
                        .appendTo(this.placeholder);
                    this.load(new Promise((ok,r)=>{
                        this.one("document_file_loaded",(_)=> ok(true))
                    }));

                })
                .catch((e) => {
                    this.error(e.toString(), e);
                });
            }
            private exec(request: GenericObject<any>): Promise<any> {
                let cmd = {
                    path: this.meta().path + "/api/api.lua",
                    parameters: request
                };
                return this.call(cmd);
            }

            private uapi(): string
            {
                let cmd = {
                    path: this.meta().path + "/api/api.lua",
                    parameters: {
                        action: 'file',
                        args: {file: this.curr_file.path}
                    }
                }
                
                // encode data to URL safe base64 encoding
                let encoded = this.enb64u(JSON.stringify(cmd));
                return `${this._api.REST}/system/apigateway/${encoded}/wopi/files/${this.curr_file.path.hash()}&${this.access_token}`;
            }
            private enb64u(input: string)
            {
                return btoa(input)
                        .trimBy("=")
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_');
            }
            private check_dirty():Promise<any>
            {
                return new Promise((ok,_)=>{
                    if(this.curr_file && this.curr_file.dirty)
                    {
                       
                        this.ask({ title: "__(Document unsaved)", text: "__(Continue action without saving?)" })
                            .then((d) =>
                            {
                                if(!d) return;
                                ok(true);
                            });
                    }
                    else
                    {
                        ok(true);
                    }
                })
            }
            cleanup(e):void
            {
                if(this.curr_file && this.curr_file.dirty)
                {  
                    e.preventDefault();
                    this.check_dirty().then((_)=>{
                        this.curr_file.dirty = false;
                        this.quit(true);
                    }
                    );
                    return;
                }
                $(window).off("message",this.post_msg_handle);
            }
        }
    }
}