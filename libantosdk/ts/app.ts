namespace OS {
    export namespace application {
        class Logger {

            /**
             * Referent to the log container
             *
             * @private
             * @type {HTMLElement}
             * @memberof Logger
             */
            private target: HTMLElement;


            /**
             * Creates an instance of Logger.
             * @param {HTMLElement} el target container
             * @memberof Logger
             */
            constructor(el: HTMLElement) {
                this.target = el;
            }

            /**
             * Log level info
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            info(s: string | FormattedString): void {
                this.log("info", s, true);
            }

            /**
             * Log level warning
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            warn(s: string | FormattedString): void {
                this.log("warn", s, true);
            }

            /**
             * Log level error
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            error(s: string | FormattedString): void {
                this.log("error", s, true);
            }


            /**
             * Log a string to target container
             *
             * @private
             * @param {string} c class name of the appended log element
             * @param {string|FormattedString} s log string
             * @param {boolean} showtime define whether the logger should insert datetime prefix
             * in the log string
             * @memberof Logger
             */
            private log(c: string, s: string | FormattedString, showtime: boolean): void {
                let el = $("<pre></pre>")
                    .attr("class", `sdk-log-${c}`);
                if (showtime) {
                    let date = new Date();
                    let prefix = date.getDate() + "/"
                        + (date.getMonth() + 1) + "/"
                        + date.getFullYear() + " "
                        + date.getHours() + ":"
                        + date.getMinutes() + ":"
                        + date.getSeconds();
                    el.text(`[${prefix}]: ${s.__()}`);
                }
                else {
                    el.text(s.__());
                }
                $(this.target).append(el);
                $(this.target).scrollTop($(this.target)[0].scrollHeight);
            }

            /**
             * Print a log message without prefix
             *
             * @param {string|FormattedString} s text to print
             * @memberof Logger
             */
            print(s: string | FormattedString): void {
                if(s.match(/warn/i))
                {
                    this.log("warn", s, false);
                }
                else if(s.match(/error/i))
                {
                    this.log("error", s, false);
                }
                else
                {
                    this.log("info", s, false);
                }
            }

            /**
             * Empty the log container
             *
             * @memberof Logger
             */
            clear(): void {
                $(this.target).empty();
            }
        }
        /**
         *
         * @class SDKBuilder
         * @extends {BaseApplication}
         */
        export class SDKBuilder extends BaseApplication {
            private sdk: API.AntOSDKBuilder;
            private logger: Logger;
            private filehandle: OS.API.VFS.BaseFileHandle;
            private options: GenericObject<any>;
            private targets: OS.GUI.tag.ListViewTag;
            constructor(args: AppArgumentsType[]) {
                super("SDKBuilder", args);
            }
            main(): void {
                this.logger = new Logger(this.find("container"));
                this.sdk = new API.AntOSDKBuilder(this.logger,"");
                this.filehandle = undefined;
                this.options = undefined;
                this.targets = this.find("target-list") as OS.GUI.tag.ListViewTag;
                if(this.args && this.args.length > 0)
                    this.filehandle = this.args[0].path.asFileHandle();

                (this.find("btnbuild") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    const selected = this.targets.selectedItem;
                    if(!selected)
                        return;
                    this.load(this.compile([selected.data.text])).catch((e) => this.logger.error(__(e.stack)));
                }

                (this.find("btnclear") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    this.logger.clear();
                }

                (this.find("btnrefresh") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    this.open();
                }
                (this.find("btnopen") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    try{
                        const d = await this.openDialog("FileDialog", {
                            title: __("Select build file"),
                            mimes: this.meta().mimes
                        });
                        this.filehandle = d.file.path.asFileHandle();
                        this.open();
                    }
                    catch(error)
                    {
                        this.logger.error(error.toString());
                    }
                }
                this.open();
            }
            
            private open(): void {
                if(this.filehandle === undefined)
                {
                    return;
                }
                this.filehandle
                    .read("json")
                    .then((data) => {
                        if(! data.targets)
                        {
                            return this.logger.error(
                                __("Invalid build file: {0}", this.filehandle.path)
                            );
                        }
                        const targets = Object.keys(data.targets).map(e =>{
                            return {text: e};
                        } );
                        (this.scheme as GUI.tag.WindowTag).apptitle = this.filehandle.path;
                        this.options = data;
                        this.options.root = this.filehandle.parent().path;
                        this.targets.data = targets;
                        this.logger.info(__("Loaded: {0}", this.filehandle.path));
                    })
                    .catch((e) => this.logger.error(
                        __("Unable to load build file: {0}: {1}", this.filehandle.path, e.toString())));
            }

            private compile(stages: string[]): Promise<string> {
                return new Promise( async (resolve, reject) => {
                    try {
                        this.logger.clear();
                        await this.sdk.batch(stages,this.options);
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