importScripts('coffeescript.js');

class LocaleJob extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute()
    {
        switch (this.job.cmd) {
            case 'locale-gen':
                /**
                 * {
                 *      src: source folder,
                 *      exclude: exclude search rules
                 *      include: include search rules
                 *      locale: e.g. en_GB
                 *      dest: destination file/ folder
                 * }
                 */
                this.gen()
                    .then(d =>this.result(d))
                    .catch(e => this.error(e));
                break;
            default:
                const err_msg = `Unkown job ${this.job.cmd}`;
                this.log_error(err_msg);
                return this.error(err_msg);
        }
    }
    ck_rules(path, rules)
    {
        for(const rule of rules)
        {
            const reg = new RegExp(rule);
            if(path.match(reg))
            {
                return true;
            }
        }
        return false;
    }
    genlang(file, options)
    {
        // check if include or exclude
        return new Promise(async (resolve, reject) => {
            try{
                if( options.include && this.ck_rules(file,options.include) === false)
                {
                    this.log_info(`locale-gen: ${file} is excluded`);
                    return resolve([]);
                }
                if( options.exclude && this.ck_rules(file,options.exclude) === true)
                {
                    this.log_info(`locale-gen: ${file} is excluded`);
                    return resolve([]);
                }
                // check if file or folder
                const meta = await this.meta(file);
                if(meta.type === "dir")
                {
                    const promises = [];
                    const entries = await this.scandir(file);
                    for(const entry of entries)
                    {
                        promises.push(this.genlang(`${file}/${entry.filename}`,options));
                    }
                    const results = await Promise.all(promises);
                    let ret = [];
                    for(const el of results)
                    {
                        ret = ret.concat(el);
                    }
                    return resolve(ret);
                }
                else
                {
                    const contents = await this.read_files([file]);
                    // find all matches
                    let regs = [
                        "\"\s*__\\(([^\"]*)\\)\s*\"",
                        "__\\(\s*[\"'](.*)[\"'].*\\)"
                    ];
                    let ret = [];
                    for(const reg of regs)
                    {
                        let matches = contents[0].match(new RegExp(reg,'g'));
                        if(matches)
                        {
                            for(const match of matches)
                            {
                                ret.push(match.match(new RegExp(reg))[1]);
                            }
                        }
                    }
                    if(ret.length > 0)
                    {
                        this.log_info(`locale-gen: Found in ${file}: \n${ret.join("\n")}`);
                    }
                    
                    return resolve(ret);
                }
            }
            catch(error) 
            {
                this.log_error(`${file}: ${error.toString()}`);
                reject(error);
            }
        });
    }

    gen(){
        return new Promise(async (resolve, reject) => {
            try {
                const results = await this.genlang(this.job.data.src,this.job.data);
                const locale = {};
                locale[this.job.data.locale] = {};
                for(const str of results)
                {
                    locale[this.job.data.locale][str] = str;
                }
                // check destination
                // if it a file, assume that it is a meta file
                const meta = await this.meta(this.job.data.dest);
                if(meta.type === "dir")
                {
                    const file = `${this.job.data.dest}/${this.job.data.locale}.json`;
                    // save data
                    const result = await this.save_file(file,locale[this.job.data.locale],"object");
                    this.log_info(`locale-gen: locale file generated at ${file}`);
                    resolve(result);
                }
                else
                {
                    // read the meta file
                    const contents = await this.read_files([this.job.data.dest]);
                    const pkg = JSON.parse(contents[0]);
                    pkg.locale = locale;
                    // save data
                    const result = await this.save_file(this.job.data.dest,pkg,"object");
                    this.log_info(`locale-gen: locale file generated at ${this.job.data.dest}`);
                    resolve(result);
                }
            }
            catch(error)
            {
                this.log_error(error.toString());
                reject(error);
            }
        });
    }
}

API.jobhandle["locale-gen"] = LocaleJob;