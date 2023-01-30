
var OS;
(function (OS) {
    let API;
    (function (API) {
        class SQLiteDBBase {
            constructor(path) {
                this.db_file = path.asFileHandle();
            }
            pwd() {
                return "pkg://SQLiteDB/".asFileHandle();
            }
            /**
             * init and create the db file if it doesnot exist
             */
            init() {
                return new Promise(async (ok, reject) => {
                    try {
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
            query(sql) {
                let rq = {
                    action: 'query',
                    args: {
                        query: sql
                    }
                };
                return this.request(rq);
            }
            select(table, fields, condition) {
                let rq = {
                    action: 'select',
                    args: {
                        table: table,
                        fields: fields.join(","),
                        cond: condition
                    }
                };
                return this.request(rq);
            }
            list_tables() {
                return new Promise(async (ok, reject) => {
                    try {
                        let result = await this.select("sqlite_master", ["name"], "type ='table'");
                        return ok(result.map((e) => e.name));
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            last_insert_id() {
                let rq = {
                    action: 'last_insert_id',
                    args: {}
                };
                return this.request(rq);
            }
        }
        API.SQLiteDBBase = SQLiteDBBase;
    })(API = OS.API || (OS.API = {}));
})(OS || (OS = {}));
