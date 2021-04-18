importScripts('coffeescript.js');

class CompileCoffeeJob extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute()
    {
        if(!CoffeeScript)
        {
            const e_msg = "CoffeeScript module is not loaded";
            this.log_error(e_msg);
            return this.error(e_msg);
        }
        // very files all data
        this.read_files(this.job.data.src)
            .then((contents) => {
                const errors = [];
                for(let i in contents)
                {
                    const data = contents[i];
                    const file = this.job.data.src[i];
                    try {
                        CoffeeScript.nodes(data);
                        this.log_info(`File ${file} verified`);
                    } catch (ex) {
                        errors.push(ex);
                        this.log_error(`${file}: ${ex.toString()}`);
                    }
                }
                if(errors.length > 0)
                {
                    return this.error(errors);
                }
                const code = contents.join("\n");
                const jsrc = CoffeeScript.compile(code);
                // write to file
                this.save_file(this.job.data.dest,jsrc)
                    .then(r => {
                        this.log_info(`File ${this.job.data.dest} generated`);
                        this.result(this.job.data.dest);
                    })
                    .catch(e1 => {
                        this.error(e1);
                    });
            })
            .catch(e => this.error(e));
    }
}

API.jobhandle["coffee-compile"] = CompileCoffeeJob;