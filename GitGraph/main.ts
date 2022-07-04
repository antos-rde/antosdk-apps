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
                const graph = new API.LibGitGraph({
                    target: this.find("git-graph")
                });
                graph.on_open_diff = (files) => {                    
                    this._gui.launch("Antedit", [])
                        .then((p) =>{
                            p.observable.one("launched",() =>(p as any).openDiff(files));
                        })
                        .catch(e => this.error(__("Unable to open diff with Antedit: {0}", e.toString()),e ));
                    
                }
                (this.find("btn-open") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    this.openDialog("FileDialog", {
                        title: __("Select a repository"),
                        type: "dir",

                    }).then((d) => {
                        (this.find("txt-repo") as GUI.tag.LabelTag).text = d.file.path;
                        graph.base_dir = d.file;
                    });
                };
                
            }
        }

        GitGraph.dependencies = ["pkg://GitGraph/libgitgraph.js"];
    }
}