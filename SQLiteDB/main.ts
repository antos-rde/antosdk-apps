namespace OS {
    export namespace application {

        /**
         *
         * @class SQLiteDB
         * @extends {BaseApplication}
         */
        export class SQLiteDB extends BaseApplication {

            private filehandle: API.VFS.BaseFileHandle;
            private tbl_list: GUI.tag.ListViewTag;

            constructor(args: AppArgumentsType[]) {
                super("SQLiteDB", args);
            }

            menu() {
                return [
                    {
                        text: "__(File)",
                        nodes: [
                            {
                            text: "__(New)",
                            dataid: "new",
                            shortcut: 'A-N'
                            },
                            {
                            text: "__(Open)",
                            dataid: "open",
                            shortcut: 'A-O'
                            },
                        ],
                        onchildselect: (e) => {
                            switch (e.data.item.data.dataid) {
                            case "new":
                                return this.newFile();
                            case "open":
                                return this.openFile();
                            }
                        }
                    }
                ];
            }
            private list_tables()
            {
                this.filehandle.read()
                    .then((data) => {
                        const list = [];
                        for(let k in data)
                        {
                            list.push({
                                text: k,
                                name: k,
                                handle: data[k]
                            });
                        }
                        this.tbl_list.data = list;
                        if(list.length > 0)
                        {
                            this.tbl_list.selected = 0;
                        }
                    })
            }
            private openFile() {
                return this.openDialog("FileDialog", {
                    title: __("Open file"),
                    mimes: this.meta().mimes
                }).then(async (d) => {
                    this.filehandle = `sqlite://${d.file.path.asFileHandle().genealogy.join("/")}`.asFileHandle();
                    await this.filehandle.onready();
                    this.list_tables();
                })
                .catch((e) => {
                    this.error(__("Unable to open database file: {0}", e.toString()), e);
                });;
            }

            private newFile() {
                return this.openDialog("FileDialog", {
                    title: __("Save as"),
                    file: "Untitled.db"
                }).then(async (f) => {
                    var d;
                    d = f.file.path.asFileHandle();
                    if (f.file.type === "file") {
                        d = d.parent();
                    }
                    const target = `${d.path}/${f.name}`.asFileHandle();
                    this.filehandle  = `sqlite://${target.genealogy.join("/")}`.asFileHandle();
                    await this.filehandle.onready();
                    this.list_tables();
                })
                .catch((e) => {
                    this.error(__("Unable to init database file: {0}", e.toString()), e);
                });
            }

            main(): void {
                this.filehandle = undefined;
                this.tbl_list = this.find("tbl-list") as GUI.tag.ListViewTag;
                (this.find("bt-add-table") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    this.openDialog(new NewTableDialog(), {
                        title: __("Create new table")
                    });
                }
            }
        }


        class NewTableDialog extends GUI.BasicDialog {
            /**
             * Reference to the form container
             *
             * @private
             * @type {HTMLDivElement}
             * @memberof NewTableDialog
             */
            private container: HTMLDivElement;

            /**
             * Creates an instance of NewTableDialog.
             * @memberof NewTableDialog
             */
            constructor() {
                super("NewTableDialog");
            }
            
            /**
             * Main entry point
             *
             * @memberof NewTableDialog
             */
            main(): void {
                super.main();
                this.container = this.find("container") as HTMLDivElement;
                (this.find("btnCancel") as GUI.tag.ButtonTag).onbtclick = (e) => this.quit();
                (this.find("btnAdd") as GUI.tag.ButtonTag).onbtclick = (e) => this.addField("", "", true);
                $(this.find("wrapper"))
                $(this.container)
                    .css("overflow-y", "auto");
                (this.find("btnOk") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    const inputs = $("input", this.scheme) as JQuery<HTMLInputElement>;
                    let cdata: GenericObject<string> = {};
                    for (let i = 0; i < inputs.length; i += 2) {
                        const key = inputs[i].value.trim();
                        if (key === "") {
                            return this.notify(__("Key cannot be empty"));
                        }
                        if (cdata[key]) {
                            return this.notify(__("Duplicate key: {0}", key));
                        }
                        cdata[key] = inputs[i + 1].value.trim();
                    }
                    if (this.handle)
                        this.handle(cdata);
                    this.quit();
                }
            }


            /**
             * Add new input key-value field to the dialog
             *
             * @private
             * @memberof NewTableDialog
             */
            private addField(key: string, value: string, removable: boolean): void {
                const div = $("<div>")
                    .css("width", "100%")
                    .css("display", "flex")
                    .css("flex-direction", "row")
                    .appendTo(this.container);
                $("<input>")
                    .attr("type", "text")
                    .css("width", "50%")
                    .css("height", "25px")
                    .val(key)
                    .appendTo(div);
                $("<afx-list-view>")
                    .css("width", "50%")
                    .css("height", "25px")
                    .appendTo(div);
                if (removable) {
                    const btn = $("<afx-button>");
                    btn[0].uify(undefined);
                    $("button", btn)
                        .css("width", "25px")
                        .css("height", "25px");
                    (btn[0] as GUI.tag.ButtonTag).iconclass = "fa fa-minus";
                    btn
                        .on("click", () => {
                            div.remove();
                        })
                        .appendTo(div);
                }
                else {
                    $("<div>")
                        .css("width", "25px")
                        .appendTo(div);
                }

            }

        }

        /**
         * Scheme definition
         */
        NewTableDialog.scheme = `\
        <afx-app-window width='350' height='300'>
            <afx-hbox>
                <div data-width="10" ></div>
                <afx-vbox>
                    <div data-height="5" ></div>
                    <afx-label text="__(Table layout)" data-height="30"></afx-label>
                    <div data-id="container"></div>
                    <afx-hbox data-height="30">
                        <afx-button data-id = "btnAdd" iconclass="fa fa-plus" data-width = "30" ></afx-button>
                        <div ></div>
                        <afx-button data-id = "btnOk" text = "__(Ok)" data-width = "40" ></afx-button>
                        <afx-button data-id = "btnCancel" text = "__(Cancel)" data-width = "50" ></afx-button>
                    </afx-hbox>
                    <div data-height="5" ></div>
                </afx-vbox>
                <div data-width="10" ></div>
            </afx-hbox>
        </afx-app-window>`;
    }
}