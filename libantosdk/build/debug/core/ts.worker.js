importScripts('typescript.min.js');

const tslib = {};
const SDK_URL = "https://ci.iohub.dev/public/antos-release/sdk";

class TSJob extends AntOSDKBaseJob {
    constructor(data)
    {
        super(data);
    }
    execute(){
        if(!ts)
        {
            const e_msg = "typescript module is not loaded";
            this.log_error(e_msg);
            return this.error(e_msg);
        }
        switch (this.job.cmd) {
            case 'ts-import':
                this.importlib();
                break;
            case 'ts-compile':
                this.compile();
                break;
            case 'ts-antos-sdk':
                this.load_sdk();
                break;
            default:
                const err_msg = `Unkown job ${this.job.cmd}`;
                this.log_error(err_msg);
                return this.error(err_msg);
        }
    }
    importlib()
    {
        if(!ts)
        {
            const e_msg = "typescript module is not loaded";
            this.log_error(e_msg);
            return this.error(e_msg);
        }
       this.read_files(this.job.data)
            .then((results) => {
                for(let i in this.job.data)
                {
                    const lib = this.job.data[i];
                    if(!tslib[lib])
                    {
                        tslib[lib] = ts.createSourceFile(lib, results[i], ts.ScriptTarget.Latest);
                        this.log_info(`Typescript library ${lib} loaded`);
                    }
                }
                this.result("Typescript libraries loaded");
            })
            .catch((e) => {
                this.log_error("Fail to load Typescript module");
                this.error(e);
            });
    }
    async load_sdk()
    {
        let version = "master";
        if(this.job.data && this.job.data.version)
        {
            version = this.job.data.version;
        }
        const files = [
            `${SDK_URL}/${version}/core.d.ts`,
            `${SDK_URL}/${version}/jquery.d.ts`,
            `${SDK_URL}/${version}/antos.d.ts`,
        ];
        try{
            const promises = [];
            const load = [];
            for(let file of files)
            {
                if(!tslib[file])
                {
                    load.push(file);
                    this.log_info(`Loading library ${file}`);
                    promises.push(this.get(file, undefined));
                }
            }
            const results = await Promise.all(promises);
            for(let i in load)
            {
                const lib = load[i];
                tslib[lib] = ts.createSourceFile(lib, results[i], ts.ScriptTarget.Latest);
                this.log_info(`Typescript library ${lib} loaded`);
            }
            this.result("Typescript libraries loaded");
        }
        catch(e)
        {
            this.log_error(e.toString());
        }
    }
    compile()
    {
        let files = [];
        const src_files = {};
        for(let i in tslib)
        {
            files.push(i);
            src_files[i] = tslib[i];
        }
        files = files.concat(this.job.data.src);
        this.read_files(this.job.data.src)
            .then((contents) => {
                for(let i in contents)
                {
                    const m = this.job.data.src[i];
                    src_files[m] = ts.createSourceFile(m, contents[i], ts.ScriptTarget.Latest);
                }
                let js_code = "";
                const host = {
                    fileExists: (path) => {
                        return src_files[path] !== undefined;
                    },
                    directoryExists: (path) => {
                        return true;
                    },
                    getCurrentDirectory: () => "/",
                    getDirectories: () => [],
                    getCanonicalFileName: (path) => path,
                    getNewLine: () => "\n",
                    getDefaultLibFileName: () => "",
                    getSourceFile: (path) => src_files[path],
                    readFile: (path) => undefined,
                    useCaseSensitiveFileNames: () => true,
                    writeFile: (path, data) => js_code = `${js_code}\n${data}`
                };
                const compile_options = {
                    "target": "es6",
                    "skipLibCheck": true,
                    "downlevelIteration": true
                };
                // Allow user override compile options
                if(this.job.data.options)
                {
                    for(let k in this.job.data.options)
                    {
                        compile_options[k] = this.job.data.options[k];
                    }
                }
                console.log("TS compile options", compile_options);
                const program = ts.createProgram(files,compile_options , host);
                const result = program.emit();
                const diagnostics = result.diagnostics.concat((ts.getPreEmitDiagnostics(program)));
                const errors = [];
                if (diagnostics.length > 0) {
                    diagnostics.forEach(diagnostic => {
                        let err_msg = "";
                        if (diagnostic.file) {
                            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
                            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                            err_msg = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
                        } else {
                            err_msg = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                        }
                        errors.push(err_msg);
                        this.log_error(err_msg);
                    });
                    return this.error(errors);
                }
                // write to file
                this.save_file(this.job.data.dest,js_code)
                    .then(r => {
                        if(r.error)
                        {
                            this.log_error(error);
                            return this.error(r.error);
                        }
                        this.result(this.job.data.dest);
                    })
                    .catch(e1 => this.error(e1));
            })
            .catch(e => this.error(e));
    }
}

API.jobhandle["ts-import"] = TSJob;
API.jobhandle["ts-compile"] = TSJob;
API.jobhandle["ts-antos-sdk"] = TSJob;
