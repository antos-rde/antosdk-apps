namespace OS {
    export namespace application {
        declare var pdfjsLib;
        declare var PDFLib;
    
        export class Docify extends BaseApplication {
            private catview: GUI.tag.ListViewTag;
            private docview: GUI.tag.ListViewTag;
            private docpreview: HTMLCanvasElement;
            private docgrid: GUI.tag.GridViewTag;
            
            private dbhandle: API.VFS.BaseFileHandle;
            private catdb: API.VFS.BaseFileHandle;
            private ownerdb: API.VFS.BaseFileHandle;
            private docdb: API.VFS.BaseFileHandle;

            constructor( args: any ) {
                super("Docify", args);
            }

            private async init_db() {
                try {
                    if (!this.setting.docpath) { return this.error(__("No configured docpath")); }

                    const target=this.setting.docpath.asFileHandle();
                    this.dbhandle=`sqlite://${target.genealogy.join("/")}/docify.db`.asFileHandle();
                    const tables = await this.dbhandle.read();
                    /**
                     * Init following tables if not exist:
                     * - categories
                     * - owners
                     * - docs
                    */
                    await `${this.setting.docpath}`.asFileHandle().mk("unclassified");
                    await `${this.setting.docpath}`.asFileHandle().mk("cache");
                    let r = undefined;
                    this.catdb = `${this.dbhandle.path}@categories`.asFileHandle();
                    if(!tables.categories)
                    {
                        this.dbhandle.cache = {
                            name:  "TEXT"
                        }
                        r = await this.dbhandle.write("categories");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        this.catdb.cache = {
                            name: "Uncategoried"
                        };
                        r = await this.catdb.write(undefined);
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    this.ownerdb = `${this.dbhandle.path}@owners`.asFileHandle();
                    if(!tables.owners)
                    {
                        this.dbhandle.cache = {
                            name: "TEXT",
                        }
                        r = await this.dbhandle.write("owners");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        this.ownerdb.cache = {
                            name: "None"
                        };
                        r = await this.ownerdb.write(undefined);
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    this.docdb = `${this.dbhandle.path}@docs`.asFileHandle();
                    if(!tables.docs)
                    {
                        this.dbhandle.cache = {
                            name: "TEXT NOT NULL",
                            ctime: "INTEGER",
                            day: "INTEGER",
                            month: "INTEGER",
                            year: "INTEGER",
                            cid: "INTEGER DEFAULT 0",
                            oid: "INTEGER DEFAULT 0",
                            file: "TEXT NOT NULL",
                            tags: "TEXT",
                            note: "TEXT",
                            mtime: "INTEGER",
                            //'FOREIGN KEY("oid")': 'REFERENCES "owners"("id") ON DELETE SET DEFAULT ON UPDATE NO ACTION',
                            //'FOREIGN KEY("cid")': 'REFERENCES "categories"("id") ON DELETE SET DEFAULT ON UPDATE NO ACTION',
                        }
                        r = await this.dbhandle.write("docs");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    return await this.cat_refresh();

                } 
                catch(e) {
                    this.error(__("Unable to init database file: {0}",e.toString()),e);
                    this.dbhandle = undefined;
                }
            }
            
            main() {
                
                if (!this.setting.printer) { this.setting.printer = ""; }
                pdfjsLib.GlobalWorkerOptions.workerSrc = "pkg://libpdfjs/pdf.worker.js".asFileHandle().getlink();

                this.catview = this.find("catview") as GUI.tag.ListViewTag;
                this.docview = this.find("docview") as GUI.tag.ListViewTag;
                this.docpreview = this.find("preview-canvas") as HTMLCanvasElement;
                this.docgrid = this.find("docgrid") as GUI.tag.GridViewTag;
                this.docgrid.header = [
                    { text: "", width: 100 },
                    { text: "" },
                ];
                (this.find("btdld") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    try {
                        const item = this.docview.selectedItem;
                        if (!item) { return; }
                        await item.data.file.asFileHandle().download();
                    }
                    catch(e)
                    {
                        this.error(__("Unable to download: {0}", e.toString()), e);
                    }
                };
                (this.find("btopen") as GUI.tag.ButtonTag).onbtclick = async (e) => {
                    try {
                        const item = this.docview.selectedItem;
                        if (!item) { return; }
                        const m = await item.data.file.asFileHandle().meta();
                        if (m.error)
                        { 
                            throw new Error(m.error);
                        }
                        return this._gui.openWith(m.result);
                    }
                    catch(e)
                    {
                        this.error(__("Unable to open file: {0}", e.toString()), e);
                    }
                };
                this.catview.buttons = [
                    {
                        text: "",
                        iconclass: "fa fa-plus-circle",
                        onbtclick:async (e) => {
                            try
                            {
                                const d = await this.openDialog("PromptDialog", {
                                    title: __("Category"),
                                    label: __("Name")
                                });
                                this.catdb.cache = { name: d };
                                const r = await this.catdb.write(undefined);
                                if (r.error)
                                {
                                    throw new Error(r.error.toString());
                                }
                                return await this.cat_refresh();
                            }
                            catch(e)
                            {
                                this.error(__("Unable to insert category: {0}", e.toString()), e);
                            }
                        }
                    },
                    {
                        text: "",
                        iconclass: "fa fa-minus-circle",
                        onbtclick: async (e) =>
                        {
                            try
                            {
                                const item = this.catview.selectedItem;
                                if (!item) { return; }
                                const d = await this.ask({ text:__("Do you realy want to delete: `{0}`", item.data.text)});
                                if (!d) { return; }

                                const r = await this.catdb.remove({
                                    where: {
                                        id: item.data.id
                                    }
                                });
                                if(r.error)
                                {
                                    throw new Error(r.error.toString());
                                }
                                await this.cat_refresh();
                            }
                            catch(e)
                            {
                                this.error(__("Unable delete category: {0}", e.toString()), e);
                            }
                        }
                    },
                    {
                        text: "",
                        iconclass: "fa fa-pencil-square-o",
                        onbtclick: async (_) => {
                            try
                            {
                                const item = this.catview.selectedItem;
                                if (!item) { return; };
                                const cat = item.data;
                                if (!cat) { return; }
                                const d = await this.openDialog("PromptDialog", {
                                    title: __("Category"),
                                    label: __("Name"),
                                    value: item.data.name 
                                });
                                const handle: API.VFS.BaseFileHandle = cat.$vfs;
                                handle.cache = { id: parseInt(item.data.id), name: d };
                                const r = await handle.write(undefined);
                                if(r.error)
                                {
                                    throw new Error(r.error.toString());
                                }
                                await this.cat_refresh();
                            }
                            catch(e)
                            {
                                this.error(__("Unable to update category: {0}", e.toString()), e);
                            }
                        }
                    }
                ];
                
                this.docview.onlistselect = async (evt) => {
                    try
                    {
                        this.clear_preview();
                        const item = evt.data.item;
                        if(!item) return;
                        const handle = item.data.$vfs as API.VFS.BaseFileHandle;
                        // TODO join owner here
                        const d = await handle.read();
                        await this.preview(d.file, this.docpreview);
                        const rows = [];
                        // TODO: if (d.result.fileinfo) { d.result.size = (d.result.fileinfo.size / 1024.0).toFixed(2) + " Kb"; }
                        const map = {
                            ctime: "Created on",
                            mtime: "Modified on",
                            note: "Note",
                            tags: "Tags",
                            name: "Title",
                            owner: "Owner",
                            edate: "Effective date",
                            file: "File",
                            size: "Size"
                        };
                        d.edate = `${d.day}/${d.month}/${d.year}`;
                        for (let key in d) {
                            let value = d[key];
                            const field = map[key];
                            if(key === "ctime" || key == "mtime")
                            {
                                value = (new Date(value*1000)).toDateString();
                            }
                            if (field) { rows.push([{text: field}, {text: value}]); }
                        }
                        return this.docgrid.rows = rows;
                    }
                    catch(e)
                    {
                        this.error(__("Unable to fetch document detail: {0}", e.toString()), e);
                    }
                };
                
                this.catview.onlistselect = (e) => {
                    this.clear_preview();
                    const item = e.data.item;
                    if (!item) { return; }
                    return this.update_doclist(item.data.id);
                };
                
                (this.find("bt-add-doc") as GUI.tag.ButtonTag).onbtclick = async (evt) => {
                    try
                    {
                        const catiem = this.catview.selectedItem;
                        if (!catiem) { return this.notify(__("Please select a category")); }
                        const data = await this.openDialog(new docify.DocDialog());
                        data.cid = parseInt(catiem.data.id);
                        const timestamp = Math.floor(Date.now() / 1000);
                        data.ctime = timestamp;
                        data.mtime = timestamp;
                        const r = await this.merge_files(data);
                        data.file = r.path;
                        /*if(r.error)
                        {
                            throw new Error(r.error.toString());
                        }
                        data.file = r.result;*/
                        this.docdb.cache = data;
                        const d = await this.docdb.write(undefined);
                        if(d.error)
                        {
                            throw new Error(d.error.toString());
                        }
                        if (d.result) { this.toast(d.result); }
                        this.update_doclist(catiem.data.id);
                        this.clear_preview();
                    }
                    catch(e)
                    {
                        this.error(__("Unable to add document: {0}", e.toString()), e);
                    }
                };
                
                (this.find("bt-del-doc") as GUI.tag.ButtonTag).onbtclick = async (evt) => {
                    try
                    {
                        const item = this.docview.selectedItem;
                        if (!item) { return; }
                        const d = await this.ask({ text: __("Do you really want to delete: `{0}`", item.data.name) });
                        if (!d) { return; }
                        let r = await this.docdb.remove({
                            where: {
                                id: item.data.id
                            }
                        }); 
                        if(r.error)
                        {
                            throw new Error(r.error.toString());
                        }
                        // delete file
                        try {
                            await item.data.file.asFileHandle().remove();
                            const thumb = await this.get_thumb_path(item.data.file);
                            await thumb.asFileHandle().remove();
                        }
                        catch(e)
                        {
                            console.log(e);
                        }
                        this.update_doclist(item.data.cid);
                        return this.clear_preview();
                    }
                    catch(e)
                    {
                        this.error(__("Unable to delete document: {0}", e.tostring()), e);
                    }
                };
                (this.find("bt-upload-doc") as GUI.tag.ButtonTag).onbtclick = async (evt) => {
                    try
                    {
                        await `${this.setting.docpath}/unclassified`.asFileHandle().upload();
                        this.toast(__("File uploaded"));
                    }
                    catch(e)
                    {
                        this.error(__("Unable to upload document: {0}", e.toString()), e);
                    }
                }
                (this.find("bt-edit-doc") as GUI.tag.ButtonTag).onbtclick = async (evt) => {
                    try
                    {
                        const item = this.docview.selectedItem;
                        const catiem = this.catview.selectedItem;
                        if (!item) { return; }
                        const data = await this.openDialog(new docify.DocDialog(), item.data);
                        data.cid = parseInt(catiem.data.id);
                        data.id = item.data.id;
                        const timestamp = Math.floor(Date.now() / 1000);
                        data.mtime = timestamp;
                        if(data.file.includes(item.data.file) && data.file.length == 1)
                        {
                            // nothing changes
                            data.file = item.data.file;
                        }
                        else
                        {
                            if(!data.file.includes(item.data.file))
                            {
                                // remove old file
                                try {
                                    console.log("remove old file", item.data.file);
                                    await item.data.file.asFileHandle().remove();
                                    const thumb = await this.get_thumb_path(item.data.file);
                                    await thumb.asFileHandle().remove();
                                }
                                catch(e)
                                {
                                    console.log(e);
                                }
                            }
                            // merge all PDF file
                            const merged_file = await this.merge_files(data);
                            data.file = merged_file.path;
                        }
                        data.mtime = Math.floor(Date.now() / 1000);
                        const handle = item.data.$vfs;
                        handle.cache = data;
                        const d = await handle.write(undefined);
                        if(d.error)
                        {
                            throw new Error(d.error);
                        }
                        this.toast(__("Document updated"));
                        this.update_doclist(catiem.data.id);
                        return this.clear_preview();
                    }
                    catch(e)
                    {
                        this.error(__("Unable to edit document metadata: {0}", e.toString()));
                    }
                };
                return this.initialize();
            }
            
            private async get_thumb_path(filepath: string| API.VFS.BaseFileHandle)
            {
                const path = filepath.asFileHandle().path;
                let thumb_name = await this.sha1(path.replace(this.setting.docpath,""));
                return `${this.setting.docpath}/cache/${thumb_name}.png`;
            }

            private async merge_files(data) {
                const paths: string[] = data.file;
                const cat = data.cid.toFixed(1).toString();
                const dir = `${this.setting.docpath}/${cat}`.asFileHandle();
                try{
                    await dir.onready();
                }
                catch(_)
                {
                    const ret = await dir.parent().mk(cat);
                    if(ret.error)
                    {
                        throw new Error(ret.error.toString());
                    }
                    await dir.onready();
                }
                const des_file = `${dir.path}/${new Date(Date.now()).getTime().toString()}.pdf`.asFileHandle();
                // concat the file
                const pdfdoc = await PDFLib.PDFDocument.create();
                let pages = [];
                for(const path of paths)
                {
                    const arr = await path.asFileHandle().read("binary");
                    const doc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                    const copiedpages = await pdfdoc.copyPages(doc, doc.getPageIndices());
                    pages = pages.concat(copiedpages);
                }
                for (let i = 0; i < pages.length; i++) {
                    await pdfdoc.insertPage(i, pages[i]);
                }
                const buffer =  await pdfdoc.save();
                des_file.cache = new Blob([buffer]);
                const ret = await des_file.write("binary");
                if(ret.error)
                {
                    throw new Error(ret.error.toString());
                }
                // move thumb file
                let src_tfile = await this.get_thumb_path(paths[0]);
                const dest_tfile = await this.get_thumb_path(des_file);
                try {
                    console.log("Move", src_tfile, "to", dest_tfile);
                    const ret = await src_tfile.asFileHandle().move(dest_tfile);
                    if(ret.error)
                    {
                        console.log(ret.error);
                    }
                }
                catch(e)
                {
                    console.log(e);
                }
                // remove other file and thumb file
                for(const path of paths)
                {
                    try{
                        src_tfile = await this.get_thumb_path(path);
                        console.log("'Remove file", path, src_tfile);
                        let  ret = await path.asFileHandle().remove();
                        if(ret.error)
                        {
                            console.log(ret);
                        }
                        ret = await src_tfile.asFileHandle().remove();
                        if(ret.error)
                        {
                            console.log(ret);
                        }
                    }
                    catch(e)
                    {
                        console.log(e);
                    }
                }
                return des_file;
            }

            private async update_doclist(cid: any) {
                try
                {
                    const d = await this.docdb.read({
                        where: {
                            cid: cid
                        },
                        order: ["year$desc", "month$desc", "day$desc"]
                    });
                    
                    if(d.error)
                    {
                        throw new Error(d.error);
                    }
                    for (let v of d)
                    {
                        v.text = v.name;
                    }
                    return this.docview.data = d;
                }
                catch(e)
                {
                    this.error(__("Unable to update document list: {0}", e.toString()), e);
                }
            }
            
            private clear_preview() {
                this.docpreview.getContext('2d').clearRect(0,0,this.docpreview.width,this.docpreview.height);
                return this.docgrid.rows = [];
            }

            private async sha1(str) {
                const enc = new TextEncoder();
                const hash = await crypto.subtle.digest('SHA-1', enc.encode(str));
                return Array.from(new Uint8Array(hash))
                    .map(v => (v.toString(16) as any).padStart(2, '0'))
                    .join('');
            }
            
            private async genthumb(path: string)
            {
                 /** try to search if the thumb file exists,
                 * if it does not exist, generate it using
                 * pdfjs library and an hidden canvas
                 */
                const tpath = await this.get_thumb_path(path);

                const file = tpath.asFileHandle();
                try {
                   await file.onready();
                }
                catch(e)
                {
                    // generate thumb file
                    //data = await file.read("binary");
                    console.log("Try to generate thumb file for", path);
                    const canvas = this.find("tmp-canvas") as HTMLCanvasElement;
                    const context = canvas.getContext('2d');
                    const pdf = await pdfjsLib.getDocument(path.asFileHandle().getlink()).promise;

                    const page = await pdf.getPage(1);

                    const viewport = page.getViewport({ scale: 0.33});
                    // Support HiDPI-screens.
                    const outputScale = window.devicePixelRatio || 1;

                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.style.width = Math.floor(viewport.width) + "px";
                    canvas.style.height =  Math.floor(viewport.height) + "px";

                    const transform = outputScale !== 1
                        ? [outputScale, 0, 0, outputScale, 0, 0]
                        : null;

                    const renderContext = {
                        canvasContext: context,
                        transform: transform,
                        viewport: viewport
                    };
                    await page.render(renderContext).promise;
                    const url = canvas.toDataURL('image/png');
                    file.cache = url;
                    const ret = await file.write("base64");
                    if(ret.error)
                    {
                        throw new Error(ret.error.toString());
                    }
                    await file.onready();
                }
                return file;
            }

            async preview(path: any, canvas: HTMLCanvasElement) {
                try {
                    const file = await this.genthumb(path);
                    const data = await file.read("binary");
                    const img = new Image();
                    //($ me.view).append img
                    img.onload = () => {
                        const context = canvas.getContext('2d');
                        canvas.height = img.height;
                        canvas.width = img.width;
                        return context.drawImage(img, 0, 0);
                    };
                    
                    const blob = new Blob([data], { type: file.info.mime });
                    return img.src = URL.createObjectURL(blob);
                }
                catch(e)
                {
                    this.error(__("Unable to generate document thumbnail: {0}", e.toString()), e);
                }
            }
            
            private cat_refresh(): Promise<any> {
                return new Promise(async (resolve, reject) => {
                    try {
                        this.docview.data = [];
                        this.clear_preview();
                        const d = await this.catdb.read();
                        for (let v of d) {
                            v.text = v.name;
                        }
                        return this.catview.data = d;
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                });
            }
            
            private async initialize() {
                try
                {
                    // Check if we have configured docpath
                    if (this.setting.docpath) {
                        // check data base
                        return await this.init_db();
                    } else
                    {
                        // ask user to choose a docpath
                        const d =  await this.openDialog("FileDialog", {
                            title:__("Please select a doc path"),
                            type: 'dir'
                        });
                        this.setting.docpath = d.file.path;
                        // save the doc path to local setting
                        //await this._api.setting();
                        return await this.init_db();
                    }
                }
                catch(e)
                {
                    this.error(__("Error initialize database: {0}", e.toString()), e);
                }
            }
            
            menu() {
                return [
                    {
                        text: "__(Options)",
                        nodes: [
                            { text: "__(Owners)", id:"owners"},
                            { text: "__(Preview)", id:"preview"},
                            { text: "__(Change doc path)", id:"setdocp"}
                        ],
                        onchildselect: (e) => this.fileMenuHandle(e.data.item.data.id)
                    }
                ];
            }
            
            private fileMenuHandle(id: any) {
                switch (id) {
                    case "owners":
                        return this.openDialog(new docify.OwnerDialog(), { 
                            title: __("Owners"),
                            dbhandle: this.ownerdb
                        });
                    case "preview":
                        return this.openDialog(new docify.FilePreviewDialog(), {
                            app: this
                        })
                            .then((d: { path: any; }) => {
                                return this.notify(d.path);
                        });
                    case "setdocp":
                        this.setting.docpath = undefined;
                        return this.initialize();
                }
            }
        }
        Docify.dependencies = [
            "pkg://SQLiteDB/libsqlite.js",
            "pkg://libpdfjs/pdf.js",
            "pkg://PDFLib/main.js"
        ];
    }
}