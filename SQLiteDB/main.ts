namespace OS {
    export namespace application {
        interface SQLiteDBBaseConstructor{
            new(pqth: API.VFS.BaseFileHandle| string): SQLiteDBBase;
        };
        interface SQLiteDBBase{
            list_tables(): Promise<Array<string>>,
            last_insert_id(): Promise<number>,
            query(sql): Promise<any>
        };
        /**
         *
         * @class SQLiteDB
         * @extends {BaseApplication}
         */
        export class SQLiteDB extends BaseApplication {
            constructor(args: AppArgumentsType[]) {
                super("SQLiteDB", args);
            }
            main(): void {
                // YOUR CODE HERE
                let handle = new ((OS.API as any).SQLiteDBBase as SQLiteDBBaseConstructor)("home://tmp/test.db");
                handle.list_tables().then((list) => {
                    console.log(list);
                    if(list.indexOf("contacts") < 0)
                    {
                        handle.query("CREATE TABLE contacts (id INTEGER PRIMARY KEY,first_name TEXT NOT NULL,last_name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,phone TEXT NOT NULL UNIQUE)");
                    }
                });
                handle.last_insert_id().then(o => console.log(o));
            }
        }
    }
}