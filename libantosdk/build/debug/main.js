
var OS;
(function (OS) {
    let API;
    (function (API) {
        ;
        class AntOSDKWorker {
            constructor(path) {
                this.worker = new Worker(path.asFileHandle().getlink());
                this.jobs = {};
                this.worker.onmessage = (e) => {
                    let ret = e.data;
                    let job = this.jobs[ret.id];
                    if (job) {
                        if (ret.type === "log") {
                            if (job.logger) {
                                if (ret.error)
                                    job.logger.error(ret.result);
                                else {
                                    if (ret.show_time === false && job.logger.print)
                                        job.logger.print(ret.result);
                                    else
                                        job.logger.info(ret.result);
                                }
                            }
                        }
                        else {
                            job.callback(ret);
                            delete this.jobs[ret.id];
                        }
                    }
                    else {
                        console.log("Unable to identify result of job", ret.id, ret);
                    }
                };
                const pkgs = {};
                for (const k in OS.setting.system.packages) {
                    const pkg = OS.setting.system.packages[k];
                    pkgs[k] = {
                        path: pkg.path,
                        name: pkg.pkgname
                    };
                }
                this.submit("sdk-setup", {
                    REST: OS.API.REST,
                    pkgs: pkgs
                });
            }
            newJobID() {
                return `job_${Math.random().toString(36).replace(".", "")}`;
            }
            exectue_job(cmd, data, root, callback, logger) {
                const id = this.newJobID();
                const job = {
                    id: id,
                    cmd: cmd,
                    data: data,
                    root: root
                };
                this.jobs[id] = {
                    callback: callback,
                    logger: logger
                };
                this.worker.postMessage(job);
            }
            submit(cmd, data, root, logger) {
                return new Promise((resolve, reject) => {
                    this.exectue_job(cmd, data, root, (ret) => {
                        if (ret.error) {
                            return reject(ret.error);
                        }
                        resolve(ret.result);
                    }, logger);
                });
            }
            terminate() {
                this.worker.terminate();
            }
        }
        class AntOSDKBuilder {
            constructor(logger, root) {
                this.root = root;
                this.logger = logger;
                if (!AntOSDKBuilder.worker) {
                    AntOSDKBuilder.worker = new AntOSDKWorker("pkg://libantosdk/core/worker.js");
                }
            }
            require(mods) {
                return this.run("sdk-import", mods.map(m => `${m}.worker.js`));
            }
            compile(type, opts) {
                return new Promise(async (resolve, reject) => {
                    try {
                        await this.require([type]);
                        const ret = await this.run(`${type}-compile`, opts);
                        resolve(ret);
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
            run(job, data) {
                if (job === "sdk-run-app") {
                    return new Promise(async (resolve, reject) => {
                        try {
                            let app_root = data;
                            if (app_root.split("://").length == 1) {
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
                            if (v.app) {
                                this.logger.info(__("Running {0}...", v.app));
                                OS.GUI.forceLaunch(v.app, []);
                            }
                            else {
                                this.logger.error(__("{0} is not an application", v.pkgname));
                            }
                            return resolve(undefined);
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                }
                else if (job === "batch") {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (!data || !data.target) {
                                const err = __("No target provided for job: batch");
                                this.logger.error(err);
                                throw new Error(err.__());
                            }
                            let pwd = data.pwd;
                            if (!pwd) {
                                pwd = this.root;
                            }
                            const ret = await pwd.asFileHandle().read();
                            if (ret.error) {
                                this.logger.error(ret.error);
                                throw new Error(ret.error);
                            }
                            let dirs = ret.result.filter(e => e.type === "dir");
                            if (data.modules) {
                                dirs = dirs.filter(e => data.modules.includes(e.filename));
                            }
                            for (let entry of dirs) {
                                const build_file = `${entry.path}/build.json`.asFileHandle();
                                try {
                                    await build_file.onready();
                                }
                                catch (e) {
                                    this.logger.info(__("No build.json file found in {0}, ignore this file", entry.path));
                                    continue;
                                }
                                this.logger.info(__("########### BUILDING: {0} ###########", entry.path));
                                const sdk = new AntOSDKBuilder(this.logger, entry.path);
                                const options = await build_file.read("json");
                                if (!options.root) {
                                    options.root = entry.path;
                                }
                                await sdk.batch([data.target], options);
                            }
                            this.logger.info(__("########### Batch building done ###########"));
                            return resolve(undefined);
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                }
                return AntOSDKBuilder.worker.submit(job, data, this.root, this.logger);
            }
            batch(targets, options) {
                if (options.root) {
                    this.root = options.root;
                }
                return new Promise(async (resolve, reject) => {
                    try {
                        if (!options.targets) {
                            reject("No target found");
                        }
                        for (const name of targets) {
                            const target = options.targets[name];
                            if (!target)
                                return reject(__("No target: {0}", name));
                            if (target.depend) {
                                await this.batch(target.depend, options);
                            }
                            if (target.require) {
                                await this.require(target.require);
                            }
                            if (this.logger)
                                this.logger.info(__("### RUNNING STAGE: {0}###", name).__());
                            if (target.jobs)
                                for (const job of target.jobs) {
                                    await this.run(job.name, job.data);
                                }
                        }
                        resolve(undefined);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }
        }
        API.AntOSDKBuilder = AntOSDKBuilder;
        let VFS;
        (function (VFS) {
            class SDKFileHandle extends VFS.RemoteFileHandle {
                /**
                 *Creates an instance of SDKFileHandle.
                 * @param {string} pkg_path package path in string
                 * @memberof SDKFileHandle
                 */
                constructor(pkg_path) {
                    super(pkg_path);
                    const path = `pkg://libantosdk/${this.genealogy.join("/")}`;
                    this.setPath(path.asFileHandle().path);
                }
            }
            VFS.SDKFileHandle = SDKFileHandle;
            VFS.register("^sdk$", SDKFileHandle);
        })(VFS = API.VFS || (API.VFS = {}));
    })(API = OS.API || (OS.API = {}));
})(OS || (OS = {}));

var OS;
(function (OS) {
    let application;
    (function (application) {
        class Logger {
            /**
             * Creates an instance of Logger.
             * @param {HTMLElement} el target container
             * @memberof Logger
             */
            constructor(el) {
                this.target = el;
            }
            /**
             * Log level info
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            info(s) {
                this.log("info", s, true);
            }
            /**
             * Log level warning
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            warn(s) {
                this.log("warn", s, true);
            }
            /**
             * Log level error
             *
             * @param {string|FormattedString} s
             * @memberof Logger
             */
            error(s) {
                this.log("error", s, true);
            }
            /**
             * Log a string to target container
             *
             * @private
             * @param {string} c class name of the appended log element
             * @param {string|FormattedString} s log string
             * @param {boolean} showtime define whether the logger should insert datetime prefix
             * in the log string
             * @memberof Logger
             */
            log(c, s, showtime) {
                let el = $("<pre></pre>")
                    .attr("class", `sdk-log-${c}`);
                if (showtime) {
                    let date = new Date();
                    let prefix = date.getDate() + "/"
                        + (date.getMonth() + 1) + "/"
                        + date.getFullYear() + " "
                        + date.getHours() + ":"
                        + date.getMinutes() + ":"
                        + date.getSeconds();
                    el.text(`[${prefix}]: ${s.__()}`);
                }
                else {
                    el.text(s.__());
                }
                $(this.target).append(el);
                $(this.target).scrollTop($(this.target)[0].scrollHeight);
            }
            /**
             * Print a log message without prefix
             *
             * @param {string|FormattedString} s text to print
             * @memberof Logger
             */
            print(s) {
                if (s.match(/warn/i)) {
                    this.log("warn", s, false);
                }
                else if (s.match(/error/i)) {
                    this.log("error", s, false);
                }
                else {
                    this.log("info", s, false);
                }
            }
            /**
             * Empty the log container
             *
             * @memberof Logger
             */
            clear() {
                $(this.target).empty();
            }
        }
        /**
         *
         * @class SDKBuilder
         * @extends {BaseApplication}
         */
        class SDKBuilder extends application.BaseApplication {
            constructor(args) {
                super("SDKBuilder", args);
            }
            main() {
                this.logger = new Logger(this.find("container"));
                this.sdk = new OS.API.AntOSDKBuilder(this.logger, "");
                this.filehandle = undefined;
                this.options = undefined;
                this.targets = this.find("target-list");
                if (this.args && this.args.length > 0)
                    this.filehandle = this.args[0].path.asFileHandle();
                this.find("btnbuild").onbtclick = (e) => {
                    const selected = this.targets.selectedItem;
                    if (!selected)
                        return;
                    this.load(this.compile([selected.data.text])).catch((e) => this.logger.error(__(e.stack)));
                };
                this.find("btnclear").onbtclick = (e) => {
                    this.logger.clear();
                };
                this.find("btnrefresh").onbtclick = (e) => {
                    this.open();
                };
                this.find("btnopen").onbtclick = async (e) => {
                    try {
                        const d = await this.openDialog("FileDialog", {
                            title: __("Select build file"),
                            mimes: this.meta().mimes
                        });
                        this.filehandle = d.file.path.asFileHandle();
                        this.open();
                    }
                    catch (error) {
                        this.logger.error(error.toString());
                    }
                };
                this.open();
            }
            open() {
                if (this.filehandle === undefined) {
                    return;
                }
                this.filehandle
                    .read("json")
                    .then((data) => {
                    if (!data.targets) {
                        return this.logger.error(__("Invalid build file: {0}", this.filehandle.path));
                    }
                    const targets = Object.keys(data.targets).map(e => {
                        return { text: e };
                    });
                    this.scheme.apptitle = this.filehandle.path;
                    this.options = data;
                    this.options.root = this.filehandle.parent().path;
                    this.targets.data = targets;
                    this.logger.info(__("Loaded: {0}", this.filehandle.path));
                })
                    .catch((e) => this.logger.error(__("Unable to load build file: {0}: {1}", this.filehandle.path, e.toString())));
            }
            compile(stages) {
                return new Promise(async (resolve, reject) => {
                    try {
                        this.logger.clear();
                        await this.sdk.batch(stages, this.options);
                        resolve("OK");
                    }
                    catch (e) {
                        reject(__e(e));
                    }
                });
            }
        }
        application.SDKBuilder = SDKBuilder;
    })(application = OS.application || (OS.application = {}));
})(OS || (OS = {}));
