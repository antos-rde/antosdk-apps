namespace OS {

    export namespace application {
        declare var Antunnel: any;
        interface SyslogMessage {
            timestamp: string;
            tag: string;
            severity_label: string;
            severity: number;
            relayip?: string;
            relayhost?: string;
            program: string;
            priority: number;
            message: string;
            logsource?: string;
            hostname?: string;
            facility_label: string;
            facility: number;
            end_msg?: string;
            type?: string;
            el: JQuery<HTMLElement>;
        };
        interface SyslogFilter {
            max_log: number;
            err: boolean;
            debug: boolean;
            info: boolean;
            notice: boolean;
            warning: boolean;
            crit: boolean;
            alert: boolean;
            emerg: boolean;
            pattern?: RegExp;
            record: boolean;
        };
        /**
         *
         * @class ServerLogClient
         * @extends {BaseApplication}
         */
        export class ServerLogClient extends BaseApplication {
            private tunnel: any;
            private sub: GenericObject<any>;
            private log_container: HTMLDivElement;
            private filter: SyslogFilter;
            private logs: SyslogMessage[];
            constructor(args: AppArgumentsType[]) {
                super("ServerLogClient", args);
            }
            private check(msg: SyslogMessage): boolean
            {
                if(!this.filter.record)
                {
                    return false;
                }
                // filter by severity
                if(!this.filter[msg.severity_label])
                {
                    return false;
                }
                // filter by regex
                if(this.filter.pattern)
                {
                    if(msg.message.match(this.filter.pattern))
                    {
                        return true;
                    }
                    return false;
                }
                else
                {
                    return true;
                }
            }
            private log(msg: SyslogMessage): void {
                if(!this.check(msg))
                {
                    return;
                }
                // if the log 
                if(this.logs.length >= this.filter.max_log)
                {
                    let logel = this.logs.shift();
                    $(logel.el).remove();
                }
                msg.el = $("<p />").addClass(msg.severity_label);
                msg.el.text(msg.message);
                $(this.log_container).append(msg.el);
                this.log_container.scrollTop = this.log_container.scrollHeight;
                this.logs.push(msg);
            }

            private openSession(): void {
                this.sub = new Antunnel.Subscriber(this.setting.topic);
                this.sub.onopen = () => {
                    console.log("Subscribed");
                };
           
                this.sub.onerror = (e) => {
                    this.error(__("Unable to connect to: syslog"), e);
                    this.sub = undefined;
                }

                this.sub.onmessage =  (e: GenericObject<any>) => {
                    if(e.data)
                    {
                        let data = JSON.parse(new TextDecoder("utf-8").decode(e.data));
                        if(data.priority)
                        {
                            data.priority = parseInt(data.priority);
                        }
                        if(data.severity)
                        {
                            data.severity = parseInt(data.severity);
                        }
                        if(data.facility)
                        {
                            data.facility = parseInt(data.facility);
                        }
                        this.log(data as SyslogMessage);
                    }
                }
        
                this.sub.onclose = () =>
                {
                    this.sub = undefined;
                    this.notify(__("Connection closed"));
                    this.quit(true);
                }
        
                this.tunnel.subscribe(this.sub);
            }

            cleanup(): void {
                if(this.sub)
                    this.sub.close();
            }
            private checklib(): void {
                if(!Antunnel.tunnel)
                {
                    this._gui
                        .pushService("Antunnel/AntunnelService")
                        .then((d) => {
                            let uri = (this.systemsetting.system as any).tunnel_uri as string;
                            if(!uri)
                            {
                                this.error(__("Unable to connect to the tunnel"));
                                this.quit(true);
                            }
                            Antunnel
                                .init(uri)
                                .then((t) =>{
                                    this.notify(__("Tunnel now connected to the server at: {0}", uri));
                                    this.tunnel = Antunnel.tunnel;
                                    this.openSession();
                                })
                                .catch((e) => {
                                    if(Antunnel.tunnel)
                                    {
                                        Antunnel.tunnel.close();
                                        this.error(__("Unable to connect to the tunnel: {0}", e.toString()), e);
                                        this.quit(true);
                                    }
                                });
                        })
                        .catch((e) => {
                            this.error(__("Unable to run Antunnel service: {0}",e.toString()),e);
                            this.quit(true);
                        });
                }
                else
                {
                    this.tunnel = Antunnel.tunnel;
                    this.openSession();
                }
            }

            main(): void {
                if(!Antunnel)
                {
                    this.error(__("Antunnel library is not available"));
                    this.quit(true);
                    return;
                }
                this.log_container = this.find("log-container") as HTMLDivElement;
                this.logs = [];
                $(this.log_container)
                    .css("overflow-y", "auto");
                let menu = this.find("menu-level") as GUI.tag.MenuTag;
                menu.items = [
                    {
                        text: __("Default level"),
                        nodes: [
                            {
                                text: __("Debug"),
                                switch: true,
                                checked: true,
                                severity: "debug"
                            },
                            {
                                text: __("Notice"),
                                switch: true,
                                checked: true,
                                severity: "notice"
                            },
                            {
                                text: __("Info"),
                                switch: true,
                                checked: true,
                                severity: "info"
                            },
                            {
                                text: __("Warning"),
                                switch: true,
                                checked: true,
                                severity: "warning"
                            },
                            {
                                text: __("Error"),
                                switch: true,
                                checked: true,
                                severity: "err"
                            },
                            {
                                text: __("Critical"),
                                switch: true,
                                checked: true,
                                severity: "crit"
                            },
                            {
                                text: __("Alert"),
                                switch: true,
                                checked: true,
                                severity: "alert"
                            },
                            {
                                text: __("Emergency"),
                                switch: true,
                                checked: true,
                                severity: "emerg"
                            }
                        ],
                        onchildselect: (e) => {
                            let data = e.data.item.data;
                            this.filter[data.severity] = data.checked;
                        }
                    }
                ];
                
                this.filter = {
                    max_log: 500,
                    err: true,
                    emerg: true,
                    debug: true,
                    info: true,
                    notice: true,
                    warning: true,
                    crit: true,
                    alert: true,
                    pattern: undefined,
                    record: true
                };
                let txtnlog = this.find("txt-n-log") as HTMLInputElement;
                txtnlog.value = this.filter.max_log.toString();
                $(txtnlog).on("keyup", (e) =>{
                    if(e.key === "Enter")
                    {
                        let val = parseInt(txtnlog.value);
                        if(!isNaN(val))
                        {
                            this.filter.max_log = val;
                            // truncate the log
                            while(this.logs.length > val)
                            {
                                let m = this.logs.shift();
                                m.el.remove();
                            }
                        }
                        txtnlog.value = this.filter.max_log.toString();
                    }
                });
                let btn = this.find("btn-clear") as GUI.tag.ButtonTag;
                btn.onbtclick = () => {
                    this.logs = [];
                    $(this.log_container).empty();
                };
                let txtreg = this.find("txt-reg") as HTMLInputElement;
                $(txtreg).on("keyup", (e) => {
                    if(e.key === "Enter")
                    {
                        if(txtreg.value.trim() === "")
                        {
                            return this.filter.pattern = undefined;
                        }

                        try{
                            this.filter.pattern =  new RegExp(txtreg.value,"g");
                        }
                        catch(e)
                        {
                            this.error(__("Invalid regular expression: {0}", e.toString()),e);
                            this.filter.pattern = undefined;
                            txtreg.value = "";
                        }
                    }
                });
                let sw = this.find("sw-record") as GUI.tag.SwitchTag;
                sw.onswchange = (e) => {
                    this.filter.record = e.data;
                }
                if(!this.setting.topic)
                {
                    this._gui.openDialog("PromptDialog", { 
                        title: __("Enter topic name"),
                        label: __("Please enter Antunnel topic name")
                    })
                    .then((v) =>
                    {
                        this.setting.topic = v;
                        this.checklib();
                    });  
                }
                else
                {
                    this.checklib();
                }
                
            }
        }
        ServerLogClient.dependencies = [
            "pkg://Antunnel/main.js"
        ];
        ServerLogClient.singleton = true;
    }
}