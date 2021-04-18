
namespace OS {
    
    declare var JSZip: any;
    
    export namespace application {
        export type AnteditBaseExtension = typeof EditorBaseExtension;
    }
    /**
     *
     *
     * @class EditorBaseExtension
     */
    class EditorBaseExtension {
        static dependencies: string[];
        
        protected app: OS.application.Antedit;
        protected name: string;
        constructor(name:string, app: OS.application.Antedit) {
            this.app = app;
            this.name = name;
        }

        /**
         *
         *
         * @returns {Promise<any>}
         * @memberof EditorBaseExtension
         */
        preload(): Promise<any> {
            return API.require(OS.application.Antedit.extensions[this.name].dependencies);
        }

        
        /**
         *
         *
         * @protected
         * @returns {string}
         * @memberof EditorBaseExtension
         */
        protected basedir(): string {
            return `${this.app.meta().path}/extensions/${this.name}`;
        }

        /**
         *
         *
         * @protected
         * @param {(string | FormattedString)} m
         * @returns {void}
         * @memberof EditorBaseExtension
         */
        protected notify(m: string | FormattedString): void {
            return this.app.notify(m);
        }

        /**
         *
         *
         * @protected
         * @param {(string | FormattedString)} m
         * @param {Error} e
         * @returns {void}
         * @memberof EditorBaseExtension
         */
        protected error(m: string | FormattedString, e: Error): void {
            return this.app.error(m, e);
        }


        /**
         *
         *
         * @protected
         * @return {AnteditLogger} editor logger 
         * @memberof EditorBaseExtension
         */
        protected logger(): any {
            if (!this.app.setting.showBottomBar) {
                this.app.showOutput(true);
            }
            else {
                this.app.showOutput(false);
            }
            return this.app.logger;
        }

        /**
         *
         *
         * @protected
         * @param {string} file
         * @returns {Promise<GenericObject<any>>}
         * @memberof EditorBaseExtension
         */
        protected metadata(file: string): Promise<GenericObject<any>> {
            return new Promise((resolve, reject) => {
                if (!this.app.currdir) {
                    return reject(
                        API.throwe(__("Current folder is not found"))
                    );
                }
                `${this.app.currdir.path}/${file}`
                    .asFileHandle()
                    .read("json")
                    .then((data) => {
                        if (!data.root && this.app.currdir) {
                            data.root = this.app.currdir.path;
                        }
                        resolve(data);
                    })
                    .catch((e) => {
                        // try to ask user to select a folder
                        this.app.openDialog("FileDialog", {
                            title: __("Select build directory"),
                            root: this.app.currdir.path,
                            mimes: ["dir"]
                        })
                            .then((d) => {
                                `${d.file.path}/${file}`
                                    .asFileHandle()
                                    .read("json")
                                    .then((data) => {
                                        if (!data.root) {
                                            data.root = d.file.path;
                                        }
                                        resolve(data);
                                    })
                                    .catch((e1) => reject(e1))
                            })
                            .catch(
                                (e1) => reject(API.throwe(__("Unable to read meta-data"))
                                ))
                    });
            });
        }
    }
    
    EditorBaseExtension.dependencies = [];
    OS.application.Antedit.extensions = {};
    OS.application.Antedit.EditorBaseExtension = EditorBaseExtension;
    
    class EditorExtensionMaker extends EditorBaseExtension {
        constructor(app: OS.application.Antedit) {
            super("EditorExtensionMaker", app);
        }
        
        create(): void {
            this.logger().clear();
            this.app
                .openDialog("FileDialog", {
                    title: "__(New CodePad extension at)",
                    file: { basename: __("ExtensionName") },
                    mimes: ["dir"],
                })
                .then((d) => {
                    return this.mktpl(d.file.path, d.name);
                });
        }
        
        build(callback?: () => void): void {
            this.logger().clear();
            this.metadata("extension.json")
                .then(async (meta) => {
                    try {
                        const jsrc = await API.VFS.cat(meta.javascripts.map(v => `${meta.root}/${v}`),"");
                        
                        await `${meta.root}/build/debug/main.js`
                                .asFileHandle()
                                .setCache(jsrc)
                                .write("text/plain");
                                
                        await `${meta.root}/build/debug/extension.json`
                                .asFileHandle()
                                .setCache(meta.meta)
                                .write("object");
                                
                        await API.VFS.copy( meta.copies.map(v => `${meta.root}/${v}`),`${meta.root}/build/debug`);
                        this.logger().info(__("Files generated in {0}", `${meta.root}/build/debug`));
                        if(callback)
                            callback();
                    } catch (e) {
                        return this.logger().error(__("Unable to build extension:{0}", e.stack));
                    }
                })
                .catch((e) => this.logger().error(__("Unable to read meta-data:{0}", e.stack)));
        }
        
        run(): void {
            this.logger().clear();
            this.metadata("extension.json")
                .then(async (meta) => {
                    if(!meta || !meta.meta || !meta.meta.name)
                        return this.logger().error(__("Invalid extension meta-data"));
                    try {
                        const path = `${meta.root}/build/debug/main.js`;
                        if (API.shared[path]) {
                            delete API.shared[path];
                        }
                        await API.requires(path);
                        if (this.app.extensions[meta.meta.name] && this.app.extensions[meta.meta.name].cleanup)
                        {
                            this.app.extensions[meta.meta.name].cleanup();
                        }
                        this.app.extensions[meta.meta.name] =  new OS.application.Antedit.extensions[meta.meta.name](this.app); 
                        for (let v of meta.meta.actions) {
                            this.app.eum.addAction(meta.meta, v, (e_name, a_name) => {
                                this.app.loadAndRunExtensionAction(e_name, a_name, `${meta.root}/build`);
                            });
                        }
                        this.app.eum.active.getEditor().trigger(meta.meta.name, 'editor.action.quickCommand');
                    } catch (e) {
                        return this.logger().error(__("Unable to run extension:{0}", e.stack));
                    }
                })
                .catch((e) => this.logger().error(__("Unable to read meta-data:{0}", e.stack)));
        }
        
        release(): void {
            this.logger().clear();
            this.metadata("extension.json")
                .then((meta) => {
                    this.build(async () => {
                        try {
                            API.VFS.mkar(
                                `${meta.root}/build/debug`,
                                `${meta.root}/build/release/${meta.meta.name}.zip`
                            );
                            this.logger().info(__("Archive created at {0}", `${meta.root}/build/release/${meta.meta.name}.zip`));
                        } catch (e) {
                            return this.logger().error(
                                __("Unable to create archive: {0}",
                                    e.stack
                                ));
                        }
                    });
                })
                .catch((e) => this.logger().error(__("Unable to read meta-data: {0}", e.stack)));
        }
        
        install(): void {
            this.logger().clear();
            this.app
                .openDialog("FileDialog", {
                    title: "__(Select extension archive)",
                    mimes: [".*/zip"],
                })
                .then(async (d) => {
                    try {
                        await this.installZip(d.file.path);
                        this.logger().info(__("Extension installed"));
                        return this.app.loadExtensionMetaData();
                    } catch (e) {
                        return this.logger().error(__("Unable to install extension: {0}", e.stack));
                    }
                });
        }
        
        installFromURL(): void
        {
            this.logger().clear();
            this.app
                .openDialog("PromptDialog", {
                    title: __("Enter URI"),
                    label: __("Please enter extension URI:")
                })
                .then(async (v) => {
                    if(!v) return;
                    try {
                        await this.installZip(v);
                        this.logger().info(__("Extension installed"));
                        return this.app.loadExtensionMetaData();
                    } catch (e) {
                        return this.app.error(__("Unable to install extension: {0}", v));
                    }

                });
        }
        
        /**
         *
         *
         * @private
         * @param {string} path
         * @param {string} name
         * @memberof EditorExtensionMaker
         */
        private mktpl(path: string, name: string): void {
            const rpath = `${path}/${name}`;
            const dirs = [
                rpath,
                `${rpath}/build`,
                `${rpath}/build/release`,
                `${rpath}/build/debug`,
            ];
            const files = [
                ["main.tpl", `${rpath}/${name}.js`],
                ["meta.tpl", `${rpath}/extension.json`],
            ];
            API.VFS.mkdirAll(dirs)
                .then(async () => {
                    try {
                        await API.VFS.mktpl(files, this.basedir(), (data)=>{
                            return data.format(name, `${path}/${name}`);
                        });
                        this.app.currdir = rpath.asFileHandle();
                        this.app.toggleSideBar();
                        return this.app.eum.active.openFile(
                            `${rpath}/${name}.js`.asFileHandle() as application.EditorFileHandle
                        );
                    } catch (e) {
                        return this.logger().error(
                            __("Unable to create extension template: {0}",
                                e.stack)
                        );
                    }
                })
                .catch((e) =>
                    this.logger().error(__("Unable to create extension directories: {0}", e.stack))
                );
        }
        
        
        /**
         *
         *
         * @private
         * @param {string} path
         * @returns {Promise<any>}
         * @memberof EditorExtensionMaker
         */
        private installZip(path: string): Promise<void> {
            return new Promise((resolve, reject) => {
                API.requires("os://scripts/jszip.min.js")
                    .then(() => {
                        path.asFileHandle()
                            .read("binary")
                            .then((data) => {
                                JSZip.loadAsync(data)
                                    .then((zip: any) => {
                                        zip.file("extension.json").async("uint8array")
                                        .then((d) =>{
                                            const meta = JSON.parse(new TextDecoder("utf-8").decode(d));
                                            const pth = this.ext_dir(meta.name);
                                            const dir = [pth];
                                            const files = [];
                                            for (let name in zip.files) {
                                                const file = zip.files[name];
                                                if (file.dir) {
                                                    dir.push(pth + "/" + name);
                                                } else if(name != "extension.json") {
                                                    files.push(name);
                                                }
                                            }
                                            if (dir.length > 0) {
                                                API.VFS.mkdirAll(dir)
                                                    .then(() => {
                                                        this.installFiles(files, zip, meta)
                                                            .then(() => resolve())
                                                            .catch((e) =>
                                                                reject(__e(e))
                                                            );
                                                    })
                                                    .catch((e) => reject(__e(e)));
                                            } else {
                                                this.installFiles(files, zip, meta)
                                                    .then(() => resolve())
                                                    .catch((e) => reject(__e(e)));
                                            }
                                        })
                                        .catch(e => reject(__e(e)));
                                    })
                                    .catch((e: Error) => reject(__e(e)));
                            })
                            .catch((e) => reject(__e(e)));
                    })
                    .catch((e) => reject(__e(e)));
            });
        }
        
        
        private ext_dir(en: string): string
        {
            return `${this.app.meta().path}/extensions/${en}`;
        }
        
        /**
         *
         *
         * @private
         * @param {string[]} files
         * @param {*} zip
         * @param {GenericObject<any>} meta
         * @returns {Promise<any>}
         * @memberof EditorExtensionMaker
         */
        private installFiles(
            files: string[],
            zip: any,
            meta: GenericObject<any>
        ): Promise<void> {
            if (files.length === 0) {
                return this.installMeta(meta);
            }
            return new Promise((resolve, reject) => {
                const file = files.splice(0, 1)[0];
                const path = `${this.ext_dir(meta.name)}/${file}`;
                return zip
                    .file(file)
                    .async("uint8array")
                    .then((d: Uint8Array) => {
                        return path
                            .asFileHandle()
                            .setCache(new Blob([d], { type: "octet/stream" }))
                            .write("text/plain")
                            .then((r) => {
                                if (r.error) {
                                    return reject(r.error);
                                }
                                return this.installFiles(files, zip, meta)
                                    .then(() => resolve())
                                    .catch((e) => reject(__e(e)));
                            })
                            .catch((e) => reject(__e(e)));
                    })
                    .catch((e: Error) => reject(__e(e)));
            });
        }

        /**
         *
         *
         * @private
         * @param {GenericObject<any>} meta
         * @returns {Promise<void>}
         * @memberof EditorExtensionMaker
         */
        private installMeta(meta: GenericObject<any>): Promise<void> {
            return new Promise(async (resolve, reject) => {
                const file = `${this.ext_dir("")}/extensions.json`.asFileHandle();
                try {
                    const data = await file.read("json");
                    const names = [];
                    for (let v of data) {
                        names.push(v.name);
                    }
                    const idx = names.indexOf(meta.name);
                    if (idx >= 0) {
                        data.splice(idx, 1);
                    }
                    data.push(meta);
                    try {
                        await file.setCache(data).write("object");
                        return resolve();
                    } catch (e) {
                        return reject(__e(e));
                    }
                } catch (e_1) {
                    // try to create new file
                    try {
                        await file.setCache([meta]).write("object");
                        return resolve();
                    } catch (e_2) {
                        return reject(__e(e_2));
                    }
                }
            });
        }
    }
    OS.application.Antedit.extensions.EditorExtensionMaker = EditorExtensionMaker;
}
