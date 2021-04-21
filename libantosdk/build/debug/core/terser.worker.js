importScripts('terser.min.js');

class UglifyCodeJob extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute() {
        
        if(!Terser)
        {
            const e_msg = "Terser module is not loaded";
            this.log_error(e_msg);
            return this.error(e_m);
        }
         this.read_files(this.job.data)
            .then((contents) => {
                const promises = [];
                const options = {
                    toplevel: false,
                    compress: {
                        passes: 3,
                    },
                    mangle: true,
                    output: {
                        //beautify: true,
                    },
                };
                for(let i in contents)
                {
                    
                    const result = Terser.minify(contents[i], options);
                    if (result.error) {
                        this.log_error(`${this.job.data[i]}:${result.error}`);
                        promises.push(new Promise((r,e) => e(result.error)));
                    } else {
                        this.log_info(`File ${this.job.data[i]} uglified`);
                        promises.push(this.save_file(this.job.data[i],result.code));
                    }
                    
                }
                Promise.all(promises)
                    .then((r) => this.result(r))
                    .catch((e) => this.error(e));
            })
            .catch((e1) => this.error(e1));
    }
}

API.jobhandle["terser-uglify"] = UglifyCodeJob;