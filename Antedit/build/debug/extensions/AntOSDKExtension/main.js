
(function() {
    // import the CodePad application module
    const App = this.OS.application.Antedit;
    // define the extension
    App.extensions.AntOSDKExtension = class AntOSDKExtension extends App.EditorBaseExtension {
        constructor(app) {
          super("AntOSDKExtension",app);
          this.sdk = undefined;
          this.last_target = undefined;
        }
        init(){
          if(! OS.API.AntOSDKBuilder)
          {
            throw new Error(__("{0} is not installed, please install it", "libantosdk").__());
            return;
          }
          if(!this.sdk)
          {
            this.sdk = new OS.API.AntOSDKBuilder(this.logger(),"");
          }
          this.logger().clear();
        }
        create() {
          this.init();
          this.app
                .openDialog("FileDialog", {
                    title: "__(New AntOS package at)",
                    file: { basename: "PackageName" },
                    mimes: ["dir"],
                })
                .then((d) => {
                    return this.mktpl(d.file.path, d.name);
                });
        }

        build() {
          this.init();
          this.metadata("build.json")
            .then(async (options) => {
              try{
                const targets = Object.keys(options.targets).map(e =>{
                  return {text: e};
                } );
                console.log(targets);
                const target = await this.app.openDialog("SelectionDialog",{
                  title: __("Select a build target"),
                  data: targets
                });
                this.last_target = target.text;
                await this.app.load(this.sdk.batch([target.text], options));
              }
              catch(error)
              {
                this.logger().error(__("Unable to read build options:{0}", error.stack));
              }
            })
            .catch((e) => this.logger().error(__("Unable to read meta-data:{0}", e.stack)));
        }
        load_lib(){
          this.init();
          OS.API.VFS.read_files([
            "sdk://core/ts/jquery.d.ts",
            "sdk://core/ts/antos.d.ts"
          ]).then((results) => {
            for(const content of results)
            {
              monaco.languages.typescript.typescriptDefaults.addExtraLib(content, "");
            }
            this.logger().info(__("Dev packages loaded"));
          })
          .catch((e) => this.logger().error(__("Unable to load AntOS dev packages:{0}", e.stack)));
        }
        build_last()
        {
          this.init();
          if(!this.last_target)
          {
            return this.build();
          }
          this.metadata("build.json")
            .then(async (options) => {
              try{
                await this.app.load(this.sdk.batch([this.last_target], options));
              }
              catch(error)
              {
                this.logger().error(__("Unable to read build options:{0}", error.stack));
              }
            })
            .catch((e) => this.logger().error(__("Unable to read meta-data:{0}", e.stack)));
        }

        run(){
          this.metadata("/build/debug/package.json")
            .then((v) => {
                v.text = v.name;
                v.path = `${v.root}/build/debug/`;
                v.filename = v.pkgname;
                v.type = "app";
                v.mime = "antos/app";
                if (v.icon) {
                    v.icon = `${v.path}/${v.icon}`;
                }
                if (!v.iconclass && !v.icon) {
                    v.iconclass = "fa fa-adn";
                }
                this.logger().info(__("Installing..."));
                OS.setting.system.packages[v.pkgname] = v;
                if(v.app)
                {
                  this.logger().info(__("Running {0}...", v.app));
                  return OS.GUI.forceLaunch(v.app, []);
                }
                this.logger().error(__("{0} is not an application", v.pkgname));
            })
            .catch((e) => this.logger().error(__("Unable to read package meta-data:{0}", e.stack)));
        }

        cleanup() {
          if(this.sdk)
          {
            this.sdk = undefined;
          }
        }

        /*basedir() {
          return "home://workspace/antos-codepad-extensions/AntOSDKExtension"
        }*/

        mktpl(path,name){
          const rpath = `${path}/${name}`;
            const dirs = [
                rpath,
                `${rpath}/build`,
                `${rpath}/build/release`,
                `${rpath}/build/debug`,
            ];
            const files = [
                [`tpl/main.tpl`, `${rpath}/main.ts`],
                [`tpl/build.tpl`, `${rpath}/build.json`],
                [`tpl/package.tpl`, `${rpath}/package.json`],
                [`tpl/README.tpl`, `${rpath}/README.md`],
                [`tpl/scheme.tpl`, `${rpath}/scheme.html`],
            ];
            OS.API.VFS.mkdirAll(dirs, true)
                .then(async () => {
                    try {
                        await OS.API.VFS.mktpl(files, this.basedir(), (data)=>{
                            return data.format(name, `${path}/${name}`);
                        });
                        this.app.currdir = rpath.asFileHandle();
                        this.app.toggleSideBar();
                        return this.app.eum.active.openFile(
                            `${rpath}/main.ts`.asFileHandle()
                        );
                    } catch (e) {
                        return this.logger().error(
                            __("Unable to create package from template: {0}",
                                e.stack)
                        );
                    }
                })
                .catch((e) =>
                    this.logger().error(__("Unable to create extension directories: {0}", e.stack))
                );
        }
    
    };
    App.extensions.AntOSDKExtension.dependencies = [
      "pkg://libantosdk/main.js"
    ];
}).call(this);