namespace OS {
    export namespace API
    {
        export declare class LibGitGraph
        {
            constructor(options:GenericObject<any>);
            base_dir: VFS.BaseFileHandle;
            on_open_diff: (file:VFS.BaseFileHandle[]) => void;
            list_file: (commit: string) => Promise<string[]>;
            get_changes: (file:string, commit: string) => Promise<string>;
            get_file: (file:string, commit: string) => Promise<string>
        }
    }
    export namespace application {
        /**
         *
         * @class GitGraph
         * @extends {BaseApplication}
         */
        export class GitGraph extends BaseApplication {
            constructor(args: AppArgumentsType[]) {
                super("GitGraph", args);
            }
            main(): void {
                let graph = new API.LibGitGraph({
                    target: this.find("git-graph")
                });
                graph.on_open_diff = (files) => {
                    console.log(files);
                    //(OS.PM.processes.Antedit[0] as any).openDiff(files)
                    
                    this._gui.launch("Antedit", [])
                        .then((p) =>{
                            p.observable.one("launched",() =>(p as any).openDiff(files));
                        });
                    
                }
                graph.base_dir = "home://workspace/antos/".asFileHandle();
            }
        }

        //GitGraph.dependencies = ["pkg://GitGraph/libgitgraph.js"];
    }
}