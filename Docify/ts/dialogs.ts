namespace OS {
    export namespace application {
        export namespace docify {
            export class OwnerDialog extends OS.GUI.BasicDialog {
                private oview: GUI.tag.ListViewTag;
                constructor() {
                    super("OwnerDialog", OwnerDialog.scheme);
                }
                    
                main() {
                    super.main();
                    this.oview = this.find("ownview") as GUI.tag.ListViewTag;
                    if(!this.data.dbhandle)
                    {
                        throw new Error(__("Unable to get owner data handle").__());
                    }

                    this.oview.buttons = [
                        {
                            text: "",
                            iconclass: "fa fa-plus-circle",
                            onbtclick: async (e: any) => {
                                try
                                {
                                    const d = await this.openDialog("PromptDialog", {
                                        title: __("Owner"),
                                        label: __("Name")
                                    });
                                    this.data.dbhandle.cache = { name: d };
                                    const r = await this.data.dbhandle.write(undefined);
                                    if(r.error)
                                    {
                                        throw new Error(r.error);
                                    }
                                    await this.owner_refresh();
                                }
                                catch(e)
                                {
                                    this.error(e.toString(), e);
                                }
                            }
                        },
                        {
                            text: "",
                            iconclass: "fa fa-minus-circle",
                            onbtclick: async (e: any) => {
                                try{
                                    const item = this.oview.selectedItem;
                                    if (!item) { return; }
                                    let d = await this.ask({ text:__("Do you realy want to delete: `{0}`", item.data.text)});
                                    if (!d) { return; }
                                    const handle = item.data.$vfs as API.VFS.BaseFileHandle;
                                    let r = await handle.remove();
                                    if(r.error)
                                    {
                                        throw new Error(r.error.toString());
                                    }
                                    await this.owner_refresh();
                                }
                                catch(e)
                                {
                                    this.error(e.toString(), e);
                                }
                            }
                        },
                        {
                            text: "",
                            iconclass: "fa fa-pencil-square-o",
                            onbtclick: async (e: any) => {
                                try
                                {
                                    const item = this.oview.selectedItem;
                                    if (!item) { return; }
                                    const d = await this.openDialog("PromptDialog", {
                                        title: __("Owner"),
                                        label: __("Name"),
                                        value: item.data.name
                                    });
                                    const handle = item.data.$vfs as API.VFS.BaseFileHandle;
                                    handle.cache = { name: d };
                                    const r = await handle.write(undefined);
                                    if(r.error)
                                    {
                                        throw new Error(r.error.toString());
                                    }
                                    await this.owner_refresh();
                                }
                                catch(e)
                                {
                                    this.error(e.toString(), e);
                                }
                            }
                        }
                    ];
                    return this.owner_refresh();
                }
                
                private async owner_refresh() {

                    const d = await this.data.dbhandle.read();
                    for (let v of d) { v.text = v.name; }
                    this.oview.data = d;
                }
            }

            OwnerDialog.scheme = `\
<afx-app-window width='200' height='300'>
    <afx-vbox>
        <afx-list-view data-id="ownview"></afx-list-view>
    </afx-vbox>
</afx-app-window>\
            `;

            export class DocDialog extends OS.GUI.BasicDialog {
                private flist: GUI.tag.ListViewTag;
                private dlist: GUI.tag.ListViewTag;
                private mlist: GUI.tag.ListViewTag;
                private ylist: GUI.tag.ListViewTag;
                private olist: GUI.tag.ListViewTag;
                constructor() {
                    super("DocDialog", DocDialog.scheme);
                }
                    
                main() {
                    let d: number;
                    super.main();
                    this.flist = this.find("file-list") as GUI.tag.ListViewTag;
                    this.dlist = this.find("dlist") as GUI.tag.ListViewTag;
                    this.mlist = this.find("mlist") as GUI.tag.ListViewTag;
                    this.ylist = this.find("ylist") as GUI.tag.ListViewTag;
                    this.olist = this.find("olist") as GUI.tag.ListViewTag;
                    const app = this.parent as Docify;
                    const target=app.setting.docpath.asFileHandle();
                    const dbhandle=`sqlite://${target.genealogy.join("/")}/docify.db@owners`.asFileHandle();
                    dbhandle.read()
                        .then((d) => {
                            if (d.error) { return this.error(d.error); }
                            for (let v of d) {
                                v.text = v.name;
                                v.selected = this.data && (this.data.oid === v.id);
                            }
                            this.olist.data = d;
                            if (!this.olist.selectedItem) { return this.olist.selected = 0; }
                    }).catch((e) => {
                            return this.error(__("Unable to fetch owner list: {0}", e.toString()), e);
                    });
                    
                    this.dlist.push({
                        text:"None",
                        value: 0
                    });
                    let selected = 0;
                    for (d = 1; d <= 31; d++) {
                        this.dlist.push({
                            text:`${d}`,
                            value: d
                        });
                        if (this.data && (parseInt(this.data.day) === d)) { selected = d; }
                    }
                    this.dlist.selected = selected;
                    
                    this.mlist.push({
                        text:"None",
                        value: 0
                    });
                    selected = 0;
                    for (d = 1; d <= 12; d++) {
                        this.mlist.push({
                            text:`${d}`,
                            value: d
                        });
                        if (this.data && (parseInt(this.data.month) === d)) { selected = d; }
                    }
                    this.mlist.selected = selected;
                    
                    this.ylist.push({
                        text:"None",
                        value: 0
                    });
                    this.ylist.selected = 0;
                    for (let y = 1960, end = new Date().getFullYear(), asc = 1960 <= end; asc ? y <= end : y >= end; asc ? y++ : y--) {
                        this.ylist.push({
                            text:`${y}`,
                            value: y,
                            selected: this.data && (parseInt(this.data.year) === y)
                        });
                    }
                    
                    this.flist.buttons = [
                        {
                            text: "",
                            iconclass: "fa fa-plus-circle",
                            onbtclick: (e: any) => {
                                return this.openDialog(new FilePreviewDialog(), {
                                    app: app
                                })
                                    .then((d: { text: any; filename: any; }) => {
                                        d.text = d.filename;
                                        return this.flist.push(d);
                                });
                            }
                        },
                        {
                            text: "",
                            iconclass: "fa fa-minus-circle",
                            onbtclick: (e: any) => {
                                const item = this.flist.selectedItem;
                                if (!item) { return; }
                                return this.flist.delete(item);
                            }
                        }
                    ];
                    this.flist.onlistselect = async (e) => {
                        return await app.preview(e.data.item.data.path, this.find("preview-canvas") as HTMLCanvasElement);
                    };
                    
                    (this.find("btsave") as GUI.tag.ButtonTag).onbtclick = (e: any) => {
                        const data: GenericObject<any> = {
                            name: (this.find("title") as HTMLInputElement).value.trim(),
                            day: this.dlist.selectedItem.data.value,
                            month: this.mlist.selectedItem.data.value,
                            year: this.ylist.selectedItem.data.value,
                            file: (Array.from(this.flist.data).map((v: { path: any; }) => v.path)),
                            note: (this.find("note") as HTMLTextAreaElement).value.trim(),
                            tags: (this.find("tag") as HTMLInputElement).value.trim(),
                            oid: parseInt(this.olist.selectedItem.data.id)
                        };
                        if (!data.name || (data.title === "")) { return this.notify(__("Please enter title")); }
                        if (!(data.file.length > 0)) { return this.notify(__("Please attach files to the entry")); }
                        
                        if (this.handle) { this.handle(data); }
                        return this.quit();
                    };
                    
                    if (!this.data) { return; }
                    (this.find("title") as HTMLInputElement).value = this.data.name;
                    (this.find("note") as HTMLTextAreaElement).value = this.data.note;
                    (this.find("tag") as HTMLInputElement).value = this.data.tags;
                    const file = this.data.file.asFileHandle();
                    file.text = file.filename;
                    return this.flist.data = [ file ];
                }
            }
                    

            DocDialog.scheme = `\
<afx-app-window width='600' height='400'>
    <afx-hbox>
        <afx-vbox data-width="350">
            <afx-hbox data-height="30">
                <afx-label text = "__(title)" data-width="50"></afx-label>
                <input type="text" data-id="title"></input>
            </afx-hbox>
            <afx-hbox data-height="30">
                <afx-label text = "__(Day)" data-width="50"></afx-label>
                <afx-list-view dropdown="true" data-id="dlist"></afx-list-view>
                <afx-label text = "__(Month)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true" data-id="mlist"></afx-list-view>
                <afx-label text = "__(Year)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true" data-id="ylist"></afx-list-view>
            </afx-hbox>
            <afx-label text = "__(Files)" data-height="22"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
            <afx-label text = "__(Note)" data-height="22"></afx-label>
            <textarea data-id="note"></textarea>
            <afx-hbox data-height = "30">
                <afx-label text = "__(Owner)" data-width="50"></afx-label>
                <afx-list-view dropdown="true" data-id="olist"></afx-list-view>
                <afx-label text = "__(Tags)" data-width="50"></afx-label>
                <input type="text" data-id="tag"></input>
            </afx-hbox>
        </afx-vbox>
        <afx-vbox>
            <div data-id = "preview-container">
                <canvas data-id="preview-canvas"></canvas>
            </div>
            <div style="text-align: right;" data-height="35" >
                <afx-button text="__(Save)" data-id="btsave" ></afx-button>
            </div>
        </afx-vbox>
    </afx-hbox>
</afx-app-window>\
            `;

            export class FilePreviewDialog extends OS.GUI.BasicDialog {
                private flist: GUI.tag.ListViewTag;
                constructor() {
                    super("FilePreviewDialog", FilePreviewDialog.scheme);
                }
                    
                main() {
                    super.main();
                    this.flist = this.find("file-list") as GUI.tag.ListViewTag;
                    this.flist.buttons = [
                        {
                            text: "",
                            iconclass: "fa  fa-refresh",
                            onbtclick: (e: any) => this.refresh()
                        }
                    ];
                    const app = this.data.app as Docify;

                    this.flist.onlistselect = async (e) => {
                        // console.log e.data.item.data
                        return await app.preview(e.data.item.data.path, this.find("preview-canvas") as HTMLCanvasElement);
                    };
                    (this.find("btok") as GUI.tag.ButtonTag).onbtclick = (e: any) => {
                        const item = this.flist.selectedItem;
                        if (!item) { return this.quit(); }
                        if (this.handle) { this.handle(item.data); }
                        return this.quit();
                    };
                    
                    return this.refresh();
                }
                
                async refresh() {
                    try
                    {
                        const app = this.data.app as Docify;
                        const d = await `${app.setting.docpath}/unclassified`.asFileHandle().read();
                        if (d.error) { return this.error(d.error); }
                        for (let v of d.result) { v.text = v.filename; }
                        return this.flist.data = d.result.filter((e) => e.filename[0] !== '.');
                    }
                    catch(e)
                    {
                        return this.error(__("Unable to fetch unclassified file list: {0}", e.toString()), e);
                    }
                }
            }

            FilePreviewDialog.scheme = `\
<afx-app-window width='400' height='400' apptitle = "__(Document preview)">
    <afx-hbox>
        <afx-vbox data-width="150">
            <afx-label text = "__(Files)" data-height="25"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
        </afx-vbox>
        <afx-vbox>
            <div data-id = "preview-container">
                <canvas data-id="preview-canvas"></canvas>
            </div>
            <div style="text-align: right;" data-height="35" >
                <afx-button text="__(Ok)" data-id="btok" ></afx-button>
            </div>
            
        </afx-vbox>
    </afx-hbox>
</afx-app-window>\
            `;
        }
    }
}