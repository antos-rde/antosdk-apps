var OS;!function(t){let e;!function(e){class i extends e.BaseApplication{constructor(t){super("SQLiteDBBrowser",t)}menu(){return[{text:"__(File)",nodes:[{text:"__(New database)",dataid:"new",shortcut:"A-N"},{text:"__(Open database)",dataid:"open",shortcut:"A-O"}],onchildselect:t=>{switch(t.data.item.data.dataid){case"new":return this.newFile();case"open":return this.openFile()}}}]}list_tables(){this.filehandle.read().then(t=>{const e=[];for(let i in t)e.push({text:i,name:i,handle:t[i]});this.tbl_list.data=e,e.length>0&&(this.tbl_list.selected=e.length-1)})}async openFile(){try{let t;t=this.args&&this.args.length>0?this.args[0].path.asFileHandle():(await this.openDialog("FileDialog",{title:__("Open file"),mimes:this.meta().mimes})).file.path.asFileHandle(),this.filehandle=("sqlite://"+t.genealogy.join("/")).asFileHandle(),await this.filehandle.onready(),this.list_tables()}catch(t){this.error(__("Unable to open database file: {0}",t.toString()),t)}}async newFile(){try{const e=await this.openDialog("FileDialog",{title:__("Save as"),file:"Untitled.db"});var t=e.file.path.asFileHandle();"file"===e.file.type&&(t=t.parent());const i=`${t.path}/${e.name}`.asFileHandle();this.filehandle=("sqlite://"+i.genealogy.join("/")).asFileHandle(),await this.filehandle.onready(),this.list_tables()}catch(t){this.error(__("Unable to init database file: {0}",t.toString()),t)}}main(){this.filehandle=void 0,this.tbl_list=this.find("tbl-list"),this.grid_table=this.find("tb-browser"),this.grid_scheme=this.find("sch-browser"),this.grid_table.resizable=!0,this.grid_scheme.resizable=!0,this.grid_scheme.header=[{text:__("Field name")},{text:__("Field type")}],this.btn_loadmore=this.find("bt-load-next"),this.container=this.find("container"),this.bindKey("ALT-N",()=>this.newFile()),this.bindKey("ALT-O",()=>this.openFile()),this.container.ontabselect=t=>{if(0==this.container.selectedIndex){if(!this.tbl_list.selectedItem)return;const t=this.tbl_list.selectedItem.data.handle.info.schema;if(!t)return;const e=[];for(let i in t.types)e.push([{text:i},{text:t.types[i]}]);this.grid_scheme.rows=e}},this.find("bt-rm-table").onbtclick=async t=>{try{if(!this.filehandle)return this.notify(__("Please open a database file"));if(null==this.tbl_list.selectedItem)return;const t=this.tbl_list.selectedItem.data.name;await this.openDialog("YesNoDialog",{title:__("Confirm delete?"),text:__("Do you realy want to delete table: {0}",t)})&&(await this.filehandle.remove(t),this.list_tables())}catch(t){this.error(__("Unable to execute action table delete: {0}",t.toString()),t)}},this.find("bt-add-table").onbtclick=async t=>{try{if(!this.filehandle)return this.notify(__("Please open a database file"));const t=await this.openDialog(new a,{title:__("Create new table")});this.filehandle.cache=t.schema,await this.filehandle.write(t.name),this.list_tables()}catch(t){this.error(__("Unable to create table: {0}",t.toString()),t)}},this.find("btn-edit-record").onbtclick=async t=>{this.edit_record()},this.find("btn-add-record").onbtclick=async t=>{this.add_record()},this.find("btn-delete-record").onbtclick=async t=>{this.remove_record()},this.btn_loadmore.onbtclick=async t=>{try{await this.load_table()}catch(t){this.error(__("Error reading table: {0}",t.toString()),t)}},this.find("bt-refresh").onbtclick=async t=>{try{this.last_max_id=0;const t=this.tbl_list.selectedItem.data.handle,e=await t.read({fields:["COUNT(*)"]});this.n_records=e[0]["COUNT(*)"],this.grid_table.rows=[],await this.load_table()}catch(t){this.error(__("Error reload table: {0}",t.toString()),t)}},this.tbl_list.onlistselect=async t=>{try{if(!this.tbl_list.selectedItem)return;const t=this.tbl_list.selectedItem.data.handle;await t.onready(),this.last_max_id=0;const e=t.info.schema.fields.map(t=>({text:t}));this.grid_table.header=e,this.grid_table.rows=[];const i=await t.read({fields:["COUNT(*)"]});this.n_records=i[0]["COUNT(*)"],this.btn_loadmore.text="0/"+this.n_records,await this.load_table(),this.container.selectedIndex=1}catch(t){this.error(__("Error reading table: {0}",t.toString()),t)}},this.grid_table.oncelldbclick=async t=>{this.edit_record()},this.openFile()}async add_record(){try{const t=this.tbl_list.selectedItem;if(!t)return;const e=t.data.handle,i=t.data.handle.info.schema,a={};for(let t in i.types)["INTEGER","REAL","NUMERIC"].includes(i.types[t])?a[t]=0:a[t]="";console.log(a);const n=await this.openDialog(new s,{title:__("New record"),schema:i,record:a});e.cache=n,await e.write(void 0),this.n_records+=1,await this.load_table()}catch(t){this.error(__("Error edit/view record: {0}",t.toString()),t)}}async remove_record(){try{const t=this.grid_table.selectedCell,e=this.grid_table.selectedRow,i=this.tbl_list.selectedItem;if(!t||!i)return;const a=t.data.record[i.data.handle.info.schema.pk];if(!await this.openDialog("YesNoDialog",{title:__("Delete record"),text:__("Do you realy want to delete record {0}",a)}))return;const s=`${i.data.handle.path}@${a}`.asFileHandle();await s.remove(),this.n_records--,this.grid_table.delete(e),this.btn_loadmore.text=`${this.grid_table.rows.length}/${this.n_records}`}catch(t){this.error(__("Error deleting record: {0}",t.toString()),t)}}async edit_record(){try{const t=this.grid_table.selectedCell,e=this.grid_table.selectedRow,i=this.tbl_list.selectedItem;if(!t||!i)return;const a=await this.openDialog(new s,{title:__("View/edit record"),schema:i.data.handle.info.schema,record:t.data.record}),n=t.data.record[i.data.handle.info.schema.pk],l=`${i.data.handle.path}@${n}`.asFileHandle();l.cache=a,await l.write(void 0);const d=[];for(let t of l.info.schema.fields){let e=a[t];e.length>100&&(e=e.substring(0,100)),d.push({text:e,record:a})}e.data=d}catch(t){this.error(__("Error edit/view record: {0}",t.toString()),t)}}async load_table(){if(this.grid_table.rows&&this.grid_table.rows.length>=this.n_records)return;if(!this.tbl_list.selectedItem)return;const t=this.tbl_list.selectedItem.data.handle;await t.onready();const e=t.info.schema.fields.map(t=>({text:t})),i={where:{},limit:10};i.where[t.info.schema.pk+"$gt"]=this.last_max_id;const a=await t.read(i);if(a&&a.length>0){for(let t of a){const i=[];t.id&&t.id>this.last_max_id&&(this.last_max_id=t.id);for(let a in e){let s=t[e[a].text];s&&s.length>100&&(s=s.substring(0,100)),i.push({text:s,record:t})}this.grid_table.push(i,!1)}this.grid_table.scroll_to_bottom()}this.btn_loadmore.text=`${this.grid_table.rows.length}/${this.n_records}`}}e.SQLiteDBBrowser=i,i.dependencies=["pkg://SQLiteDB/libsqlite.js"];class a extends t.GUI.BasicDialog{constructor(){super("NewTableDialog")}main(){super.main(),this.container=this.find("container"),this.find("btnCancel").onbtclick=t=>this.quit(),this.find("btnAdd").onbtclick=t=>this.addField(),$(this.container).css("overflow-y","auto"),this.addField(),this.find("btnOk").onbtclick=t=>{const e=this.find("txt-tblname");if(!e.value||""==e.value)return this.notify(__("Please enter table name"));const i=e.value,a=$("input",this.container),s=$("afx-list-view",this.container);if(0==a.length)return this.notify(__("Please define table fields"));let n={};for(let t=0;t<a.length;t++){const e=a[t].value.trim();if(""===e)return this.notify(__("Field name cannot be empty"));if(n[e])return this.notify(__("Duplicate field: {0}",e));n[e]=s[t].selectedItem.data.text}this.handle&&this.handle({name:i,schema:n}),this.quit()}}addField(){const t=$("<div>").css("display","flex").css("flex-direction","row").appendTo(this.container);$("<input>").attr("type","text").css("flex","1").appendTo(t);let e=$("<afx-list-view>").css("flex","1").appendTo(t)[0];e.uify(this.observable),e.dropdown=!0,e.data=[{text:"TEXT"},{text:"INTEGER"},{text:"REAL"},{text:"NUMERIC"}],e.selected=0;const i=$("<afx-button>");i[0].uify(void 0),i[0].iconclass="fa fa-minus",i.on("click",()=>{t.remove()}).appendTo(t)}}a.scheme='<afx-app-window width=\'400\' height=\'350\'>\n    <afx-vbox padding = "10">\n        <afx-input label="__(Table name)" data-id="txt-tblname" data-height="content"></afx-input>\n        <afx-label text="__(Fields in table:)" data-height="30"></afx-label>\n        <div data-id="container" style="position:relative;"></div>\n        <afx-hbox data-height="35">\n            <afx-button data-id = "btnAdd" iconclass="fa fa-plus" data-width = "content" ></afx-button>\n            <div style = "text-align: right;">\n                <afx-button data-id = "btnOk" text = "__(Ok)"></afx-button>\n                <afx-button data-id = "btnCancel" text = "__(Cancel)"></afx-button>\n            </div>\n        </afx-hbox>\n    </afx-vbox>\n</afx-app-window>';class s extends t.GUI.BasicDialog{constructor(){super("RecordEditDialog")}main(){if(super.main(),this.container=this.find("container"),this.find("btnCancel").onbtclick=t=>this.quit(),$(this.container).css("overflow-y","auto"),!this.data||!this.data.schema)throw new Error(__("No data provided for dialog").__());for(let t in this.data.schema.types){const e=$("<afx-input>").appendTo(this.container)[0];e.uify(this.observable),e.label=t,t==this.data.schema.pk&&(e.disable=!0),"TEXT"==this.data.schema.types[t]&&(e.verbose=!0,$(e).css("height","100px")),null!=this.data.record[t]&&(e.value=this.data.record[t])}this.find("btnOk").onbtclick=t=>{const e=$("afx-input",this.container),i={};for(let t of e)i[t.label.__()]=t.value;this.handle&&this.handle(i),this.quit()}}}s.scheme='<afx-app-window width=\'550\' height=\'500\'>\n    <afx-vbox padding = "5">\n        <div data-id="container" style="row-gap: 5px;"></div>\n        <afx-hbox data-height="35">\n            <div></div>\n            <div data-width="content">\n                <afx-button data-id = "btnOk" text = "__(Ok)"></afx-button>\n                <afx-button data-id = "btnCancel" text = "__(Cancel)"></afx-button>\n            </div>\n        </afx-hbox>\n    </afx-vbox>\n</afx-app-window>'}(e=t.application||(t.application={}))}(OS||(OS={}));