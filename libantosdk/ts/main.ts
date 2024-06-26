
namespace OS {
    
    export namespace API {
        interface TSLib {
            file: string;
            url?: string;
            zip?: boolean;
        };
        
        interface AntOSDKWorkerResult {
            id: string;
            type: "result"|"log";
            error?: any;
            result?: any;
            show_time?:boolean;
        }
        
        interface AntOSDKWorkerJob {
            id: string;
            cmd: string;
            data: any;
        }
        
        interface AntOSDKLogger {
            info: (data: any) => void;
            error: (data: any) => void;
        }
        
        class AntOSDKWorker {
            private worker: any;
            private jobs: GenericObject<any>;
            constructor(path: string)
            {
                this.worker = new Worker(path.asFileHandle().getlink());
                this.jobs = {};
                this.worker.onmessage = (e) => {
                    let ret = e.data as AntOSDKWorkerResult;
                    let job = this.jobs[ret.id];
                    if(job)
                    {
                        if(ret.type ==="log")
                        {
                            if(job.logger){
                                if(ret.error)
                                    job.logger.error(ret.result);
                                else
                                {
                                    if(ret.show_time === false && job.logger.print)
                                        job.logger.print(ret.result);
                                    else
                                        job.logger.info(ret.result);
                                }
                            }
                        }
                        else
                        {
                            job.callback(ret);
                            delete this.jobs[ret.id];   
                        }
                    }
                    else
                    {
                        console.log("Unable to identify result of job", ret.id, ret);
                    }
                }
                const pkgs = {};
                for(const k in OS.setting.system.packages)
                {
                    const pkg = OS.setting.system.packages[k];
                    pkgs[k] = {
                        path: pkg.path,
                        name: pkg.pkgname
                    }
                }
                this.submit("sdk-setup", {
                    REST: OS.API.REST,
                    pkgs: pkgs
                });
            }
            
            private newJobID(): string {
                return `job_${Math.random().toString(36).replace(".","")}`;
            }
            
            private exectue_job(cmd: string, data: any, root:string, callback: (arg: AntOSDKWorkerResult) => void, logger?: AntOSDKLogger): void
            {
                const id = this.newJobID();
                const job: AntOSDKWorkerJob = {
                    id: id,
                    cmd: cmd,
                    data: data,
                    root: root
                } as AntOSDKWorkerJob;
                this.jobs[id] = {
                    callback:callback,
                    logger: logger
                };
                this.worker.postMessage(job);
            }
            
            submit(cmd:string, data:any,root?:string, logger?: AntOSDKLogger): Promise<any>
            {
                return new Promise((resolve, reject) => {
                   this.exectue_job(cmd, data, root, (ret) =>{
                       if(ret.error)
                       {
                           return reject(ret.error);
                       }
                       resolve(ret.result);
                   }, logger) 
                });
            }
            
            terminate(): void {
                this.worker.terminate();
            }
        }
        
        export class AntOSDKBuilder {
            
            static worker: AntOSDKWorker;
            
            private root: string;
            private logger:AntOSDKLogger;
            
            constructor(logger?: AntOSDKLogger, root?: string)
            {
                this.root = root;
                this.logger = logger;
                if(! AntOSDKBuilder.worker)
                {
                    AntOSDKBuilder.worker = new AntOSDKWorker("pkg://libantosdk/core/worker.js");
                }
            }
            
            require(mods:string[]): Promise<any>
            {
                return this.run("sdk-import", mods.map(m=> `${m}.worker.js`));
            }
            
            compile(type: string, opts: GenericObject<any>): Promise<string> {
                return new Promise(async (resolve, reject) => {
                    try{
                        await this.require([type]);
                        const ret = await this.run(`${type}-compile`, opts);
                        resolve(ret);
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            
            run(job: string, data: any): Promise<any>
            {
                if(job === "sdk-run-app")
                {
                    return new Promise(async (resolve, reject) =>
                    {
                        try{
                            let app_root = data;
                            if(app_root.split("://").length == 1)
                            {
                                app_root = `${this.root}/${data}`;
                            }
                            const v = await `${app_root}/package.json`.asFileHandle().read("json");
                            v.text = v.name;
                            v.path = app_root;
                            v.filename = v.pkgname;
                            v.type = "app";
                            v.mime = "antos/app";
                            if (v.icon) {
                                v.icon = `${v.path}/${v.icon}`;
                            }
                            if (!v.iconclass && !v.icon) {
                                v.iconclass = "fa fa-adn";
                            }
                            this.logger.info(__("Installing..."));
                            OS.setting.system.packages[v.pkgname] = v;
                            if(v.app)
                            {
                                this.logger.info(__("Running {0}...", v.app));
                                OS.GUI.forceLaunch(v.app, []);
                            }
                            else
                            {
                                this.logger.error(__("{0} is not an application", v.pkgname));
                            }
                            return resolve(undefined);
                        }
                        catch(error)
                        {
                            reject(error);
                        }
                    });
                }
                else if(job === "batch")
                {
                    return new Promise(async (resolve, reject) =>
                    {
                        try{
                            if(!data || !data.target)
                            {
                                const err = __("No target provided for job: batch");
                                this.logger.error(err);
                                throw new Error(err.__());
                            }
                            let pwd = data.pwd;
                            if(!pwd)
                            {
                                pwd = this.root;
                            }
                            const ret = await pwd.asFileHandle().read();
                            if(ret.error)
                            {
                                this.logger.error(ret.error);
                                throw new Error(ret.error);
                            }
                            let dirs = ret.result.filter(e => e.type === "dir");
                            if(data.modules)
                            {
                                dirs = dirs.filter(e => data.modules.includes(e.filename));
                            }
                            for(let entry of dirs)
                            {
                                const build_file = `${entry.path}/build.json`.asFileHandle();
                                try {
                                    await build_file.onready();
                                }
                                catch(e)
                                {
                                    this.logger.info(__("No build.json file found in {0}, ignore this file", entry.path));
                                    continue;
                                }
                                this.logger.info(__("########### BUILDING: {0} ###########", entry.path));
                                const sdk = new AntOSDKBuilder(this.logger,entry.path);
                                const options = await build_file.read("json");
                                if(!options.root)
                                {
                                    options.root = entry.path;
                                }
                                await sdk.batch([data.target], options);
                            }
                            this.logger.info(__("########### Batch building done ###########"));
                            return resolve(undefined);
                        }
                        catch(error)
                        {
                            reject(error);
                        }
                    });
                }
                return AntOSDKBuilder.worker.submit(job,data, this.root, this.logger);
            }
            
            batch(targets: string[], options: GenericObject<any>): Promise<any>
            {
                if(options.root)
                {
                    this.root = options.root;
                }
                return new Promise(async (resolve, reject) => {
                    try {
                        if(!options.targets)
                        {
                            reject("No target found");
                        }
                        for(const name of targets)
                        {
                            const target = options.targets[name];
                            if(!target)
                                return reject(__("No target: {0}", name));
                            
                            if(target.depend)
                            {
                                await this.batch(target.depend,options);
                            }
                            if(target.require)
                            {
                                await this.require(target.require);
                            }
                            if(this.logger)
                                this.logger.info(__("### RUNNING STAGE: {0}###", name).__());
                            if(target.jobs)
                                for(const job of target.jobs)
                                {
                                        await this.run(job.name, job.data);
                                }
                        }
                        resolve(undefined);
                    }
                    catch(e) {
                        reject(e);
                    }
                });
            }
        }
        export namespace VFS {
            export class SDKFileHandle extends VFS.RemoteFileHandle {
    
                /**
                 *Creates an instance of SDKFileHandle.
                 * @param {string} pkg_path package path in string
                 * @memberof SDKFileHandle
                 */
                constructor(pkg_path: string) {
                    super(pkg_path);
                    const path = `pkg://libantosdk/${this.genealogy.join("/")}`;
                    this.setPath(path.asFileHandle().path);
                }
            }
            register("^sdk$", SDKFileHandle);
        }
    }
}