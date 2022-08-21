namespace OS {

    export namespace application {
        const BUTTON_ICONS = {
            opendoc: "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAD8UlEQVR42q1Va2gcVRQ+587s7mRItNskfaY1trRi2sZHNYoQHzGmQkAMlNZK1R+l0R+K/REhRAmzIEElaqX2R/tDhZamov4QbV0a6V9Nm9DiI8QEEtpI8zDbPPfh7sw93juzOzv7Ugge2L3nztz7fed859w7CHmGiKocYHVGwswcvLwFWnNzc3tLS8sjaTIvcX4kBZvD4fBAf3//aeEmShGUd3Z2nu7q6noBHZPABOjA2/9ijs4+wiwrydehUKivp6fnqPCjOQSHPhrTmKI2XP/uA33/k9s6Ot58rSkNnvPzZlKQkTDDMM4XJXjp08m3aiqV9xUex3sqZqCtqZ6QMSeDdKQeEoISGQiCvo9PfnY0tjBVQNC9d7vf0Fkcq2AK9jXeR8wrEQB6Ii8gkJWV/skz4ZlLI8posKbOQmQfnnl9y/f2gsMnbnbvuctnaCwOm9QZaH3ifmAlpCklj7RvLw/Bn8lqSPAy+PVGKnT2ja0hN4MdmxTDDzGs1Wbh+aYHXVm8kebNM5m4En3TfxXGY1WUBB3HblmGyCBLsLUaDZViuLN8DvY/s9cL+p8SZQi+DF+BkaW1ZKKON/+iLIGUaEMQDMZjsHtNBA7ue6hAnlISCfldv++HK/DL7SBwpsP0PGQlOnh8onttBRpgruDD6xbgcGtDTgb5EkmXc27XVozus7MXr8Lg7BoCtRznlyF0/litgfUdAxcCqnovAK/l3IRKnWBz9Z155ZMZQEHUcnRcZz41twyROAJj8rZhN5KmOYxtvcMLLz5egxanCimrIiT2qUpBAT1sztzGppw1psXBIlkj0aQIsYHRSAqffnd4fOeWDRoRXy8iYgGBXab5PKDu1SAxwQXOji5BPGlCirNMB94em5xdxGffGx3as23zRotbLoGu+XMzQEgDOagZAqE/SplknUzLwtjfFqDiJ9kTDNn8bxO3JvC53vEfG+o21okF68VWTBN4znnaIUpzkJ2JBBZ1BlVVIJlMwUrCBKb43E2MscXBkekhPHBi8qvHdlc3Eqd1Ygtqoj56ma94Dci5FmT3ZEZRO4jGUwTMZzebXCIlFXkt/Tw8dwlfPjV9qrE+2MYYVckMHAK/q3uGwBN9uj3JliUaN4UsPoK8QyeT+un3hXPY/nmk59FdFa8GfBSUb/2MQ1lALXrXULYOIMDB0bz4BzCaoMTgSPQ4Hju31LHrbu0dXaM7ZDmJmxmof29T+wCq6QNCdmtmw0BcXOHJPyaTb2PvxciRYGX5J5wsvQRocYLSa5yTbiGPLifasfXAkada2g59kTKpuC6rNJ+C1uULX78iPlxKgHPrAfGssqiYqzOZRURRlGv/F2BJ+wdsRP1yLA0KOQAAAABJRU5ErkJggg==",
            newdoc: "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAABmklEQVRIie2Vv0tbURTHP+fmJTGpIYM/KEoUHItOEtIu6uTk2r9BcNMWuro62X9D6OTWIhp00baLCI2giKKYVoMtJtTE93JPhyLSpyavLxE69Due+73nwzn3nnvhkSX+wNut2pugm9XapdkXicO/A3ysaZDk3UnD9yt77KETs9mOg4d8Jkiy+9TTCc8HIpmoSH7xU3Wo7QCA3k5DLtMY0hIgCKRlwB8QI6v+NSds0sKZpXBm/eFBf6AtFTTSf0BThT5kvxRw620G1FUREQxwUraUa3c9LbXoa0XZLbkUSpYBd4Pp+Bz6eTQJoPo7d0sVVD14FZ8mbc5JU8IRF6/CnpsfSXlr5iVsvw9VQa0Ox5eWRP0b/ZF9uqSII+7Nch+QwthJVSTUc31aUXqvN5npeE2Uexp/q5VQFfQkhCN9hquxZtb1f3PQzq+UQflCVK6bWcdCAboSQtHJMf/zHVV98pBt0Rnfmbx7TYWFZoC4A5m0oVh+mr2gP5viIpbUH7GIeAKcAilUPogQ6H9vqJuB8taGp9z88LJ/0H4BR3aNW1eB/4cAAAAASUVORK5CYII="
        }
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
            private editor_meta: GenericObject<any>;
            private post_msg_handle: (e:any) => void;

            static discovery_uri: string;
            constructor(args: AppArgumentsType[]) {
                super("LibreOffice", args);
                this.access_token = undefined;
                this.curr_file = undefined;
                this.eid = `id${Math.random().toString(36).replace(".","")}`;
                this.iframe = undefined;
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
                this.discover()
                    .then((data) =>
                    {
                        this.editor_meta = data;
                        if(this.curr_file)
                            this.open()
                    })
                    .catch((e) =>{
                        this.error(__("Unable to discover LibreOffice service: {0}", e.toString()), e);
                        this.quit(true);
                    });
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
                console.log("sending",id);
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
                    default:
                        console.log(data);
                }          
                //console.log(this.eid, e);

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
                        let xml_text = await LibreOffice.discovery_uri.asFileHandle().read();
                        let parser = new DOMParser();
                        let xml_doc = parser.parseFromString(xml_text,"text/xml");
                        let apps = xml_doc.getElementsByTagName("app");
                        let meta = {};
                        if(apps)
                        {
                            for(let app of apps){
                                let actions = app.getElementsByTagName("action");
                                if(actions)
                                {
                                    for(let action of actions)
                                    {
                                        let ext = action.getAttribute("ext");
                                        let urlsrc = action.getAttribute("urlsrc");
                                        if(ext && ext != "" && urlsrc)
                                        {
                                            meta[ext] = urlsrc;
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
                    mimes: this.meta().mimes
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
                    let url = this.editor_meta[this.curr_file.ext];
                    if(!url)
                    {
                        return this.error(__("Unknown editor for extension {0}", this.curr_file.ext));
                    }
                    $(this.placeholder).empty();
                    let el = $('<iframe>', {
                        src: `${url}?WOPISrc=${this.uapi()}`,
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
                let encoded =
                    btoa(JSON.stringify(cmd))
                        .trimBy("=")
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_');
                return `${this._api.REST}/system/apigateway/${encoded}/wopi/files/${this.curr_file.basename}&${this.access_token}`;
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
                                this.curr_file.dirty = false;
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
                    this.check_dirty().then((_)=>this.quit(true));
                    return;
                }
                $(window).off("message",this.post_msg_handle);
            }
        }
        LibreOffice.discovery_uri = "https://loo.iohub.dev/hosting/discovery";
    }
}