/**
 * Define missing API in Array interface
 *
 * @interface Array
 * @template T
 */
interface Array<T> {
    /**
     * Check if the array includes an element
     *
     * @param {T} element to check
     * @returns {boolean}
     * @memberof Array
     */
    includes(el: T):boolean;
}

namespace OS {
    export namespace application {

        /**
         *
         * @class SQLiteDBBrowser
         * @extends {BaseApplication}
         */
        export class SQLiteDBBrowser extends BaseApplication {

            private filehandle: API.VFS.BaseFileHandle;
            private tbl_list: GUI.tag.ListViewTag;
            private grid_table: GUI.tag.GridViewTag;
            private grid_scheme: GUI.tag.GridViewTag;
            private container: GUI.tag.TabContainerTag;
            private last_max_id: number;
            private n_records: number;
            private btn_loadmore: GUI.tag.ButtonTag;
            constructor(args: AppArgumentsType[]) {
                super("SQLiteDBBrowser", args);
            }

            menu() {
                return [
                    {
                        text: "__(File)",
                        nodes: [
                            {
                            text: "__(New database)",
                            dataid: "new",
                            shortcut: 'A-N'
                            },
                            {
                            text: "__(Open database)",
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
                            this.tbl_list.selected = list.length - 1;
                        }
                    })
            }
            private async openFile() {
                try {
                    let file: API.VFS.BaseFileHandle;
                    if (this.args && this.args.length > 0) {
                        file = this.args[0].path.asFileHandle();
                    }
                    else
                    {
                        const d_1 = await this.openDialog("FileDialog",{
                            title: __("Open file"),
                            mimes: this.meta().mimes
                        });
                        file = d_1.file.path.asFileHandle();
                    }

                    
                    this.filehandle=`sqlite://${file.genealogy.join("/")}`.asFileHandle();
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
                        const schema = this.tbl_list.selectedItem.data.handle.info.schema;
                        if(!schema)
                            return;
                        const data = [];
                        for(let k in schema.types)
                        {
                            data.push([
                                { text: k},
                                {text: schema.types[k]}
                            ])
                        }
                        this.grid_scheme.rows = data;
                    }
                }
                (this.find("bt-rm-table") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    try {
                        if(!this.filehandle)
                        {
                            return this.notify(__("Please open a database file"));
                        }
                        if(this.tbl_list.selectedItem == undefined)
                        {
                            return;
                        }
                        const table = this.tbl_list.selectedItem.data.name;
                        const ret = await this.openDialog("YesNoDialog", {
                            title: __("Confirm delete?"),
                            text: __("Do you realy want to delete table: {0}", table)
                        });

                        if(ret)
                        {
                            await this.filehandle.remove(table);
                            this.list_tables();
                        }
                    }
                    catch(e)
                    {
                        this.error(__("Unable to execute action table delete: {0}", e.toString()), e);
                    }
                    
                }
                (this.find("bt-add-table") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    try
                    {
                        if(!this.filehandle)
                        {
                            return this.notify(__("Please open a database file"));
                        }
                        const data = await this.openDialog(new NewTableDialog(), {
                            title: __("Create new table")
                        });
                        this.filehandle.cache = data.schema;
                        await this.filehandle.write(data.name);
                        this.list_tables();
                    }
                    catch(e)
                    {
                        this.error(__("Unable to create table: {0}", e.toString()), e);
                    }
                }
                (this.find("btn-edit-record") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    this.edit_record();
                }
                (this.find("btn-add-record") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    this.add_record();
                }
                (this.find("btn-delete-record") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    this.remove_record();
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
                        const headers = handle.info.schema.fields.map((e) =>  {
                            return {text: e}
                        });
                        this.grid_table.header = headers;
                        this.grid_table.rows = [];
                        const records = await handle.read({fields:["COUNT(*)"]});
                        this.n_records = records[0]["COUNT(*)"];
                        this.btn_loadmore.text = `0/${this.n_records}`;
                        await this.load_table();
                        this.container.selectedIndex = 1;
                    }
                    catch(e)
                    {
                        this.error(__("Error reading table: {0}", e.toString()),e);
                    }
                }
                this.grid_table.oncelldbclick = async (e) => {
                    this.edit_record();
                }

                this.openFile();
            }
            private async add_record()
            {
                try
                {
                    const table_handle = this.tbl_list.selectedItem;
                    if(!table_handle)
                    {
                        return;
                    }
                    const file_hd = table_handle.data.handle;
                    const schema = table_handle.data.handle.info.schema;
                    const model = {};
                    for(let k in schema.types)
                    {
                        if(["INTEGER", "REAL", "NUMERIC"].includes(schema.types[k]))
                        {
                            model[k] =  0;
                        }
                        else
                        {
                            model[k] = "";
                        }
                    }
                    console.log(model);
                    const data = await this.openDialog(new RecordEditDialog(), {
                        title: __("New record"),
                        schema: schema,
                        record: model
                    });
                    file_hd.cache = data;
                    await file_hd.write(undefined);
                    this.n_records += 1;
                    await this.load_table();
                }
                catch (e)
                {
                    this.error(__("Error edit/view record: {0}", e.toString()), e);
                }
            }
            private async remove_record()
            {
                try
                {
                    const cell = this.grid_table.selectedCell;
                    const row = this.grid_table.selectedRow;
                    const table_handle = this.tbl_list.selectedItem;
                    if(!cell || !table_handle)
                    {
                        return;
                    }
                    const pk_id = cell.data.record[table_handle.data.handle.info.schema.pk];
                    const ret = await this.openDialog("YesNoDialog", {
                        title: __("Delete record"),
                        text: __("Do you realy want to delete record {0}",pk_id)
                    });
                    if(!ret)
                    {
                        return;
                    }
                    const file_hd = `${table_handle.data.handle.path}@${pk_id}`.asFileHandle();
                    await file_hd.remove();
                    this.n_records--;
                    // remove the target row
                    this.grid_table.delete(row);
                    this.btn_loadmore.text = `${this.grid_table.rows.length}/${this.n_records}`;
                }
                catch(e)
                {
                    this.error(__("Error deleting record: {0}", e.toString()),e);
                }
            }
            private async edit_record()
            {
                try
                {
                    const cell = this.grid_table.selectedCell;
                    const row = this.grid_table.selectedRow;
                    const table_handle = this.tbl_list.selectedItem;
                    if(!cell || !table_handle)
                    {
                        return;
                    }
                    const data = await this.openDialog(new RecordEditDialog(), {
                        title: __("View/edit record"),
                        schema: table_handle.data.handle.info.schema,
                        record: cell.data.record
                    });
                    const pk_id = cell.data.record[table_handle.data.handle.info.schema.pk];
                    const file_hd = `${table_handle.data.handle.path}@${pk_id}`.asFileHandle();
                    file_hd.cache = data;
                    await file_hd.write(undefined);
                    const row_data = [];
                    for(let k of file_hd.info.schema.fields)
                    {
                        let text:string = data[k];
                        if(text.length > 100)
                        {
                            text = text.substring(0,100);
                        }
                        row_data.push({
                            text: text,
                            record: data
                        });
                    }
                    row.data = row_data;
                }
                catch (e)
                {
                    this.error(__("Error edit/view record: {0}", e.toString()), e);
                }
            }

            private async load_table()
            {
                if(this.grid_table.rows && this.grid_table.rows.length >= this.n_records)
                {
                    return;
                }
                if(!this.tbl_list.selectedItem)
                            return;
                const handle: API.VFS.BaseFileHandle = this.tbl_list.selectedItem.data.handle;
                await handle.onready();
                const headers = handle.info.schema.fields.map((e) =>  {
                    return {text: e}
                });
                // read all records
                const filter = { where: {}, limit: 10}
                filter.where[`${handle.info.schema.pk}\$gt`] = this.last_max_id;
                const records = await handle.read(filter);
                
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
                    this.grid_table.scroll_to_bottom();
                }

                this.btn_loadmore.text = `${this.grid_table.rows.length}/${this.n_records}`;
            }
        }

        SQLiteDBBrowser.dependencies = [
            "pkg://SQLiteDB/libsqlite.js"
        ]

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
                $(this.container)
                    .css("overflow-y", "auto");
                this.addField();
                (this.find("btnOk") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    const input = this.find("txt-tblname") as GUI.tag.InputTag;

                    if(!input.value || input.value == "")
                    {
                        return this.notify(__("Please enter table name"));
                    }
                    const tblname = input.value;
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
                        this.handle({ name: tblname, schema: cdata});
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
            <afx-button data-id = "btnAdd" iconclass="fa fa-plus" data-width = "content" ></afx-button>
            <div style = "text-align: right;">
                <afx-button data-id = "btnOk" text = "__(Ok)"></afx-button>
                <afx-button data-id = "btnCancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>`;

        class RecordEditDialog extends GUI.BasicDialog
        {
            /**
             * Reference to the form container
             *
             * @private
             * @type {HTMLDivElement}
             * @memberof RecordEditDialog
             */
            private container: HTMLDivElement;
            /**
             * Creates an instance of RecordEditDialog.
             * @memberof RecordEditDialog
             */
            constructor() {
                super("RecordEditDialog");
            }

            /**
             * Main entry point
             *
             * @memberof RecordEditDialog
             */
            main(): void {
                super.main();
                this.container = this.find("container") as HTMLDivElement;
                (this.find("btnCancel") as GUI.tag.ButtonTag).onbtclick = (e) => this.quit();
                $(this.container)
                    .css("overflow-y", "auto");
                if(!this.data || !this.data.schema)
                {
                    throw new Error(__("No data provided for dialog").__());
                }
                for(let k in this.data.schema.types)
                {
                    const input = $("<afx-input>").appendTo(this.container)[0] as GUI.tag.InputTag;
                    input.uify(this.observable);
                    input.label = k;
                    if(k == this.data.schema.pk)
                    {
                        input.disable = true;
                    }
                    if(this.data.schema.types[k] == "TEXT")
                    {
                        input.verbose = true;
                        $(input).css("height", "100px");
                    }
                    if(this.data.record[k] != undefined)
                    {
                        input.value = this.data.record[k];
                    }
                }
                (this.find("btnOk") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    const inputs = $("afx-input", this.container) as JQuery<GUI.tag.InputTag>;
                    const data = {};
                    for(let input of inputs)
                    {
                        data[input.label.__()] = input.value;
                    }
                    if (this.handle)
                        this.handle(data);
                    this.quit();
                }
            }
        }

        /**
         * Scheme definition
         */
        RecordEditDialog.scheme = `\
<afx-app-window width='550' height='500'>
    <afx-vbox padding = "5">
        <div data-id="container" style="row-gap: 5px;"></div>
        <afx-hbox data-height="35">
            <div></div>
            <div data-width="content">
                <afx-button data-id = "btnOk" text = "__(Ok)"></afx-button>
                <afx-button data-id = "btnCancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>`;
    }


}