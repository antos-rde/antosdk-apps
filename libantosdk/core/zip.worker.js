importScripts("os://scripts/jszip.min.js".getlink());


class ZipJob extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    
    execute()
    {
        if(!JSZip)
        {
            const e_msg = "JSZip module is not loaded";
            this.log_error(e_msg);
            return this.error(e_msg);
        }
        switch (this.job.cmd) {
            case 'zip-mk':
                this.mkar()
                    .then(d => this.result(d))
                    .catch(e => this.error(e));
                break;
            default:
                const err_msg = `Unkown job ${this.job.cmd}`;
                this.log_error(err_msg);
                return this.error(err_msg);
        }
    }
    
    aradd(list, zip, base)
    {
        const promises = [];
        for (const file of list) {
            promises.push(new Promise(async (resolve, reject) => {
                try {
                    const basename = file.split("/").pop();
                    const meta = await this.meta(file);
                    if (meta.type == "dir") {
                        const ret = await this.scandir(file);
                        const dirs = ret.map(v => v.path);
                        if (dirs.length > 0) {
                            await this.aradd(dirs, zip, `${base}${basename}/`);
                            resolve(undefined);
                        }
                        else {
                            resolve(undefined);
                        }
                    }
                    else {
                        const ret = await this.read_files([file], "arraybuffer");
                        const u_data = ret[0];
                        const z_path = `${base}${basename}`.replace(
                            /^\/+|\/+$/g,
                            "");
                        zip.file(z_path, u_data, { binary: true });
                        this.log_info(`${file} added to zip`);
                        resolve(undefined);
                    }
                } catch (error) {
                    this.log_error(`${file}: ${error.toString()}`);
                    reject(error);
                }
            }));
        }
        return Promise.all(promises);
    }
    
    mkar()
    {
        const src = this.job.data.src;
        const dest = this.job.data.dest;
        return new Promise(async (resolve, reject) => {
            try {
                const zip = new JSZip();
                const meta = await this.meta(this.job.data.src);
                if(meta.type === "file")
                {
                    await this.aradd([src], zip, "/");
                }
                else
                {
                    const ret = await this.scandir(src);
                    await this.aradd(ret.map(v => v.path), zip, "/");
                }
                const z_data = await zip.generateAsync({ type: "base64" });
                await this.save_file(dest, "data:application/zip;base64," + z_data, "base64");
                this.log_info(`Zip archive saved in ${dest}`);
                resolve(dest);
            } catch (error) {
                this.log_error(`Unable to commpress ${src} -> ${dest}: ${error.toString()}`);
                reject(error);
            }
        });
    }
}

API.jobhandle["zip-mk"] = ZipJob;
