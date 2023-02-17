

var OS;
(function (OS) {
    let application;
    (function (application) {
        /**
         *
         * @class SQLiteDBBrowser
         * @extends {BaseApplication}
         */
        class SQLiteDBBrowser extends application.BaseApplication {
            constructor(args) {
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
            list_tables() {
                this.filehandle.read()
                    .then((data) => {
                    const list = [];
                    for (let k in data) {
                        list.push({
                            text: k,
                            name: k,
                            handle: data[k]
                        });
                    }
                    this.tbl_list.data = list;
                    if (list.length > 0) {
                        this.tbl_list.selected = list.length - 1;
                    }
                });
            }
            async openFile() {
                try {
                    const d_1 = await this.openDialog("FileDialog", {
                        title: __("Open file"),
                        mimes: this.meta().mimes
                    });
                    this.filehandle = `sqlite://${d_1.file.path.asFileHandle().genealogy.join("/")}`.asFileHandle();
                    await this.filehandle.onready();
                    this.list_tables();
                }
                catch (e) {
                    this.error(__("Unable to open database file: {0}", e.toString()), e);
                }
                ;
            }
            async newFile() {
                try {
                    const f = await this.openDialog("FileDialog", {
                        title: __("Save as"),
                        file: "Untitled.db"
                    });
                    var d_1 = f.file.path.asFileHandle();
                    if (f.file.type === "file") {
                        d_1 = d_1.parent();
                    }
                    const target = `${d_1.path}/${f.name}`.asFileHandle();
                    this.filehandle = `sqlite://${target.genealogy.join("/")}`.asFileHandle();
                    await this.filehandle.onready();
                    this.list_tables();
                }
                catch (e) {
                    this.error(__("Unable to init database file: {0}", e.toString()), e);
                }
            }
            main() {
                this.filehandle = undefined;
                this.tbl_list = this.find("tbl-list");
                this.grid_table = this.find("tb-browser");
                this.grid_scheme = this.find("sch-browser");
                this.grid_table.resizable = true;
                this.grid_scheme.resizable = true;
                this.grid_scheme.header = [
                    { text: __("Field name") },
                    { text: __("Field type") },
                ];
                this.btn_loadmore = this.find("bt-load-next");
                this.container = this.find("container");
                this.bindKey("ALT-N", () => {
                    return this.newFile();
                });
                this.bindKey("ALT-O", () => {
                    return this.openFile();
                });
                this.container.ontabselect = (e) => {
                    if (this.container.selectedIndex == 0) {
                        if (!this.tbl_list.selectedItem)
                            return;
                        const schema = this.tbl_list.selectedItem.data.handle.info.schema;
                        if (!schema)
                            return;
                        const data = [];
                        for (let k in schema.types) {
                            data.push([
                                { text: k },
                                { text: schema.types[k] }
                            ]);
                        }
                        this.grid_scheme.rows = data;
                    }
                };
                this.find("bt-rm-table").onbtclick = async (e) => {
                    try {
                        if (!this.filehandle) {
                            return this.notify(__("Please open a database file"));
                        }
                        if (this.tbl_list.selectedItem == undefined) {
                            return;
                        }
                        const table = this.tbl_list.selectedItem.data.name;
                        const ret = await this.openDialog("YesNoDialog", {
                            title: __("Confirm delete?"),
                            text: __("Do you realy want to delete table: {0}", table)
                        });
                        if (ret) {
                            await this.filehandle.remove(table);
                            this.list_tables();
                        }
                    }
                    catch (e) {
                        this.error(__("Unable to execute action table delete: {0}", e.toString()), e);
                    }
                };
                this.find("bt-add-table").onbtclick = async (e) => {
                    try {
                        if (!this.filehandle) {
                            return this.notify(__("Please open a database file"));
                        }
                        const data = await this.openDialog(new NewTableDialog(), {
                            title: __("Create new table")
                        });
                        this.filehandle.cache = data.schema;
                        await this.filehandle.write(data.name);
                        this.list_tables();
                    }
                    catch (e) {
                        this.error(__("Unable to create table: {0}", e.toString()), e);
                    }
                };
                this.find("btn-edit-record").onbtclick = async (e) => {
                    this.edit_record();
                };
                this.find("btn-add-record").onbtclick = async (e) => {
                    this.add_record();
                };
                this.find("btn-delete-record").onbtclick = async (e) => {
                    this.remove_record();
                };
                this.btn_loadmore.onbtclick = async (e) => {
                    try {
                        await this.load_table();
                    }
                    catch (e) {
                        this.error(__("Error reading table: {0}", e.toString()), e);
                    }
                };
                this.tbl_list.onlistselect = async (_) => {
                    try {
                        if (!this.tbl_list.selectedItem)
                            return;
                        const handle = this.tbl_list.selectedItem.data.handle;
                        await handle.onready();
                        this.last_max_id = 0;
                        const headers = handle.info.schema.fields.map((e) => {
                            return { text: e };
                        });
                        this.grid_table.header = headers;
                        this.grid_table.rows = [];
                        const records = await handle.read({ fields: ["COUNT(*)"] });
                        this.n_records = records[0]["(COUNT(*))"];
                        this.btn_loadmore.text = `0/${this.n_records}`;
                        await this.load_table();
                        this.container.selectedIndex = 1;
                    }
                    catch (e) {
                        this.error(__("Error reading table: {0}", e.toString()), e);
                    }
                };
                this.grid_table.oncelldbclick = async (e) => {
                    this.edit_record();
                };
                this.openFile();
            }
            async add_record() {
                try {
                    const table_handle = this.tbl_list.selectedItem;
                    if (!table_handle) {
                        return;
                    }
                    const file_hd = table_handle.data.handle;
                    const schema = table_handle.data.handle.info.schema;
                    const model = {};
                    for (let k in schema.types) {
                        if (["INTEGER", "REAL", "NUMERIC"].includes(schema.types[k])) {
                            model[k] = 0;
                        }
                        else {
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
                catch (e) {
                    this.error(__("Error edit/view record: {0}", e.toString()), e);
                }
            }
            async remove_record() {
                try {
                    const cell = this.grid_table.selectedCell;
                    const row = this.grid_table.selectedRow;
                    const table_handle = this.tbl_list.selectedItem;
                    if (!cell || !table_handle) {
                        return;
                    }
                    const pk_id = cell.data.record[table_handle.data.handle.info.schema.pk];
                    const ret = await this.openDialog("YesNoDialog", {
                        title: __("Delete record"),
                        text: __("Do you realy want to delete record {0}", pk_id)
                    });
                    if (!ret) {
                        return;
                    }
                    const file_hd = `${table_handle.data.handle.path}@${pk_id}`.asFileHandle();
                    await file_hd.remove();
                    this.n_records--;
                    // remove the target row
                    this.grid_table.delete(row);
                    this.btn_loadmore.text = `${this.grid_table.rows.length}/${this.n_records}`;
                }
                catch (e) {
                    this.error(__("Error deleting record: {0}", e.toString()), e);
                }
            }
            async edit_record() {
                try {
                    const cell = this.grid_table.selectedCell;
                    const row = this.grid_table.selectedRow;
                    const table_handle = this.tbl_list.selectedItem;
                    if (!cell || !table_handle) {
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
                    for (let k of file_hd.info.schema.fields) {
                        let text = data[k];
                        if (text.length > 100) {
                            text = text.substring(0, 100);
                        }
                        row_data.push({
                            text: text,
                            record: data
                        });
                    }
                    row.data = row_data;
                }
                catch (e) {
                    this.error(__("Error edit/view record: {0}", e.toString()), e);
                }
            }
            async load_table() {
                if (this.grid_table.rows && this.grid_table.rows.length >= this.n_records) {
                    return;
                }
                if (!this.tbl_list.selectedItem)
                    return;
                const handle = this.tbl_list.selectedItem.data.handle;
                await handle.onready();
                const headers = handle.info.schema.fields.map((e) => {
                    return { text: e };
                });
                // read all records
                const filter = { where: {}, limit: 10 };
                filter.where[`${handle.info.schema.pk}\$gt`] = this.last_max_id;
                const records = await handle.read(filter);
                if (records && records.length > 0) {
                    for (let e of records) {
                        const row = [];
                        if (e.id && e.id > this.last_max_id) {
                            this.last_max_id = e.id;
                        }
                        for (let v in headers) {
                            let text = e[headers[v].text];
                            if (text.length > 100) {
                                text = text.substring(0, 100);
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
        application.SQLiteDBBrowser = SQLiteDBBrowser;
        SQLiteDBBrowser.dependencies = [
            "pkg://SQLiteDB/libsqlite.js"
        ];
        class NewTableDialog extends OS.GUI.BasicDialog {
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
            main() {
                super.main();
                this.container = this.find("container");
                this.find("btnCancel").onbtclick = (e) => this.quit();
                this.find("btnAdd").onbtclick = (e) => this.addField();
                $(this.container)
                    .css("overflow-y", "auto");
                this.addField();
                this.find("btnOk").onbtclick = (e) => {
                    const input = this.find("txt-tblname");
                    if (!input.value || input.value == "") {
                        return this.notify(__("Please enter table name"));
                    }
                    const tblname = input.value;
                    const inputs = $("input", this.container);
                    const lists = $("afx-list-view", this.container);
                    if (inputs.length == 0) {
                        return this.notify(__("Please define table fields"));
                    }
                    let cdata = {};
                    for (let i = 0; i < inputs.length; i++) {
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
                        this.handle({ name: tblname, schema: cdata });
                    this.quit();
                };
            }
            /**
             * Add new input key-value field to the dialog
             *
             * @private
             * @memberof NewTableDialog
             */
            addField() {
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
                    .appendTo(div)[0];
                list.uify(this.observable);
                list.dropdown = true;
                list.data = [
                    { text: "TEXT" },
                    { text: "INTEGER" },
                    { text: "REAL" },
                    { text: "NUMERIC" },
                ];
                list.selected = 0;
                const btn = $("<afx-button>");
                btn[0].uify(undefined);
                btn[0].iconclass = "fa fa-minus";
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
        class RecordEditDialog extends OS.GUI.BasicDialog {
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
            main() {
                super.main();
                this.container = this.find("container");
                this.find("btnCancel").onbtclick = (e) => this.quit();
                $(this.container)
                    .css("overflow-y", "auto");
                if (!this.data || !this.data.schema) {
                    throw new Error(__("No data provided for dialog").__());
                }
                for (let k in this.data.schema.types) {
                    const input = $("<afx-input>").appendTo(this.container)[0];
                    input.uify(this.observable);
                    input.label = k;
                    if (k == this.data.schema.pk) {
                        input.disable = true;
                    }
                    if (this.data.schema.types[k] == "TEXT") {
                        input.verbose = true;
                        $(input).css("height", "100px");
                    }
                    if (this.data.record[k] != undefined) {
                        input.value = this.data.record[k];
                    }
                }
                this.find("btnOk").onbtclick = (e) => {
                    const inputs = $("afx-input", this.container);
                    const data = {};
                    for (let input of inputs) {
                        data[input.label.__()] = input.value;
                    }
                    if (this.handle)
                        this.handle(data);
                    this.quit();
                };
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
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));


var OS;
(function (OS) {
    let API;
    (function (API) {
        class SQLiteDBCore {
            constructor(path) {
                if (!SQLiteDBCore.REGISTY) {
                    SQLiteDBCore.REGISTY = {};
                }
                this.db_file = path.asFileHandle();
                if (SQLiteDBCore.REGISTY[this.db_file.path]) {
                    this.db_file = SQLiteDBCore.REGISTY[this.db_file.path];
                }
                else {
                    SQLiteDBCore.REGISTY[this.db_file.path] = this.db_file;
                }
            }
            pwd() {
                return "pkg://SQLiteDB/".asFileHandle();
            }
            fileinfo() {
                return this.db_file.info;
            }
            /**
             * init and create the db file if it does not exist
             */
            init() {
                return new Promise(async (ok, reject) => {
                    try {
                        if (this.db_file.ready) {
                            return ok(true);
                        }
                        let request = {
                            action: 'init',
                            args: {
                                db_source: this.db_file.path,
                            }
                        };
                        let _result = await this.call(request);
                        _result = await this.db_file.onready();
                        if (!this.db_file || !this.db_file.ready || this.db_file.info.type !== "file") {
                            throw __("DB file meta-data is invalid: {0}", this.db_file.path).__();
                        }
                        ok(true);
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            call(request) {
                return new Promise(async (ok, reject) => {
                    request.args.db_source = this.db_file.path;
                    let cmd = {
                        path: this.pwd().path + "/api/api.lua",
                        parameters: request
                    };
                    let data = await API.apigateway(cmd, false);
                    if (!data.error) {
                        ok(data.result);
                    }
                    else {
                        reject(API.throwe(__("SQLiteDB server call error: {0}", data.error)));
                    }
                });
            }
            request(rq) {
                return new Promise(async (ok, reject) => {
                    try {
                        if (!this.db_file.ready) {
                            let _ = await this.init();
                        }
                        let result = await this.call(rq);
                        ok(result);
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            select(filter) {
                let rq = {
                    action: 'select',
                    args: {
                        filter
                    }
                };
                return this.request(rq);
            }
            delete_records(filter) {
                let rq = {
                    action: 'delete_records',
                    args: {
                        filter
                    }
                };
                return this.request(rq);
            }
            drop_table(table_name) {
                let rq = {
                    action: 'drop_table',
                    args: { table_name }
                };
                return this.request(rq);
            }
            list_tables() {
                let rq = {
                    action: 'list_table',
                    args: {}
                };
                return this.request(rq);
            }
            create_table(table, scheme) {
                let rq = {
                    action: 'create_table',
                    args: {
                        table_name: table,
                        scheme
                    }
                };
                return this.request(rq);
            }
            get_table_scheme(table_name) {
                let rq = {
                    action: 'table_scheme',
                    args: {
                        table_name
                    }
                };
                return this.request(rq);
            }
            insert(table_name, record, pk) {
                let rq = {
                    action: 'insert',
                    args: {
                        table_name,
                        record,
                        pk
                    }
                };
                return this.request(rq);
            }
            update(table_name, record, pk) {
                let rq = {
                    action: 'update',
                    args: {
                        table_name,
                        record,
                        pk
                    }
                };
                return this.request(rq);
            }
            last_insert_id() {
                let rq = {
                    action: 'last_insert_id',
                    args: {}
                };
                return this.request(rq);
            }
        }
        let VFS;
        (function (VFS) {
            /**
             * SQLite VFS handle for database accessing
             *
             * A Sqlite file handle shall be in the following formats:
             * * `sqlite://remote/path/to/file.db` refers to the entire databale (`remote/path/to/file.db` is relative to the home folder)
             *      - read operation, will list all available tables
             *      - write operations will create table
             *      - rm operation will delete table
             *      - meta operation will return file info
             *      - other operations are not supported
             * * `sqlite://remote/path/to/file.db@table_name` refers to the table `table_name` in the database
             *      - meta operation will return fileinfo with table scheme information
             *      - read operation will read all records by filter defined by the filter as parameters
             *      - write operations will insert a new record
             *      - rm operation will delete records by filter as parameters
             *      - other operations are not supported
             * - `sqlite://remote/path/to/file.db@table_name@id` refers to a records in `table_name` with ID `id`
             *      - read operation will read the current record
             *      - write operation will update current record
             *      - rm operation will delete current record
             *      - other operations are not supported
             *
             * Example of filter:
             * ```ts
            * {
            * table_name:'contacts';
            *  where: {
            *      id$gte: 10,
            *      user: "dany'",
            *      $or: {
            *          'user.email': "test@mail.com",
            *          age$lte: 30,
            *          $and: {
            *              'user.birth$ne': 1986,
            *              age$not_between: [20,30],
            *              name$not_like: "%LE"
            *          }
            *      }
            *  },
            *  fields: ['name as n', 'id', 'email'],
            *  order: ['user.name$asc', "id$desc"],
            *  joins: {
            *      cid: 'Category.id',
            *      did: 'Country.id',
            *      uid: "User.id"
            *  }
            *}
            * ```
            * This will generate the followings expressions:
            * - `( self.name as n,self.id,self.email )` for fields
            * - condition:
            * ```
            * (
            *      ( contacts.id >= 10 ) AND
            *      ( contacts.user = 'dany''' ) AND
            *      (
            *          ( user.email = 'test@mail.com' ) OR
            *          ( contacts.age <= 30 ) OR
            *          (
            *              ( user.birth != 1986 ) AND
            *              ( contacts.age NOT BETWEEN 20 AND 30 ) AND
            *              ( contacts.name NOT LIKE '%LE' )
            *          )
            *      )
            *  )
            * ```
            *  - order: `user.name ASC,contacts.id DESC`
            *  - joining:
            * ```
            *  INNER JOIN Category ON contacts.cid = Category.id
            *  INNER JOIN Country ON contacts.did = Country.id
            *  INNER JOIN Country ON contacts.did = Country.id
            * ```
             *
             * @class SqliteFileHandle
             * @extends {BaseFileHandle}
             */
            class SqliteFileHandle extends VFS.BaseFileHandle {
                /**
                 * Set a file path to the current file handle
                 *
                 *
                 * @param {string} p
                 * @returns {void}
                 * @memberof SqliteFileHandle
                 */
                setPath(p) {
                    let arr = p.split("@");
                    super.setPath(arr[0]);
                    if (arr.length > 3) {
                        throw new Error(__("Invalid file path").__());
                    }
                    this.path = p;
                    this._table_name = arr[1];
                    this._id = arr[2] ? parseInt(arr[2]) : undefined;
                    this._handle = new SQLiteDBCore(`home://${this.genealogy.join("/")}`);
                }
                /**
                 * Read database file meta-data
                 *
                 * Return file info on the target database file, if the table_name is specified
                 * return also the table scheme
                 *
                 * @returns {Promise<RequestResult>}
                 * @memberof SqliteFileHandle
                 */
                meta() {
                    return new Promise(async (resolve, reject) => {
                        try {
                            await this._handle.init();
                            let d = {
                                result: {
                                    file: this._handle.fileinfo(),
                                    schema: undefined
                                }, error: false
                            };
                            if (this._table_name) {
                                const data = await this._handle.get_table_scheme(this._table_name);
                                if (data.length == 0) {
                                    d.result.schema = undefined;
                                }
                                else {
                                    d.result.schema = {
                                        fields: [],
                                        types: {},
                                        pk: undefined
                                    };
                                    d.result.schema.fields = data.map(e => e.name);
                                    for (let v of data) {
                                        d.result.schema.types[v.name] = v.type;
                                        if (v.pk) {
                                            d.result.schema.pk = v.name;
                                        }
                                    }
                                }
                            }
                            return resolve(d);
                        }
                        catch (e) {
                            return reject(__e(e));
                        }
                    });
                }
                /**
                 * Query the database based on the provided info
                 *
                 * If no table is provided, return list of tables in the
                 * data base.
                 * If the current table is specified:
                 *      - if the record id is specfied return the record
                 *      - otherwise, return the records in the table using the specified filter
                 *
                 * @protected
                 * @param {any} t filter type
                 * @returns {Promise<any>}
                 * @memberof SqliteFileHandle
                 */
                _rd(user_data) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (this._table_name && !this.info.schema) {
                                throw new Error(__("Table `{0}` does not exists in database: {1}", this._table_name, this.path).__());
                            }
                            if (!this._table_name) {
                                // return list of tables in form of data base file handles in ready mode
                                let list = await this._handle.list_tables();
                                const map = {};
                                for (let v of list) {
                                    map[v.name] = `${this.path}@${v.name}`.asFileHandle();
                                }
                                this.cache = map;
                                resolve(map);
                            }
                            else {
                                // return all the data in the table set by the filter
                                // if this is a table, return the filtered records
                                // otherwise, it is a record, fetch only that record
                                let filter = user_data;
                                if (!filter || this._id) {
                                    filter = {};
                                }
                                filter.table_name = this._table_name;
                                if (this._id) {
                                    filter.where = { id: this._id };
                                }
                                let data = await this._handle.select(filter);
                                if (this._id) {
                                    this.cache = data[0];
                                }
                                else {
                                    this.cache = data;
                                }
                                resolve(this.cache);
                            }
                        }
                        catch (e) {
                            return reject(__e(e));
                        }
                    });
                }
                /**
                 * Write commit file cache to the remote database
                 *
                 * @protected
                 * @param {string} t is table name, used only when create table
                 * @returns {Promise<RequestResult>}
                 * @memberof SqliteFileHandle
                 */
                _wr(t) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (!this.cache) {
                                throw new Error(__("No data to submit to remote database, please check the `cache` field").__());
                            }
                            await this.onready();
                            if (this._id && this._table_name) {
                                this.cache.id = this._id;
                                const ret = await this._handle.update(this._table_name, this.cache, this.info.schema.pk);
                                resolve({ result: ret, error: false });
                                return;
                            }
                            if (this._table_name) {
                                const ret = await this._handle.insert(this._table_name, this.cache, this.info.schema.pk);
                                resolve({ result: ret, error: false });
                                return;
                            }
                            // create a new table with the scheme provided in the cache
                            let r = await this._handle.create_table(t, this.cache);
                            resolve({ result: r, error: false });
                        }
                        catch (e) {
                            return reject(__e(e));
                        }
                    });
                }
                /**
                 * Delete data from remote database
                 *
                 * @protected
                 * @param {any} user_data is table name, for delete table, otherwise, filter object for deleting records
                 * @returns {Promise<RequestResult>}
                 * @memberof SqliteFileHandle
                 */
                _rm(user_data) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (this._table_name && !this.info.schema) {
                                throw new Error(__("Table `{0}` does not exists in database: {1}", this._table_name, this.path).__());
                            }
                            if (!this._table_name) {
                                let table_name = user_data;
                                if (!table_name) {
                                    throw new Error(__("No table specified for dropping").__());
                                }
                                let ret = await this._handle.drop_table(table_name);
                                resolve({ result: ret, error: false });
                                // delete the table
                            }
                            else {
                                let filter = user_data;
                                // delete the records in the table using the filter
                                if (!filter || this._id) {
                                    filter = {};
                                }
                                filter.table_name = this._table_name;
                                if (this._id) {
                                    filter.where = { id: this._id };
                                }
                                let ret = await this._handle.delete_records(filter);
                                resolve({ result: ret, error: false });
                            }
                        }
                        catch (e) {
                            return reject(__e(e));
                        }
                    });
                }
            }
            VFS.register("^sqlite$", SqliteFileHandle);
        })(VFS = API.VFS || (API.VFS = {}));
    })(API = OS.API || (OS.API = {}));
})(OS || (OS = {}));
