class LinuxJob extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute()
    {
        switch (this.job.cmd) {
            case 'linux-exec':
                /**
                 * Execute a linux command with the
                 * help of a server side lua API
                 * script
                 */
                this.exec();
                break;
            default:
                const err_msg = `Unkown job ${this.job.cmd}`;
                this.log_error(err_msg);
                return this.error(err_msg);
        }
    }

    exec()
    {
        const path = "pkg://libantosdk/core/lua/api.lua".abspath(this.job.root);
        const url = API.REST.replace("http","ws") + "/system/apigateway?ws=1";
        try{
            const socket = new WebSocket(url);
            socket.onerror = (e)=> {
                this.log_error(e.toString());
                this.error(e);
                socket.close();
            };
            socket.onclose = (e) => {
                this.log_info("Connection closed");
                this.result("Done");
            };
            socket.onopen = (e) => {
                if(!this.job.data.pwd)
                {
                    this.job.data.pwd = this.job.root;
                }
                // send the command
                const cmd = {
                    path: path,
                    parameters: {
                        action: "exec",
                        args: this.job.data
                    }
                };
                socket.send(JSON.stringify(cmd));
            };
            socket.onmessage = (e) => {
                const json = JSON.parse(e.data);
                if(json.error)
                {
                    this.log_error(json.error);
                }
                else
                {
                    this.log_print(json.result);
                }
            }
        }
        catch(error)
        {
            this.log_error(error.toString());
            return this.error(error);
        }
    }
}

API.jobhandle["linux-exec"] = LinuxJob;