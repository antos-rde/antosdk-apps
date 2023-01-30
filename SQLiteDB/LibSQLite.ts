namespace OS {
    export namespace API
    {
        export class SQLiteDBBase {
            private db_file: VFS.BaseFileHandle;

            constructor(path: VFS.BaseFileHandle | string)
            {
                this.db_file = path.asFileHandle();
            }

            private pwd(): VFS.BaseFileHandle
            {
                return "pkg://SQLiteDB/".asFileHandle();
            }
            /**
             * init and create the db file if it does not exist
             */
            private init(): Promise<any>
            {
                return new Promise(async (ok, reject) => {
                    try{
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
            query(sql: string): Promise<any>
            {
                let rq = {
                    action: 'query',
                    args: {
                        query: sql
                    }
                }
                return this.request(rq);
            }

            select(table: string, fields: string[], condition: string): Promise<GenericObject<any>[]>
            {
                let rq = {
                    action: 'select',
                    args: {
                        table: table,
                        fields: fields.join(","),
                        cond: condition
                    }
                }
                return this.request(rq);
            }

            list_tables(): Promise<string[]>
            {
                return new Promise(async (ok, reject) => {
                    try {
                        let result = await this.select(
                            "sqlite_master", ["name"], "type ='table'");
                        return ok(result.map((e) => e.name))
                    }
                    catch(e)
                    {
                        reject(__e(e))
                    }
                });
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
    }
}