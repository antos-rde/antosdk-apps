String.prototype.getlink = function(root)
{
    return API.REST  + "/VFS/get/"  + this.abspath(root);
}
String.prototype.abspath = function(root)
{
    const list = this.split("://");
    if(list.length == 1)
    {
        return  root + "/" + this;
    }
    const proto = list[0];
    const arr = list[1].split("/");
    if(proto === "pkg")
    {
        const pkg = arr.shift();
        if(API.pkgs[pkg]) {
            return API.pkgs[pkg].path + "/" + arr.join("/");
        }
    }
    if(proto === "sdk")
    {
        return `pkg://libantosdk/${arr.join("/")}`.abspath(root);
    }
    return this;
}
const API = {
    REST: "",
    jobhandle: {},
    modules: {},
    pkgs:{}
};

class AntOSDKBaseJob {
    
    constructor(data)
    {
        this.job = data;
    }
    
    result(data) {
        const result = {
            id: this.job.id,
            type: "result",
            error: false,
            result: data
        };
        postMessage(result);
    }
    
    error(msg) {
        const result = {
            id: this.job.id,
            type: "result",
            error: msg,
            result: false
        };
        postMessage(result);
    }
    
    log_info(data) {
        postMessage({
            id: this.job.id,
            type: "log",
            error: false,
            result: data
        });
    }
    
    log_error(data) {
        postMessage({
            id: this.job.id,
            type: "log",
            error: true,
            result: data
        });
    }
    
    get(url, type) {
        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("GET", url, true);
            
            if(type)
            {
                req.responseType = type;
            }
            
            req.onload = function() {
                if (req.readyState === 4 && req.status === 200) {
                    resolve(req.response);
                }
                else
                {
                    this.log_error(req.statusText);
                    reject(req.statusText);
                }
            };
            req.send(null);
        });
    }
    
    post(url, data, type) {
        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("POST", url, true);
            req.setRequestHeader("Content-Type", "application/json");
            if(type)
            {
                req.responseType = type;
            }
            req.onload = function() {
                if (req.readyState === 4 && req.status === 200) {
                    try {
                        const json = JSON.parse(req.response);
                        resolve(json);
                    } catch (e) {
                        resolve(req.response);
                    }
                }
                else
                {
                    this.log_error(req.statusText);
                    reject(req.statusText);
                }
            };
            req.send(JSON.stringify(data));
        });
    }
    read_files(files)
    {
        return new Promise( async (resolve, reject) => {
            try{
                let promises = [];
                for(let file of files)
                {
                    promises.push(this.meta(file.abspath(this.job.root)));
                }
                await Promise.all(promises);
                promises = [];
                for(let file of files)
                {
                    promises.push(this.get(file.getlink(this.job.root)));
                }
                const contents = await Promise.all(promises);
                resolve(contents);
            } catch (e)
            {
                this.log_error(e.toString());
                reject(e);
            }
        });
        
    }
    
    cat(files, data)
    {
        return new Promise((resolve, reject) => {
            this.read_files(files)
                .then((results) => {
                    resolve(`${data}\n${results.join("\n")}`);
                })
                .catch((e) => {
                    reject(e);
                    this.log_error(e.toString());
                });
        });
    }
    
    save_file(file, data, t)
    {
        return new Promise((res,rej) => {
            this.b64(t,data)
                .then((enc) => {
                    this.post(API.REST+"/VFS/write", {
                        path: file.abspath(this.job.root),
                        data: enc
                    })
                    .then(d => {
                        if(d.error){
                            this.log_error(`Unable to saved to ${file}: ${d.error}`);
                            return rej(d.error);
                        }
                        this.log_info(`${file} saved`);
                        res(d);
                    })
                    .catch(e1 => {
                        this.log_error(`Unable to saved to ${file}: ${e1.toString()}`);
                        rej(e1);
                    });
                })
                .catch((e) => {
                    this.log_error(`Unable to saved to ${file}: ${e.toString()}`);
                    rej(e);
                });
        });
    }
    
    b64(t, data) {
        return new Promise((resolve, reject) => {
            if(t === "base64")
                return resolve(data);
            let m = t === "object" ? "text/plain" : t;
            if(!t)
                m = "text/plain";
            if (t === "object" || typeof data === "string") {
                let b64;
                if (t === "object") {
                    b64 = btoa(JSON.stringify(data, undefined, 4));
                }
                else {
                    b64 = btoa(data);
                }
                b64 = `data:${m};base64,${b64}`;
                return resolve(b64);
            }
            else {
                //blob
                const reader = new FileReader();
                reader.readAsDataURL(data);
                reader.onload = () => resolve(reader.result);
                return (reader.onerror = (e) => reject(e));
            }
        });
    }
    
    delete(files)
    {
        const promises = [];
        for(const file of files)
        {
            promises.push(new Promise((resolve, reject) =>{
            this.post(API.REST+"/VFS/delete", {path: file.abspath(this.job.root)})
                .then(r => {
                    if(r.error)
                    {
                        this.log_error(`${file}:${r.error}`);
                        return reject(r.error);
                    }
                    this.log_info(`${file} deleted`);
                    return resolve(r.result);
                })
                .catch(e =>{
                    this.log_error(e.toString());
                    reject(e);
                    
                });
            }));
        }
        return Promise.all(promises);
    }
    
    mkdir(list) {
        return new Promise( async (resolve, reject) => {
            try {
                if (list.length === 0) {
                    return resolve(true);
                }
                const dir = list.splice(0, 1)[0];
                const ret = await this.post(API.REST+"/VFS/mkdir", {path: dir.abspath(this.job.root)});
                if(ret.error)
                {
                    this.log_error(`${dir}: ${ret.error}`);
                    return reject(ret.error);
                }
                this.log_info(`${dir} created`);
                await this.mkdir(list);
                resolve(true);
            }
            catch (e) {
                this.log_error(e.toString());
                reject(e);
            }
        });
    }
    
    copy(files, to) {
        const promises = [];
        
        for (const path of files.map(f =>f.abspath(this.job.root))) {
            promises.push(new Promise(async (resolve, reject) => {
                try {
                    const file = path.split("/").filter(s=>s!="").pop();
                    const tof = `${to}/${file}`;
                    const meta = await this.meta(path);
                    if (meta.type === "dir") {
                        await this.mkdir([tof]);
                        const dirs = await this.scandir(path);
                        const files = dirs.map((v) => v.path);
                        if (files.length > 0) {
                            await this.copy(files, tof);
                        }
                        resolve(undefined);
                    }
                    else {
                        const ret = await this.read_files([path], "arraybuffer");
                        const blob = new Blob([ret[0]], {
                                    type: meta.mime});
                        await this.save_file(tof, blob,"binary");
                        this.log_info(`COPIED: ${path} -> ${tof}`);
                        resolve(undefined);
                    }
                } catch (error) {
                    this.log_error(error.toString());
                    reject(error);
                }
            }));
        }
        return Promise.all(promises);
    }
    
    meta(path)
    {
        const file = path.abspath(this.job.root);
        return new Promise((resolve,reject) =>{
            this.post(API.REST+"/VFS/fileinfo", {path:file})
                .then(json =>{
                    if(json.error)
                    {
                        this.log_error(`${file}: ${json.error}`);
                        return reject(json.error);
                    }
                    return resolve(json.result);
                })
                .catch(e => {
                    this.log_error(e.toString());
                    resolve(e);
                });
        });
    }
    
    scandir(path)
    {
        return new Promise((resolve,reject) =>{
            this.post(API.REST+"/VFS/scandir", {path:path.abspath(this.job.root)})
                .then(json =>{
                    if(json.error)
                        return reject(json.error);
                    return resolve(json.result);
                })
                .catch(e =>{
                    this.log_error(e.toString());
                    resolve(e);
                });
        });
    }
    execute() {}
}

class UnknownJob extends AntOSDKBaseJob {
     constructor(data)
    {
        super(data);
    }
    execute() {
        this.log_error("Unknown job " + this.job.cmd);
        this.error("Unknown job " + this.job.cmd);
    }
}

class SDKSetup extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute() {
        for(let k in this.job.data)
        {
            API[k] = this.job.data[k];
        }
        this.result("ANTOS Sdk set up");
    }
}

class LoadScritpJob  extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute() {
        try
        {
            for(let lib of this.job.data)
            {
                if(!API.modules[lib])
                {
                    this.log_info("Importing module:" + lib);
                    importScripts(lib);
                    API.modules[lib] = true;
                }
                else
                {
                    console.log("Module " + lib + " is already loaded");
                }
            }
            this.log_info("All Modules loaded" );
            this.result(this.job.data);
        }
        catch(e)
        {
            this.error(e);
        }
    }
}

class VFSJob  extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute() {
        const arr = this.job.cmd.split("-");
        if(arr.length > 1)
        {
            switch (arr[1]) {
                case 'cat':
                    this.cat(this.job.data.src,"")
                        .then(data => {
                            this.save_file(this.job.data.dest, data)
                                .then(r => this.result(r))
                                .catch(e1 => this.error(e1));
                        })
                        .catch(e => this.error(e));
                    break;
                case 'rm':
                    this.delete(this.job.data)
                        .then(d => this.result(d))
                        .catch(e => this.error(e));
                    break;
                case 'mkdir':
                    this.mkdir(this.job.data)
                        .then(d => this.result(d))
                        .catch(e => this.error(e));
                    break;
                case 'cp':
                    this.copy(this.job.data.src, this.job.data.dest)
                        .then(d => this.result(d))
                        .catch(e => this.error(e));
                    break;
                default:
                    this.error("Unknown command: " + this.job.cmd);
            }
        }
        else
        {
            this.error("Unknown command: " + this.job.cmd);
        }
    }
}

API.jobhandle["sdk-import"] = LoadScritpJob;
API.jobhandle["sdk-setup"] = SDKSetup;
API.jobhandle["vfs-cat"] = VFSJob;
API.jobhandle["vfs-rm"] = VFSJob;
API.jobhandle["vfs-mkdir"] = VFSJob;
API.jobhandle["vfs-cp"] = VFSJob;

onmessage = (e) => {
    if(API.jobhandle[e.data.cmd])
    {
        return (new API.jobhandle[e.data.cmd](e.data)).execute();
    }
    (new UnknownJob(e.data)).execute();
}