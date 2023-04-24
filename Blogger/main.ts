// Copyright 2017-2018 Xuan Sang LE <xsang.le AT gmail DOT com>

// AnTOS Web desktop is is licensed under the GNU General Public
// License v3.0, see the LICENCE file for more information

// This program is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of 
// the License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
//along with this program. If not, see https://www.gnu.org/licenses/.
namespace OS {
    export namespace application {
        declare function renderMathInElement(el: HTMLElement):void;
        declare var EasyMDE;
        export class Blogger extends BaseApplication {

            private user: GenericObject<any>;
            private cvlist: GUI.tag.TreeViewTag;
            private inputtags: HTMLInputElement;
            private bloglist: GUI.tag.ListViewTag;
            private seclist: GUI.tag.ListViewTag;
            private tabcontainer: GUI.tag.TabContainerTag;
            private editor: GenericObject<any>;
            private previewOn: boolean;
            // datatbase objects
            private dbhandle: API.VFS.BaseFileHandle;
            // database handles
            private userdb: API.VFS.BaseFileHandle;
            private cvcatdb: API.VFS.BaseFileHandle;
            private cvsecdb: API.VFS.BaseFileHandle;
            private blogdb: API.VFS.BaseFileHandle;
            private subdb: API.VFS.BaseFileHandle;

            private last_ctime: number;

            constructor(args: any) {
                super("Blogger", args);
                this.previewOn = false;
            }

            private async init_db() {
                try {
                    const f = await this.openDialog("FileDialog",{
                        title: __("Open/create new database"),
                        file: "Untitled.db"
                    });
                    var d_1 = f.file.path.asFileHandle();
                    if(f.file.type==="file") {
                        d_1=d_1.parent();
                    }
                    const target=`${d_1.path}/${f.name}`.asFileHandle();
                    this.dbhandle=`sqlite://${target.genealogy.join("/")}`.asFileHandle();
                    const tables = await this.dbhandle.read();
                    /**
                     * Init following tables if not exist:
                     * - user
                     * - cvcat
                     * - cvsec
                     * - blogdb
                    */
                    if(!tables.user)
                    {
                        this.dbhandle.cache = {
                            address: "TEXT",
                            Phone: "TEXT",
                            shortbiblio: "TEXT",
                            fullname: "TEXT",
                            email: "TEXT",url: "TEXT",
                            photo:  "TEXT"
                        }
                        const r = await this.dbhandle.write("user");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    if(!tables.cv_cat)
                    {
                        this.dbhandle.cache = {
                            publish: "NUMERIC",
                            name: "TEXT",
                            pid: "NUMERIC"
                        }
                        const r = await this.dbhandle.write("cv_cat");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    if(!tables.cv_sections)
                    {
                        this.dbhandle.cache = {
                            title: "TEXT",
                            start: "NUMERIC",
                            location: "TEXT",
                            end: "NUMERIC",
                            content: "TEXT",
                            subtitle: "TEXT",
                            publish: "NUMERIC",
                            cid: "NUMERIC"
                        }
                        const r = await this.dbhandle.write("cv_sections");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    if(!tables.blogs)
                    {
                        this.dbhandle.cache = {
                            tags: "TEXT",
                            content: "TEXT",
                            utime: "NUMERIC",
                            rendered: "TEXT",
                            title: "TEXT",
                            utimestr: "TEXT",
                            ctime: "NUMERIC",
                            ctimestr: "TEXT",
                            publish: "INTEGER DEFAULT 0",
                        }
                        const r = await this.dbhandle.write("blogs");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    if(!tables.st_similarity)
                    {
                        this.dbhandle.cache = {
                            pid: "NUMERIC",
                            sid: "NUMERIC",
                            score: "NUMERIC"
                        }
                        const r = await this.dbhandle.write("st_similarity");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    if(!tables.subscribers)
                    {
                        this.dbhandle.cache = {
                            name: "TEXT",
                            email: "TEXT"
                        }
                        const r = await this.dbhandle.write("subscribers");
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                    }
                    this.userdb = `${this.dbhandle.path}@user`.asFileHandle();
                    this.cvcatdb = `${this.dbhandle.path}@cv_cat`.asFileHandle();
                    this.cvsecdb = `${this.dbhandle.path}@cv_sections`.asFileHandle();
                    this.blogdb = `${this.dbhandle.path}@blogs`.asFileHandle();
                    this.subdb = `${this.dbhandle.path}@subscribers`.asFileHandle();

                    this.last_ctime = 0;
                    this.bloglist.data = [];
                    this.loadBlogs();
                } 
                catch(e) {
                    this.error(__("Unable to init database file: {0}",e.toString()),e);
                    this.dbhandle = undefined;
                }
            }

            menu() {
                return [
                    {
                        text: "__(Open/Create database)",
                        onmenuselect: (e) => {
                            this.init_db();
                        }
                    }
                ];
            }

            main() {
                this.user = {};
                this.cvlist = this.find("cv-list") as GUI.tag.TreeViewTag;
                this.cvlist.ontreeselect = (d) => {
                    if (!d) { return; }
                    const {
                        data
                    } = d.data.item;
                    return this.CVSectionByCID(Number(data.id));
                };

                this.inputtags = this.find("input-tags") as HTMLInputElement;
                this.bloglist = this.find("blog-list") as GUI.tag.ListViewTag;
                this.seclist = this.find("cv-sec-list") as GUI.tag.ListViewTag;

                let el = this.find("photo") as HTMLInputElement;
                $(el)
                    .on("click", async (e: any) => {
                        try {
                            const ret = await this.openDialog("FileDialog", {
                                title: __("Select image file"),
                                mimes: ["image/.*"]
                            });
                            return el.value = ret.file.path;
                        } catch (e) {
                            return this.error(__("Unable to get file"), e);
                        }
                    });

                this.tabcontainer = this.find("tabcontainer") as GUI.tag.TabContainerTag;
                this.tabcontainer.ontabselect = (e) => {
                    return this.fetchData((e.data.container as GUI.tag.TileLayoutTag).aid);
                };

                (this.find("bt-user-save") as GUI.tag.ButtonTag).onbtclick = (e: any) => {
                    return this.saveUser();
                };

                (this.find("blog-load-more") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    this.loadBlogs();
                }

                (this.find("cv-cat-add") as GUI.tag.ButtonTag).onbtclick = async (e: any) => {
                    try {
                        const tree = await this.fetchCVCat();
                        const d = await this.openDialog(new blogger.BloggerCategoryDialog(), {
                            title: __("Add category"),
                            tree
                        });
                        this.cvcatdb.cache = {
                            name: d.value,
                            pid: d.p.id,
                            publish: 1
                        };
                        const r = await this.cvcatdb.write(undefined);
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        await this.refreshCVCat();
                    }
                    catch(e)
                    {
                        this.error(__("cv-cat-add: {0}", e.toString()), e);
                    }
                };

                (this.find("cv-cat-edit") as GUI.tag.ButtonTag).onbtclick = async (e: any) => {
                    try {
                        const sel = this.cvlist.selectedItem;
                        if (!sel) { return; }
                        const cat = sel.data;
                        if (!cat) { return; }
                        const tree = await this.fetchCVCat();
                        const d = await this.openDialog(new blogger.BloggerCategoryDialog(), {
                                title: __("Edit category"),
                                tree, cat
                        });
                        const handle = cat.$vfs;
                        handle.cache = {
                            id: cat.id,
                            publish: cat.publish,
                            pid: d.p.id,
                            name: d.value
                        };

                        const r = await handle.write(undefined);
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        await this.refreshCVCat();
                    }
                    catch(e)
                    {
                        this.error(__("cv-cat-edit: {0}", e.toString()), e);
                    }
                };

                (this.find("cv-cat-del") as GUI.tag.ButtonTag).onbtclick = async (e: any) => {
                    try {
                        const sel = this.cvlist.selectedItem;
                        if (!sel) { return; }
                        const cat = sel.data;
                        if (!cat) { return; }
                        const d = await this.openDialog("YesNoDialog", {
                            title: __("Delete category"),
                            iconclass: "fa fa-question-circle",
                            text: __("Do you really want to delete: {0}?", cat.name)
                        });
                        if (!d) { return; }
                        await this.deleteCVCat(cat);
                    }
                    catch(e)
                    {
                         this.error(__("cv-cat-del: {0}", e.toString()), e);
                    }
                };

                (this.find("cv-sec-add") as GUI.tag.ButtonTag).onbtclick = async (e: any) => {
                    try
                    {
                        const sel = this.cvlist.selectedItem;
                        if (!sel) { return; }
                        const cat = sel.data;
                        if (!cat || (cat.id === "0")) { return this.toast(__("Please select a category")); }
                        const d = await this.openDialog(new blogger.BloggerCVSectionDiaglog(), {
                            title: __("New section entry for {0}", cat.name)
                        });
                        d.cid = Number(cat.id);
                        d.start = Number(d.start);
                        d.end = Number(d.end);
                        this.cvsecdb.cache = d;
                            // d.publish = 1
                        const r = await this.cvsecdb.write(undefined);
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        await this.CVSectionByCID(Number(cat.id));
                    }
                    catch(e)
                    {
                        this.error(__("cv-sec-add: {0}", e.toString()), e);
                    }
                };

                (this.find("cv-sec-move") as GUI.tag.ButtonTag).onbtclick =  async (e: any) => {
                    try {
                        const sel = this.seclist.selectedItem;
                        if (!sel) { return this.toast(__("Please select a section to move")); }
                        const sec = sel.data;
                        const handle = sec.$vfs;
                        console.log(handle);
                        const tree = await this.fetchCVCat();
                        const d = await this.openDialog(new blogger.BloggerCategoryDialog(), {
                                title: __("Move to"),
                                tree,
                                selonly: true
                            });
                            handle.cache = {
                                id: sec.id,
                                cid: d.p.id
                            };
                            const r = await handle.write(undefined);
                            if(r.error)
                            {
                                throw new Error(r.error as string);
                            }
                            await this.CVSectionByCID(sec.cid);
                            this.seclist.unselect();
                    }
                    catch(e)
                    {
                        this.error(__("cv-sec-move: {0}", e.toString()), e);
                    }
                };

                (this.find("cv-sec-edit") as GUI.tag.ButtonTag).onbtclick = async (e: any) => {
                    try {
                        const sel = this.seclist.selectedItem;
                        if (!sel) { return this.toast(__("Please select a section to edit")); }
                        const sec = sel.data;
                        const d = await this.openDialog(new blogger.BloggerCVSectionDiaglog(), {
                            title: __("Modify section entry"),
                            section: sec
                        });
                        d.cid = Number(sec.cid);
                        d.start = Number(d.start);
                        d.end = Number(d.end);
                        
                        const handle = sec.$vfs;
                        handle.cache = d;
                        //d.publish = Number sec.publish
                        const r = await handle.write(undefined);
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        await this.CVSectionByCID(Number(sec.cid));
                    }
                    catch(e)
                    {
                        this.error(__("cv-sec-edit: {0}", e.toString()), e);
                    }
                };

                this.seclist.onitemclose = (evt) => {
                    if (!evt) { return; }
                    const data = evt.data.item.data;
                    this.openDialog("YesNoDialog", {
                        iconclass: "fa fa-question-circle",
                        text: __("Do you really want to delete: {0}?", data.title)
                    }).then(async (b: any) => {
                        if (!b) { return; }
                        try {
                            const r = await this.cvsecdb.remove({
                                where: {
                                    id: data.id
                                }
                            });
                            if(r.error)
                            {
                                throw new Error(r.error as string);
                            }
                            return this.seclist.delete(evt.data.item);
                        } catch(e) {
                            return this.error(__("Cannot delete the section: {0}",e.toString()),e);
                        }
                    });
                    return false;
                };

                this.editor = new EasyMDE({
                    element: this.find("markarea"),
                    autoDownloadFontAwesome: false,
                    autofocus: true,
                    tabSize: 4,
                    indentWithTabs: true,
                    toolbar: [
                        {
                            name: __("New"),
                            className: "fa fa-file",
                            action: (e: any) => {
                                this.bloglist.unselect();
                                return this.clearEditor();
                            }
                        },
                        {
                            name: __("Save"),
                            className: "fa fa-save",
                            action: (e: any) => {
                                return this.saveBlog();
                            }
                        }
                        , "|", "bold", "italic", "heading", "|", "quote", "code",
                        "unordered-list", "ordered-list", "|", "link",
                        "image", "table", "horizontal-rule",
                        {
                            name: "image",
                            className: "fa fa-file-image-o",
                            action: (_) => {
                                return this.openDialog("FileDialog", {
                                    title: __("Select image file"),
                                    mimes: ["image/.*"]
                                }).then((d) => {
                                    return d.file.path.asFileHandle().publish()
                                        .then((r: { result: any; }) => {
                                            const doc = this.editor.codemirror.getDoc();
                                            return doc.replaceSelection(`![](${this._api.handle.shared}/${r.result})`);
                                        }).catch((e: any) => this.error(__("Cannot export file for embedding to text"), e));
                                });
                            }
                        },
                        {
                            name: "Youtube",
                            className: "fa fa-youtube",
                            action: (e: any) => {
                                const doc = this.editor.codemirror.getDoc();
                                return doc.replaceSelection("[[youtube:]]");
                            }
                        },
                        "|",
                        {
                            name: __("Preview"),
                            className: "fa fa-eye no-disable",
                            action: (e: any) => {
                                this.previewOn = !this.previewOn;
                                EasyMDE.togglePreview(e);
                                ///console.log @select ".editor-preview editor-preview-active"
                                renderMathInElement(this.find("editor-container"));
                            }
                        },
                        "|",
                        {
                            name: __("Send mail"),
                            className: "fa fa-paper-plane",
                            action: async (e: any) => {
                                try {
                                    const d = await this.subdb.read();
                                    const sel = this.bloglist.selectedItem;
                                    if (!sel) { return this.error(__("No post selected")); }
                                    const data = sel.data;
                                    await this.openDialog(new blogger.BloggerSendmailDiaglog(), {
                                        title: __("Send mail"),
                                        content: this.editor.value(),
                                        mails: d,
                                        id: data.id
                                    });
                                    this.toast(__("Emails sent"));
                                }
                                catch(e)
                                {
                                    this.error(__("Error sending mails: {0}", e.toString()), e);
                                }
                            }
                        },
                        "|",
                        {
                            name: __("TFIDF analyse"),
                            className: "fa fa-area-chart",
                            action: async (e: any) => {
                                try {
                                    const q = await this.openDialog("PromptDialog",{
                                        title: __("TFIDF Analyse"),
                                        text: __("Max number of related posts to keep per post?"),
                                        value: "5"
                                    });
                                    const data = {
                                        path: `${this.meta().path}/api/ai/analyse.lua`,
                                        parameters: {
                                            dbpath: this.dbhandle.info.file.path,
                                            top: parseInt(q)
                                        }
                                    };
                                    const d = await this._api.apigateway(data, false);
                                    if (d.error) {
                                        throw new Error(d.error);
                                    }
                                    this.toast(d.result);
                                }
                                catch(e)
                                {
                                    this.error(__("Error analysing posts: {0}", e.toString()), e);
                                }
                            }
                        }
                    ]
                });

                this.bloglist.onlistselect = async (e: any) => {
                    const el = this.bloglist.selectedItem;
                    if (!el) { return; }
                    const sel = el.data;
                    if (!sel) { return; }
                    try {
                        const result=await this.blogdb.read({
                            where: {
                                id: Number(sel.id)
                            }
                        });
                        if(!result || result.length == 0)
                        {
                            throw new Error(__("No record found for ID {}", sel.id).__());
                        }
                        const r = result[0];
                        this.editor.value(r.content);
                        this.inputtags.value=r.tags;
                        return (this.find("blog-publish") as GUI.tag.SwitchTag).swon=Number(r.publish)? true:false;
                        }
                    catch(e_1) {
                        return this.error(__("Cannot fetch the entry content"),e_1);
                    }
                };

                this.bloglist.onitemclose = (e) => {
                    if (!e) { return; }
                    const el = e.data.item;
                    const data = el.data;
                    this.openDialog("YesNoDialog", {
                        title: __("Delete a post"),
                        iconclass: "fa fa-question-circle",
                        text: __("Do you really want to delete this post ?")
                    }).then(async (b: any) => {
                        if (!b) { return; }
                        const r = await this.blogdb.remove({
                            where: {
                                id: Number(data.id)
                            }
                        });
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        this.bloglist.delete(el);
                        this.bloglist.unselect();
                        return this.clearEditor();
                    });
                    return false;
                };


                this.bindKey("CTRL-S", () => {
                    const sel = this.tabcontainer.selectedTab;
                    if (!sel || ((sel.container as GUI.tag.TileLayoutTag).aid !== "blog-container")) { return; }
                    return this.saveBlog();
                });
                this.on("resize", () => {
                    return this.resizeContent();
                });

                this.resizeContent();
                return this.init_db();
            }
            // @fetchData 0
            // USER TAB
            private fetchData(idx: any) {
                switch (idx) {
                    case "user-container": //user info
                        return this.userdb.read()
                            .then((d) => {
                                if(!d || d.length == 0)
                                {
                                    return;
                                }
                                this.user = d[0];
                                const inputs = this.select("[input-class='user-input']");
                                return inputs.map((i,v) => ($(v)).val(this.user[(v as HTMLInputElement).name]));
                            }).catch((e: any) => this.error(__("Cannot fetch user data"), e));
                    case "cv-container": // category
                        return this.refreshCVCat();
                    default:
                        this.last_ctime = 0;
                        this.bloglist.data = [];
                        return this.loadBlogs();
                }
            }

            private async saveUser() {
                try {
                    const inputs = this.select("[input-class='user-input']");
                    for (let v of inputs) { this.user[(v as HTMLInputElement).name] = ($(v)).val(); }
                    if (!this.user.fullname || (this.user.fullname === "")) { return this.toast(__("Full name must be entered")); }
                    //console.log @user
                    let fp = this.userdb;
                    if(this.user && this.user.id)
                    {
                        fp = `${this.userdb.path}@${this.user.id}`.asFileHandle();
                    }
                    fp.cache = this.user
                    const r = await fp.write(undefined);
                    if(r.error)
                    {
                        throw new Error(r.error as string);
                    }
                    if(!this.user.id)
                    {
                        this.user.id = r.result;
                    }
                    this.toast(__("User data updated")); 
                }
                catch(e)
                {
                    this.error(__("Cannot save user data: {0}", e.toString()), e);
                }
            }


            // PORFOLIO TAB
            private refreshCVCat() {
                return this.fetchCVCat().then((data: any) => {
                    this.cvlist.data = data;
                    return this.cvlist.expandAll();
                }).catch((e: any) => this.error(__("Unable to load categories"), e));
            }

            private fetchCVCat() {
                return new Promise(async (resolve, reject) => {
                    try {
                        const data = {
                            text: "Porfolio",
                            id: 0,
                            nodes: []
                        };
                        const filter = {
                            order: ["name$asc"]
                        };
                        const d = await this.cvcatdb.read(filter);
                        this.catListToTree(d, data, 0);
                        resolve(data);
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                });
            }
            //it = (@cvlist.find "pid", "2")[0]
            //@cvlist.set "selectedItem", it

            private catListToTree(table: GenericObject<any>[], data: GenericObject<any>, id: number) {
                const result = table.filter((e) => {
                    return e.pid == id
                });
                if (result.length === 0) {
                    return data.nodes = null;
                }
                for(let v of result)
                {
                    v.nodes = [];
                    v.text = v.name;
                    this.catListToTree(table, v, v.id);
                    data.nodes.push(v);
                }
            }

            private deleteCVCat(cat: GenericObject<any>): Promise<any> {
                return new Promise(async (resolve, reject) => {
                    try {
                        let v: any;
                        const ids = [];
                        var func = function (c: GenericObject<any>) {
                            ids.push(c.id);
                            if (c.nodes) {
                                c.nodes.map((v) => func(v));
                            }
                        };
                        func(cat);
                        // delete all content
                        let r = await this.cvsecdb.remove({
                            where: {
                                $or: {
                                    cid: ids
                                }
                            }
                        });
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        r = await this.cvcatdb.remove({
                            where: {
                                $or: {
                                    id: ids
                                }
                            }
                        });
                        if(r.error)
                        {
                            throw new Error(r.error as string);
                        }
                        await this.refreshCVCat();
                        this.seclist.data = [];
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                });
            }

            private CVSectionByCID(cid: number): Promise<any> {
                return new Promise( async (resolve, reject)=> {
                    try {
                        const d = await this.cvsecdb.read({
                            where: {cid},
                            order: [ "start$desc" ]
                        });
                        const items = [];
                        (this.find("cv-sec-status") as GUI.tag.LabelTag).text = __("Found {0} sections", d.length);
                        for (let v of d) {
                            v.closable = true;
                            v.tag = "afx-blogger-cvsection-item";
                            v.start = Number(v.start);
                            v.end = Number(v.end);
                            if (v.start < 1000) { v.start = undefined; }
                            if (v.end < 1000) { v.end = undefined; }
                            items.push(v);
                        }
                        this.seclist.data = items;
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                });
            }

            // blog
            private async saveBlog() {
                try {
                    let sel = undefined;
                    const selel = this.bloglist.selectedItem;
                    if (selel) { sel = selel.data; }
                    const tags = this.inputtags.value;
                    const content = this.editor.value();
                    const title = (new RegExp("^#+(.*)\n", "g")).exec(content);
                    if (!title || (title.length !== 2)) { return this.toast(__("Please insert a title in the text: beginning with heading")); }
                    if (tags === "") { return this.toast(__("Please enter tags")); }
                    const d = new Date();
                    const data: GenericObject<any> = {
                        content,
                        title: title[1].trim(),
                        tags,
                        ctime: sel ? sel.ctime : d.timestamp(),
                        ctimestr: sel ? sel.ctimestr : d.toString(),
                        utime: d.timestamp(),
                        utimestr: d.toString(),
                        rendered: this.process(this.editor.options.previewRender(content)),
                        publish: (this.find("blog-publish") as GUI.tag.SwitchTag).swon ? 1 : 0
                    };
                    let handle = this.blogdb;
                    if (sel) { 
                        data.id = sel.id;
                        handle = sel.$vfs;
                    }
                    //save the data
                    handle.cache = data;
                    const r = await handle.write(undefined);
                    if(r.error)
                    {
                        throw new Error(r.error as string);
                    }
                    if(!sel)
                    {
                        this.last_ctime = 0;
                        this.bloglist.data = [];
                        await this.loadBlogs();
                    }
                    else
                    {
                        //data.text = data.title;
                        selel.data = data;
                    }
                }
                catch(e)
                {
                    this.error(__("Cannot save blog: {0}", e.toString()), e);
                }
            }

            private process(text: string) {
                // find video tag and rendered it
                let found: any;
                const embed = (id: any) => `\
<iframe
class = "embeded-video"
width="560" height="315" 
src="https://www.youtube.com/embed/${id}"
frameborder="0" allow="encrypted-media" allowfullscreen
></iframe>\
`;
                const re = /\[\[youtube:([^\]]*)\]\]/g;
                const replace = [];
                while ((found = re.exec(text)) !== null) {
                    replace.push(found);
                }
                if (!(replace.length > 0)) { return text; }
                let ret = "";
                let begin = 0;
                for (let it of replace) {
                    ret += text.substring(begin, it.index);
                    ret += embed(it[1]);
                    begin = it.index + it[0].length;
                }
                ret += text.substring(begin, text.length);
                //console.log ret
                return ret;
            }

            private clearEditor() {
                this.editor.value("");
                this.inputtags.value = "";
                return (this.find("blog-publish") as GUI.tag.SwitchTag).swon = false;
            }
            // load blog
            private loadBlogs(): Promise<any> {
                return new Promise( async (ok, reject)=> {
                    try {
                        const filter: GenericObject<any> = {
                            order: ["ctime$desc"],
                            fields: [
                                "id",
                                "title",
                                "ctimestr",
                                "ctime",
                                "utime",
                                "utimestr"
                            ],
                            limit: 10,
                        };
                        if(this.last_ctime)
                        {
                            filter.where = { ctime$lt: this.last_ctime};
                        }
                        const r = await this.blogdb.read(filter);
                        if(r.length == 0)
                        {
                            this.toast(__("No more record to load"));
                            return;   
                        }
                        this.last_ctime = r[r.length - 1].ctime;
                        for (let v of r) {
                            v.tag = "afx-blogger-post-item";
                            this.bloglist.push(v);
                        }
                        this.clearEditor();
                        return this.bloglist.selected = -1;
                    }
                    catch(e)
                    {
                        reject(__e(e));
                    }
                });
                
            }

            private resizeContent() {
                const container = this.find("editor-container");
                const children = ($(".EasyMDEContainer", container)).children();
                const titlebar = (($(this.scheme)).find(".afx-window-top"))[0];
                const toolbar = children[0];
                const statusbar = children[3];
                const cheight = ($(this.scheme)).height() - ($(titlebar)).height() - ($(toolbar)).height() - ($(statusbar)).height() - 90;
                return ($(children[1])).css("height", cheight + "px");
            }
        }

        Blogger.singleton = true;
        Blogger.dependencies = [
            "pkg://SimpleMDE/main.js",
            "pkg://SimpleMDE/main.css",
            "pkg://Katex/main.js",
            "pkg://Katex/main.css",
            "pkg://SQLiteDB/libsqlite.js",
        ];
    }
}
