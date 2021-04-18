
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
                                    job.logger.info(ret.result);
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
            
            private exectue_job(cmd: string, data: any, root:string, callback: (AntOSDKWorkerResult) => void, logger?: AntOSDKLogger): void
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
                                return reject(__(`No target: ${name}`));
                            
                            if(target.depend)
                            {
                                await this.batch(target.depend,options);
                            }
                            if(target.require)
                            {
                                await this.require(target.require);
                            }
                            if(this.logger)
                                this.logger.info(__(`### RUNNING STAGE: ${name}###`).__());
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