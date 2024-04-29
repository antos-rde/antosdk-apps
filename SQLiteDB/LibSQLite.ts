namespace OS {
    export namespace API
    {
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

            create_table(table: string, scheme: GenericObject<string>): Promise<any>
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
            
            insert(table_name:string, record: GenericObject<any>, pk:string): Promise<any>
            {
                let rq = {
                    action: 'insert',
                    args: {
                        table_name,
                        record,
                        pk
                    }
                }
                return this.request(rq);
            }

            update(table_name:string, record: GenericObject<any>, pk:string ): Promise<any>
            {
                let rq = {
                    action: 'update',
                    args: {
                        table_name,
                        record,
                        pk
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
            *           age: [15, 20, 25],
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
            *           ( contacts.age = 15 ) OR 
            *           ( contacts.age = 20 ) OR
            *           ( contacts.age = 25 ) OR
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
                            
                            let d = {
                                result: {
                                    file:this._handle.fileinfo(),
                                    schema: undefined
                                }, error: false};
                            if(this._table_name)
                            {
                                const data = await this._handle.get_table_scheme(this._table_name);
                                if(data.length == 0)
                                {
                                    d.result.schema = undefined
                                }
                                else
                                {
                                    d.result.schema = {
                                        fields: [],
                                        types: {},
                                        pk: undefined
                                    }
                                    d.result.schema.fields = data.map(e=>e.name);
                                    for(let v of data)
                                    {
                                        d.result.schema.types[v.name] = v.type;
                                        if(v.pk)
                                        {
                                            d.result.schema.pk = v.name;
                                        }
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
                            if(this._table_name && ! this.info.schema)
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
                                    filter.where = {};
                                    filter.where[this.info.schema.pk] = this._id;
                                }
                                let data: GenericObject<any>[] = await this._handle.select(filter);
                                if(this._id)
                                {
                                    this.cache = data[0];
                                }
                                else
                                {
                                    for(let row of data)
                                    {
                                        if(row[this.info.schema.pk])
                                        {
                                            Object.defineProperty(row, '$vfs', {
                                                value: `${this.path}@${row[this.info.schema.pk]}`.asFileHandle(),
                                                enumerable: false,
                                                configurable: false
                                            })
                                        }
                                    }
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
                            await this.onready();
                            if(this._id && this._table_name)
                            {
                                this.cache[this.info.schema.pk] = this._id;
                                const ret = await this._handle.update(this._table_name, this.cache, this.info.schema.pk);
                                resolve({result:ret, error: false});
                                return
                            }

                            if(this._table_name)
                            {
                                const ret = await this._handle.insert(this._table_name, this.cache, this.info.schema.pk);
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
                            if(this._table_name && ! this.info.schema)
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
                                    filter.where = {};
                                    filter.where[this.info.schema.pk] = this._id;
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