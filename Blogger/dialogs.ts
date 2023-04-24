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
        export namespace blogger {
            declare var EasyMDE;
            export class BloggerCategoryDialog extends OS.GUI.BasicDialog {
                private tree: OS.GUI.tag.TreeViewTag;
                private txtinput: HTMLInputElement;
                constructor() {
                    super("BloggerCategoryDialog", BloggerCategoryDialog.scheme);
                }

                main() {
                    super.main();
                    this.tree = this.find("tree") as OS.GUI.tag.TreeViewTag;
                    this.txtinput = this.find("txtinput") as HTMLInputElement;

                    (this.find("bt-ok") as OS.GUI.tag.ButtonTag).onbtclick = (e: any) => {
                        const sel = this.tree.selectedItem;
                        if (!sel) { return this.notify(__("Please select a parent category")); }
                        const seldata = sel.data;
                        const val = this.txtinput.value;
                        if ((val === "") && !this.data.selonly) { return this.notify(__("Please enter category name")); }
                        if (this.data.cat && (this.data.cat.id === seldata.id)) { return this.notify(__("Parent can not be the category itself")); }
                        if (this.handle) { this.handle({ p: seldata, value: val }); }
                        return this.quit();
                    };

                    (this.find("bt-cancel") as OS.GUI.tag.ButtonTag).onbtclick = (e: any) => {
                        return this.quit();
                    };
                    if (this.data && this.data.tree) {
                        if (this.data && this.data.cat) {
                            let seldata: GenericObject<any>;
                            this.txtinput.value = this.data.cat.name;
                            if (this.data.cat.pid === "0") {
                                seldata = this.data.tree;
                            } else {
                                seldata = this.findDataByID(this.data.cat.pid, this.data.tree.nodes);
                            }
                            if (seldata) { seldata.selected = true; }
                        }
                        this.tree.data = this.data.tree;
                        return this.tree.expandAll();
                    }
                }
                // TODO set selected category name

                findDataByID(id: number, list: GenericObject<any>[]) {
                    for (let data of list) {
                        if (data.id === id) { return data; }
                        if (data.nodes) {
                            this.findDataByID(id, data.nodes);
                        }
                    }
                    return undefined;
                }
            }

            BloggerCategoryDialog.scheme = `\
<afx-app-window width='300' height='400'>
    <afx-vbox padding="5">
        <afx-label text="__(Pick a parent)" data-height="25" class="lbl-header" ></afx-label>
        <afx-tree-view data-id="tree" ></afx-tree-view>
        <afx-label text="__(Category name)" data-height="25" class="lbl-header" ></afx-label>
        <input type="text" data-height="25" data-id = "txtinput"/ >
        <afx-hbox data-height = '35'>
            <div  style=' text-align:right;'>
                <afx-button data-id = "bt-ok" text = "__(Ok)"></afx-button>
                <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>\
        `;

            // This dialog is use for cv section editing

            export class BloggerCVSectionDiaglog extends OS.GUI.BasicDialog {
                private editor: GenericObject<any>;
                constructor() {
                    super("BloggerCVSectionDiaglog");
                }

                main() {
                    super.main();
                    this.editor = new EasyMDE({
                        autoDownloadFontAwesome: false,
                        element: this.find("contentarea"),
                        status: false,
                        toolbar: false
                    });
                    ($((this.select('[class = "CodeMirror-scroll"]'))[0])).css("min-height", "50px");
                    ($((this.select('[class="CodeMirror cm-s-paper CodeMirror-wrap"]'))[0])).css("min-height", "50px");
                    const inputs = this.select("[input-class='user-input']");
                    if (this.data && this.data.section) { for (let v of inputs) { ($(v)).val(this.data.section[(v as HTMLInputElement).name]); } }
                    if (this.data && this.data.section) { this.editor.value(this.data.section.content); }
                    (this.find("section-publish") as OS.GUI.tag.SwitchTag).swon = (this.data && this.data.section && Number(this.data.section.publish) ? true : false);
                    (this.find("bt-cv-sec-save") as OS.GUI.tag.ButtonTag).onbtclick = (e: any) => {
                        const data: GenericObject<any> = {};
                        for (let v of inputs) { data[(v as HTMLInputElement).name] = ($(v)).val(); }
                        data.content = this.editor.value();
                        if ((data.title === "") && (data.content === "")) { return this.notify(__("Title or content must not be blank")); }
                        //return @notify "Content must not be blank" if data.content is ""
                        if (this.data && this.data.section) { data.id = this.data.section.id; }
                        const val = (this.find("section-publish") as OS.GUI.tag.SwitchTag).swon;
                        if (val === true) {
                            data.publish = 1;
                        } else {
                            data.publish = 0;
                        }
                        if (this.handle) { this.handle(data); }
                        return this.quit();
                    };

                    this.on("resize", () => this.resizeContent());
                    return this.resizeContent();
                }

                resizeContent() {
                    const container = this.find("editor-container");
                    const children = ($(".EasyMDEContainer", container)).children();
                    const cheight = ($(container)).height() - 30;
                    return ($(children[0])).css("height", cheight + "px");
                }
            }
            BloggerCVSectionDiaglog.scheme = `\
<afx-app-window data-id = "blogger-cv-sec-win" apptitle="Porforlio section" width="450" height="400">
    <afx-vbox padding="5">
        <afx-hbox data-height = "30" >
            <afx-label data-width= "70" text = "__(Title)"></afx-label>
            <input type = "text" name="title" input-class = "user-input"></input>
        </afx-hbox>
        <afx-hbox data-height = "30" >
            <afx-label text = "__(Subtitle)" data-width= "70"></afx-label>
            <input type = "text" name="subtitle" input-class = "user-input"></input>
        </afx-hbox>
        <afx-hbox data-height = "30" >
            <afx-label text = "__(Location)" data-width= "70"></afx-label>
            <input type = "text" name="location" input-class = "user-input"></input>
        </afx-hbox>
        <afx-hbox data-height = "30" >
            <afx-label text = "__(From)" data-width= "70"></afx-label>
            <input type = "text" name="start" input-class = "user-input"></input>
            <afx-label text = "To:" style="text-align:center;" data-width= "70"></afx-label>
            <input type = "text"  name="end" input-class = "user-input"></input>
        </afx-hbox>
        <afx-label data-height = "30" text = "Content" style = "margin-left:5px;"></afx-label>
        <div data-id="editor-container">
        <textarea name="content" data-id = "contentarea" ></textarea>
        </div>
        <div data-height = "35" style="text-align: right;">
            <afx-switch  data-id = "section-publish" data-width="30"></afx-switch>
            <afx-button iconclass = "fa fa-save" data-id = "bt-cv-sec-save"  text = "__(Save)"></afx-button>
        </div>
    </afx-vbox>
</afx-app-window>`;

            // this dialog is for send mail
            export class BloggerSendmailDiaglog extends OS.GUI.BasicDialog {
                static template: string;
                private maillinglist: OS.GUI.tag.StackMenuTag;
                // TODO: convert to SQLite handle
                private subdb: API.VFS.BaseFileHandle;
                constructor() {
                    super("BloggerSendmailDiaglog");
                }

                main() {
                    super.main();
                    this.maillinglist = this.find("email-list") as OS.GUI.tag.StackMenuTag;
                    const title = (new RegExp("^#+(.*)\n", "g")).exec(this.data.content);
                    (this.find("mail-title") as HTMLInputElement).value = title[1];
                    const content = (this.data.content.substring(0, 500)) + "...";
                    (this.find("contentarea") as HTMLTextAreaElement).value = BloggerSendmailDiaglog.template.format(this.data.id, content);
                    const mlist = this.data.mails.map((el)=> {
                        return {
                            text: el.name,
                            email: el.email,
                            switch: true,
                            checked: true 
                        }
                    });
                    console.log(mlist);
                    this.maillinglist.items = mlist;
                    
                    return (this.find("bt-sendmail") as OS.GUI.tag.ButtonTag).onbtclick = (e: any) => {
                        const items = this.maillinglist.items;
                        const emails = [];
                        for (let v of items) {
                            if (v.checked === true) {
                                emails.push(v);
                            }
                        }

                        if (emails.length === 0) { return this.notify(__("No email selected")); }
                        // send the email
                        const data = {
                            path: `${this.meta().path}/api/sendmail.lua`,
                            parameters: {
                                to: emails,
                                title: (this.find("mail-title") as HTMLInputElement).value,
                                content: (this.find("contentarea") as HTMLTextAreaElement).value,
                                user: (this.find("mail-user") as HTMLInputElement).value,
                                password: (this.find("mail-password") as HTMLInputElement).value,
                            }
                        };
                        return this._api.apigateway(data, false)
                            .then((d) => {
                                if (d.error) {
                                    const str = d.result.join(',');
                                    return this.notify(__("Unable to send mail to: {0}", str)); }
                                return this.quit();
                            }).catch((e) => {
                                return this.error(__("Error sending mail: {0}", e.toString()), e);
                            });
                    };
                }
            }

            BloggerSendmailDiaglog.scheme = `\
<afx-app-window data-id = "blogger-send-mail-win" apptitle="Send mail" width="600" height="400" resizable = "false">
    <afx-hbox padding="5">
        <afx-stack-menu data-width="200" data-id="email-list"></afx-stack-menu>
        <afx-resizer data-width="3"></afx-resizer>
        <afx-vbox >
                <afx-label data-height="20" text = "__(Title)"></afx-label>
                <input type = "text" data-height="25" name="title" data-id = "mail-title"></input>
                <afx-label data-height = "20" text = "__(Content)" ></afx-label>
                <textarea name="content" data-id = "contentarea" ></textarea>
                <afx-label data-height="20" text = "__(IO Hub mail username/password)"></afx-label>
                <afx-hbox data-height="25">
                    <input type = "text" name="username" data-id = "mail-user"></input>
                    <input type = "password" name="password" data-id = "mail-password"></input>
                </afx-hbox>
                <afx-hbox data-height = "30">
                    <div></div>
                    <afx-button iconclass = "fa fa-paper-plane" data-id = "bt-sendmail" data-width="content" text = "__(Send)"></afx-button>
                </afx-hbox>
        </afx-vbox>
    </afx-hbox>
</afx-app-window>`;


            BloggerSendmailDiaglog.template = `\
Hello,

Dany LE has just published a new post on his blog: https://blog.iohub.dev/post/id/{0}

==========
{1}
==========


Read the full article via:
https://blog.iohub.dev/post/id/{0}

You receive this email because you have been subscribed to his blog.

Have a nice day,

Sent from Blogger, an AntOS application\
`;
        }
    }
}