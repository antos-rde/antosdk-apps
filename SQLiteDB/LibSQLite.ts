namespace OS {
    export namespace API
    {
        /**
         * Generate SQL expression from input object
         * 
         * Example of input object
         * ```ts
         * { 
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
         *      did: 'Country.id'
         *  }
         *}
         * ```
         * This will generate the followings expressions:
         * - `( self.name as n,self.id,self.email )` for fields
         * - condition: 
         * ```
         * ( 
         *      ( self.id >= 10 ) AND
         *      ( self.user = 'dany''' ) AND 
         *      ( 
         *          ( user.email = 'test@mail.com' ) OR 
         *          ( self.age <= 30 ) OR 
         *          ( 
         *              ( user.birth != 1986 ) AND 
         *              ( self.age NOT BETWEEN 20 AND 30 ) AND 
         *              ( self.name NOT LIKE '%LE' )
         *          )
         *      )
         *  )
         * ```
         *  - order: `user.name ASC,self.id DESC`
         *  - joining: 
         * ```
         *  INNER JOIN Category ON self.cid = Category.id
         *  INNER JOIN Country ON self.did = Country.id
         * ```
         * 
         */
        class SQLiteQueryGenerator {
            private _where: string;
            private _fields: string;
            private _order: string;
            private _joins: string;
            private _is_joining: boolean;
            constructor(obj: GenericObject<any>)
            {
                this._where = undefined;
                this._fields = undefined;
                this._order = undefined;
                this._joins = undefined;
                this._is_joining = false;
                if(obj.joins)
                {
                    this._is_joining = true;
                    this._joins = this.joins(obj.joins);
                }

                if(obj.where)
                {
                    this._where = this.where("$and", obj.where);
                }
                if(obj.fields)
                {
                    this._fields = `( ${obj.fields.map(v=>this.infer_field(v)).join(",")} )`;
                }
                if(obj.order)
                {
                    this._order = this.order_by(obj.order);
                }
            }

            private infer_field(k: string) : string
            {
                if(!this._is_joining || k.indexOf(".") > 0) return k;
                return `self.${k}`;
            }

            private joins(data: GenericObject<any>): string
            {
                let joins_arr = [];
                for(let k in data)
                {
                    let v = data[k];
                    let arr = v.split('.')
                    if(arr.length != 2)
                    {
                        throw new Error(__("Other table name parsing error: {0}", v).__());
                    }
                    joins_arr.push(`INNER JOIN ${arr[0]} ON ${this.infer_field(k)} = ${v}`);
                }
                return joins_arr.join(" ");
            }

            print()
            {
                console.log(this._fields);
                console.log(this._where);
                console.log(this._order);
                console.log(this._joins);
            }

            private order_by(order: string[]): string
            {
                if(! Array.isArray(order))
                {
                    throw new Error(__("Invalid type: expect array get {0}", typeof(order)).__());

                }
                return order.map((v,_) => {
                    const arr = v.split('$');
                    if(arr.length != 2)
                    {
                        throw new Error(__("Invalid field order format {0}", v).__());
                    }
                    switch(arr[1])
                    {
                        case 'asc': return `${this.infer_field(arr[0])} ASC`;
                        case 'desc': return `${this.infer_field(arr[0])} DESC`;
                        default: throw new Error(__("Invalid field order type {0}", v).__());
                    }
                }).join(",");
            }

            private escape_string(s: string)
            {
                let regex = /[']/g;
                var chunkIndex =  regex.lastIndex = 0;
                var escapedVal = '';
                var match;

                while ((match =  regex.exec(s))) {
                    escapedVal += s.slice(chunkIndex, match.index) +  {'\'': '\'\''}[match[0]];
                    chunkIndex = regex.lastIndex;
                }

                if (chunkIndex === 0) {
                    // Nothing was escaped
                    return "'" + s + "'";
                }

                if (chunkIndex < s.length) {
                    return "'" + escapedVal + s.slice(chunkIndex) + "'";
                }

                return "'" + escapedVal + "'";
            }

            private parse_value(v:any, t: string[]): string
            {
                if(! (t as any).includes(typeof(v)))
                {
                    throw new Error(__("Invalid type: expect [{0}] get {1}", t.join(","), typeof(v)).__());
                }
                switch(typeof(v))
                {
                    case 'number': return JSON.stringify(v);
                    case 'string': return this.escape_string(v);
                    default: throw new Error(__("Un supported value {0} of type {1}", v, typeof(v)).__());
                }
            }

            private binary(k: string,v :any)
            {
                const arr = k.split("$");
                if(arr.length > 2)
                {
                    throw new Error(__("Invalid left hand side format: {0}", k).__());
                }
                if(arr.length == 2)
                {
                    switch(arr[1])
                    {
                        case "gt":
                            return `( ${this.infer_field(arr[0])} > ${this.parse_value(v, ['number'])} )`;
                        case "gte":
                            return `( ${this.infer_field(arr[0])} >= ${this.parse_value(v, ['number'])} )`;
                        case "lt":
                            return `( ${this.infer_field(arr[0])} < ${this.parse_value(v, ['number'])} )`;
                        case "lte":
                            return `( ${this.infer_field(arr[0])} <= ${this.parse_value(v, ['number'])} )`;
                        case "ne":
                            return `( ${this.infer_field(arr[0])} != ${this.parse_value(v, ['number', 'string'])} )`;
                        case "between":
                            return `( ${this.infer_field(arr[0])} BETWEEN ${this.parse_value(v[0],['number'])} AND ${this.parse_value(v[1],['number'])} )`;
                        case "not_between":
                            return `( ${this.infer_field(arr[0])} NOT BETWEEN ${this.parse_value(v[0],['number'])} AND ${this.parse_value(v[1],['number'])} )`;
                        case "in":
                            return `( ${this.infer_field(arr[0])} IN [${this.parse_value(v[0],['number'])}, ${this.parse_value(v[1],['number'])}] )`;
                        case "not_in":
                            return `( ${this.infer_field(arr[0])} NOT IN [${this.parse_value(v[0],['number'])}, ${this.parse_value(v[1],['number'])}] )`;
                        case "like":
                            return `( ${this.infer_field(arr[0])} LIKE ${this.parse_value(v,['string'])} )`;
                        case "not_like":
                            return `( ${this.infer_field(arr[0])} NOT LIKE ${this.parse_value(v,['string'])} )`;
                        default: throw new Error(__("Unsupported operator `{0}`", arr[1]).__());
                    }
                }
                else
                {
                    return `( ${this.infer_field(arr[0])} = ${this.parse_value(v, ['number', 'string'])} )`;
                }

            }

            private where(op:string, obj: GenericObject<any>): string
            {
                let join_op = undefined;
                switch(op)
                {
                    case "$and":
                        join_op = " AND ";
                        break;
                    case "$or":
                        join_op = " OR ";
                        break;
                    default:
                        throw new Error(__("Invalid operator {0}", op).__());
                }

                if(typeof obj !== "object")
                {
                    throw new Error(__("Invalid input data for operator {0}", op).__());
                }

                let arr = [];
                for(let k in obj){
                    if(k == "$and" || k=="$or")
                    {
                        arr.push(this.where(k, obj[k]));
                    }
                    else
                    {
                        arr.push(this.binary(k, obj[k]));
                    }
                }
                return `( ${arr.join(join_op)} )`;
            }
        }
        class SQLiteDBCore {
            static REGISTY: GenericObject<VFS.BaseFileHandle>;

            private db_file: VFS.BaseFileHandle;

            constructor(path: VFS.BaseFileHandle | string)
            {
                if(!SQLiteDBCore.REGISTY)
                {
                    SQLiteDBCore.REGISTY = {};
                }
                this.db_file = path.asFileHandle();
                if(SQLiteDBCore.REGISTY[this.db_file.path])
                {
                    this.db_file = SQLiteDBCore.REGISTY[this.db_file.path];
                }
                else
                {
                    SQLiteDBCore.REGISTY[this.db_file.path] = this.db_file;
                }
            }

            private pwd(): VFS.BaseFileHandle
            {
                return "pkg://SQLiteDB/".asFileHandle();
            }

            fileinfo(): FileInfoType
            {
                return this.db_file.info;
            }
            /**
             * init and create the db file if it does not exist
             */
            init(): Promise<any>
            {
                return new Promise(async (ok, reject) => {
                    try{
                        if(this.db_file.ready)
                        {
                            return ok(true);
                        }
                        let request = {
                            action: 'init',
                            args: {
                                db_source: this.db_file.path,
                            }
                        }
                        let _result = await this.call(request);
                        _result = await this.db_file.onready();
                        if(!this.db_file || !this.db_file.ready || this.db_file.info.type !== "file")
                        {
                            throw __("DB file meta-data is invalid: {0}", this.db_file.path).__();
                        }
                        ok(true);
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                });
            }

            private call(request: GenericObject<any>): Promise<any> {
                return new Promise(async (ok, reject) => {
                    request.args.db_source = this.db_file.path;
                    let cmd = {
                        path: this.pwd().path + "/api/api.lua",
                        parameters: request
                    }
                    let data = await API.apigateway(cmd, false);
                    if(!data.error)
                    {
                        ok(data.result);
                    }
                    else
                    {
                        reject(API.throwe(__("SQLiteDB server call error: {0}", data.error)));
                    }
                });
            }

            private request(rq: GenericObject<any>): Promise<any>
            {
                return new Promise(async (ok, reject) => {
                    try{
                        if(!this.db_file.ready)
                        {
                            let _ = await this.init();
                        }
                        let result = await this.call(rq);
                        ok(result);
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                });
            }

            select(filter: GenericObject<any>): Promise<any>
            {
                let rq = {
                    action: 'select',
                    args: {
                        filter
                    }
                }
                return this.request(rq);
            }

            delete_records(filter: GenericObject<any>): Promise<any>
            {
                let rq = {
                    action: 'delete_records',
                    args: {
                        filter
                    }
                }
                return this.request(rq);
            }

            drop_table(table_name: string): Promise<any>
            {
                let rq = {
                    action: 'drop_table',
                    args:{table_name}
                }
                return this.request(rq);
            }

            list_tables(): Promise<any>
            {
                let rq = {
                    action: 'list_table',
                    args: {}
                }
                return this.request(rq);
            }

            create_table(table, scheme): Promise<any>
            {
                let rq = {
                    action: 'create_table',
                    args: {
                        table_name: table,
                        scheme
                    }
                }
                return this.request(rq);
            }
            
            get_table_scheme(table_name:string): Promise<any>
            {
                let rq = {
                    action: 'table_scheme',
                    args: {
                        table_name
                    }
                }
                return this.request(rq);
            }
            
            insert(table_name:string, record: GenericObject<any>): Promise<any>
            {
                let rq = {
                    action: 'insert',
                    args: {
                        table_name,
                        record
                    }
                }
                return this.request(rq);
            }

            update(table_name:string, record: GenericObject<any>): Promise<any>
            {
                let rq = {
                    action: 'update',
                    args: {
                        table_name,
                        record
                    }
                }
                return this.request(rq);
            }

            last_insert_id(): Promise<number>
            {
                let rq = {
                    action: 'last_insert_id',
                    args: {
                    }
                }
                return this.request(rq);
            }
        }
        export namespace VFS {
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
             *      - read operation will read all records by filter defined by the filter operation
             *      - write operations will insert a new record
             *      - rm operation will delete records by filter defined by the filter operation
             *      - filter operation sets the filter for the table
             *      - other operations are not supported
             * - `sqlite://remote/path/to/file.db@table_name@id` refers to a records in `table_name` with ID `id`
             *      - read operation will read the current record
             *      - write operation will update current record
             *      - rm operation will delete current record
             *      - other operations are not supported
             * 
             * Some example of filters:
             * ```ts
             *  handle.filter = (filter) => {
             *      filter.fields()
             *  }
             * ```
             * 
             * @class SqliteFileHandle
             * @extends {BaseFileHandle}
             */
            class SqliteFileHandle extends BaseFileHandle
            {
                private _handle: SQLiteDBCore;
                private _table_name: string;
                private _id: number;

                /**
                 * Set a file path to the current file handle
                 * 
                 *
                 * @param {string} p
                 * @returns {void}
                 * @memberof SqliteFileHandle
                 */
                setPath(p: string): void {
                    let arr = p.split("@");
                    super.setPath(arr[0]);
                    if(arr.length > 3)
                    {
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
                meta(): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try {
                            await this._handle.init();
                            
                            const d = {result: this._handle.fileinfo(), error: false};
                            if(this._table_name)
                            {
                                const data = await this._handle.get_table_scheme(this._table_name);
                                if(data.length == 0)
                                {
                                    d.result.scheme = undefined
                                }
                                else
                                {
                                    d.result.scheme = {}
                                    for(let v of data)
                                    {
                                        d.result.scheme[v.name] = v.type;
                                    }
                                }
                            }
                            return resolve(d);
                        } catch (e) {
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
                protected _rd(user_data: any): Promise<any> {
                    return new Promise(async (resolve, reject) => {
                        try{
                            if(this._table_name && ! this.info.scheme)
                            {
                                throw new Error(__("Table `{0}` does not exists in database: {1}", this._table_name, this.path).__());
                            }
                            if(!this._table_name)
                            {
                                // return list of tables in form of data base file handles in ready mode
                                let list = await this._handle.list_tables();
                                const map = {} as GenericObject<BaseFileHandle>;
                                for(let v of list)
                                {
                                    map[v.name] = `${this.path}@${v.name}`.asFileHandle();
                                }
                                this.cache = map;
                                resolve(map);
                            }
                            else
                            {
                                // return all the data in the table set by the filter
                                // if this is a table, return the filtered records
                                // otherwise, it is a record, fetch only that record
                                let filter = user_data;
                                if(!filter || this._id)
                                {
                                    filter = {};
                                }
                                filter.table_name = this._table_name;
                                if(this._id)
                                {
                                    filter.where = { id: this._id};
                                }
                                let data = await this._handle.select(filter);
                                if(this._id)
                                {
                                    this.cache = data[0];
                                }
                                else
                                {
                                    this.cache = data;
                                }
                                resolve(this.cache)
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
                protected _wr(t: string): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try{
                            if(!this.cache)
                            {
                                throw new Error(__("No data to submit to remote database, please check the `cache` field").__());
                            }
                            if(this._id && this._table_name)
                            {
                                this.cache.id = this._id;
                                const ret = await this._handle.update(this._table_name, this.cache);
                                resolve({result:ret, error: false});
                                return
                            }

                            if(this._table_name)
                            {
                                const ret = await this._handle.insert(this._table_name, this.cache);
                                resolve({result:ret, error: false});
                                return
                            }
                            // create a new table with the scheme provided in the cache
                            let r = await this._handle.create_table(t, this.cache);
                            resolve({result: r, error: false});

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
                protected _rm(user_data: any): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if(this._table_name && ! this.info.scheme)
                            {
                                throw new Error(__("Table `{0}` does not exists in database: {1}", this._table_name, this.path).__());
                            }
                            if(!this._table_name)
                            {
                                let table_name = user_data as string;
                                if (!table_name)
                                {
                                    throw new Error(__("No table specified for dropping").__());
                                }
                                let ret = await this._handle.drop_table(table_name);
                                resolve({result: ret, error: false});
                                // delete the table
                            }
                            else
                            {
                                let filter = user_data as GenericObject<any>;
                                // delete the records in the table using the filter
                                if(!filter || this._id)
                                {
                                    filter = {};
                                }
                                filter.table_name = this._table_name;
                                if(this._id)
                                {
                                    filter.where = { id: this._id};
                                }
                                let ret = await this._handle.delete_records(filter);
                                resolve({result: ret, error: false});
                            }
                        } catch (e) {
                            return reject(__e(e));
                        }
                    });
                }
            }
            register("^sqlite$", SqliteFileHandle);
        }
    }
}