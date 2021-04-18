namespace OS {
    export namespace application {
        /**
         *
         * @class libantosdk
         * @extends {BaseApplication}
         */
        export class libantosdk extends BaseApplication {
            private sdk: API.AntOSDKBuilder;
            constructor(args: AppArgumentsType[]) {
                super("libantosdk", args);
            }
            main(): void {
                this.sdk = new API.AntOSDKBuilder(
                    {
                        info: (d) => console.log(d),
                        error: (d) => console.error(d)
                    },
                    "home://workspace/antosdk-apps/libantosdk");
                (this.find("btnsend") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    this.openDialog("PromptDialog", {
                        label: "Stages",
                        value: "build,uglify,copy"
                    }).then(v => {
                        this.load(this.compile(v.split(",")));
                    })
                    
                }
            }
            
            compile(stages): Promise<string> {
                return new Promise( async (resolve, reject) => {
                    try {
                       const options = await "home://workspace/antosdk-apps/libantosdk/build.json".asFileHandle().read("json");
                       await this.sdk.batch(stages,options);
                       resolve("OK");
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                    
                })
            }
        }
    }
}