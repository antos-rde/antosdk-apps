namespace OS {
    export namespace application {

        /**
         *
         * @class SQLiteDB
         * @extends {BaseApplication}
         */
        export class SQLiteDB extends BaseApplication {

            private filehandle: API.VFS.BaseFileHandle;
            private tbl_list: GUI.tag.ListViewTag;
            private grid_table: GUI.tag.GridViewTag;
            private grid_scheme: GUI.tag.GridViewTag;
            private container: GUI.tag.TabContainerTag;
            private last_max_id: number;
            private n_records: number;
            private btn_loadmore: GUI.tag.ButtonTag;
            constructor(args: AppArgumentsType[]) {
                super("SQLiteDB", args);
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
                        ],
                        onchildselect: (e) => {
                            switch (e.data.item.data.dataid) {
                            case "new":
                                return this.newFile();
                            case "open":
                                return this.openFile();
                            }
                        }
                    }
                ];
            }
            private list_tables()
            {
                this.filehandle.read()
                    .then((data) => {
                        const list = [];
                        for(let k in data)
                        {
                            list.push({
                                text: k,
                                name: k,
                                handle: data[k]
                            });
                        }
                        this.tbl_list.data = list;
                        if(list.length > 0)
                        {
                            this.tbl_list.selected = 0;
                        }
                    })
            }
            private async openFile() {
                try {
                    const d_1 = await this.openDialog("FileDialog",{
                        title: __("Open file"),
                        mimes: this.meta().mimes
                    });
                    this.filehandle=`sqlite://${d_1.file.path.asFileHandle().genealogy.join("/")}`.asFileHandle();
                    await this.filehandle.onready();
                    this.list_tables();
                }
                catch(e)
                {
                    this.error(__("Unable to open database file: {0}",e.toString()),e);
                };
            }

            private async newFile() {
                try {
                    const f = await this.openDialog("FileDialog",{
                        title: __("Save as"),
                        file: "Untitled.db"
                    });
                    var d_1 = f.file.path.asFileHandle();
                    if(f.file.type==="file") {
                        d_1=d_1.parent();
                    }
                    const target=`${d_1.path}/${f.name}`.asFileHandle();
                    this.filehandle=`sqlite://${target.genealogy.join("/")}`.asFileHandle();
                    await this.filehandle.onready();
                    this.list_tables();
                } 
                catch(e) {
                    this.error(__("Unable to init database file: {0}",e.toString()),e);
                }
            }

            main(): void {
                this.filehandle = undefined;
                this.tbl_list = this.find("tbl-list") as GUI.tag.ListViewTag;
                this.grid_table = this.find("tb-browser") as GUI.tag.GridViewTag;
                this.grid_scheme = this.find("sch-browser") as GUI.tag.GridViewTag;
                this.grid_table.resizable = true;
                this.grid_scheme.resizable = true;
                this.grid_scheme.header = [
                    { text: __("Field name") },
                    { text: __("Field type") },
                ];
                this.btn_loadmore = this.find("bt-load-next") as GUI.tag.ButtonTag;
                this.container = this.find("container") as GUI.tag.TabContainerTag;
                this.bindKey("ALT-N", () => {
                    return this.newFile();
                });
                this.bindKey("ALT-O", () => {
                    return this.openFile();
                });

                this.container.ontabselect = (e) => {
                    if(this.container.selectedIndex == 0)
                    {
                        if(!this.tbl_list.selectedItem)
                            return;
                        const scheme = this.tbl_list.selectedItem.data.handle.info.scheme;
                        if(!scheme)
                            return;
                        const data = [];
                        for(let k in scheme)
                        {
                            data.push([
                                { text: k},
                                {text: scheme[k]}
                            ])
                        }
                        this.grid_scheme.rows = data;
                    }
                }

                (this.find("bt-add-table") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    if(!this.filehandle)
                    {
                        return this.notify(__("Please open a database file"));
                    }
                    this.openDialog(new NewTableDialog(), {
                        title: __("Create new table")
                    })
                    .then((data) => {
                        console.log(data);
                    });
                }
                this.btn_loadmore.onbtclick = async (e) => {
                    try
                    {
                        await this.load_table();
                    }
                    catch(e)
                    {
                        this.error(__("Error reading table: {0}", e.toString()),e);
                    }
                }
                this.tbl_list.onlistselect = async (_) => {
                    try
                    {
                        if(!this.tbl_list.selectedItem)
                            return;
                        const handle: API.VFS.BaseFileHandle = this.tbl_list.selectedItem.data.handle;
                        await handle.onready();
                        this.last_max_id = 0;
                        this.grid_table.rows = [];
                        const headers =
                            Object.getOwnPropertyNames(handle.info.scheme).map((e)=>{
                                return {text: e}
                            });
                        this.grid_table.header = headers;
                        const records = await handle.read({fields:["COUNT(*)"]});
                        this.n_records = records[0]["(COUNT(*))"];
                        await this.load_table();
                        this.container.selectedIndex = 1;
                    }
                    catch(e)
                    {
                        this.error(__("Error reading table: {0}", e.toString()),e);
                    }
                }
                this.openFile();
            }

            private async load_table()
            {
                if(this.grid_table.rows.length >= this.n_records)
                {
                    return;
                }
                if(!this.tbl_list.selectedItem)
                            return;
                const handle: API.VFS.BaseFileHandle = this.tbl_list.selectedItem.data.handle;
                await handle.onready();
                const headers =
                    Object.getOwnPropertyNames(handle.info.scheme).map((e)=>{
                        return {text: e}
                    });
                // read all records
                const records = await handle.read({
                    where:{ id$gt: this.last_max_id },
                    limit: 10
                });
                
                if(records && records.length > 0)
                {
                    for(let e of records){
                        const row = [];
                        if(e.id && e.id > this.last_max_id)
                        {
                            this.last_max_id = e.id;
                        }
                        for(let v in headers)
                        {
                            let text:string = e[headers[v].text];
                            if(text.length > 100)
                            {
                                text = text.substring(0,100);
                            }
                            row.push({
                                text: text,
                                record: e
                            });
                        }
                        this.grid_table.push(row, false);
                    }
                    (this.grid_table as any).scroll_to_bottom();
                }

                this.btn_loadmore.text = `${this.grid_table.rows.length}/${this.n_records}`;
            }
        }


        class NewTableDialog extends GUI.BasicDialog {
            /**
             * Reference to the form container
             *
             * @private
             * @type {HTMLDivElement}
             * @memberof NewTableDialog
             */
            private container: HTMLDivElement;

            /**
             * Creates an instance of NewTableDialog.
             * @memberof NewTableDialog
             */
            constructor() {
                super("NewTableDialog");
            }
            
            /**
             * Main entry point
             *
             * @memberof NewTableDialog
             */
            main(): void {
                super.main();
                this.container = this.find("container") as HTMLDivElement;
                (this.find("btnCancel") as GUI.tag.ButtonTag).onbtclick = (e) => this.quit();
                (this.find("btnAdd") as GUI.tag.ButtonTag).onbtclick = (e) => this.addField();
                $(this.find("wrapper"))
                $(this.container)
                    .css("overflow-y", "auto");
                this.addField();
                (this.find("btnOk") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    const input = this.find("txt-tblname") as GUI.tag.InputTag;

                    if(!input.value || input.value == "")
                    {
                        return this.notify(__("Please enter table name"));
                    }

                    const inputs = $("input", this.container) as JQuery<HTMLInputElement>;
                    const lists = $("afx-list-view", this.container) as JQuery<GUI.tag.ListViewTag>;
                    if(inputs.length == 0)
                    {
                        return this.notify(__("Please define table fields"));
                    }
                    
                    let cdata: GenericObject<string> = {};
                    for (let i = 0; i < inputs.length; i ++) {
                        const key = inputs[i].value.trim();
                        if (key === "") {
                            return this.notify(__("Field name cannot be empty"));
                        }
                        if (cdata[key]) {
                            return this.notify(__("Duplicate field: {0}", key));
                        }
                        cdata[key] = lists[i].selectedItem.data.text;
                    }
                    if (this.handle)
                        this.handle(cdata);
                    this.quit();
                }
            }


            /**
             * Add new input key-value field to the dialog
             *
             * @private
             * @memberof NewTableDialog
             */
            private addField(): void {
                const div = $("<div>")
                    .css("display", "flex")
                    .css("flex-direction", "row")
                    .appendTo(this.container);
                $("<input>")
                    .attr("type", "text")
                    .css("flex", "1")
                    .appendTo(div);
                let list = $("<afx-list-view>")
                    .css("flex", "1")
                    .appendTo(div)[0] as GUI.tag.ListViewTag;
                list.uify(this.observable);
                list.dropdown = true;
                list.data = [
                    {text:"TEXT"},
                    {text:"INTEGER"},
                    {text:"REAL"},
                    {text:"NUMERIC"},
                ];
                list.selected = 0;
                const btn = $("<afx-button>");
                btn[0].uify(undefined);
                (btn[0] as GUI.tag.ButtonTag).iconclass = "fa fa-minus";
                btn
                    .on("click", () => {
                        div.remove();
                    })
                    .appendTo(div);
            }

        }

        /**
         * Scheme definition
         */
        NewTableDialog.scheme = `\
<afx-app-window width='400' height='350'>
    <afx-vbox padding = "10">
        <afx-input label="__(Table name)" data-id="txt-tblname" data-height="content"></afx-input>
        <afx-label text="__(Fields in table:)" data-height="30"></afx-label>
        <div data-id="container" style="position:relative;"></div>
        <afx-hbox data-height="35">
            <afx-button data-id = "btnAdd" iconclass="fa fa-plus" data-width = "35" ></afx-button>
            <div style = "text-align: right;">
                <afx-button data-id = "btnOk" text = "__(Ok)"></afx-button>
                <afx-button data-id = "btnCancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>`;
    }
}