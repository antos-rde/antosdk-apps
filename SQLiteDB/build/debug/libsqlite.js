var OS;!function(e){let t;!function(e){class t{constructor(e){t.REGISTY||(t.REGISTY={}),this.db_file=e.asFileHandle(),t.REGISTY[this.db_file.path]?this.db_file=t.REGISTY[this.db_file.path]:t.REGISTY[this.db_file.path]=this.db_file}pwd(){return"pkg://SQLiteDB/".asFileHandle()}fileinfo(){return this.db_file.info}init(){return new Promise(async(e,t)=>{try{if(this.db_file.ready)return e(!0);let t={action:"init",args:{db_source:this.db_file.path}},a=await this.call(t);if(a=await this.db_file.onready(),!this.db_file||!this.db_file.ready||"file"!==this.db_file.info.type)throw __("DB file meta-data is invalid: {0}",this.db_file.path).__();e(!0)}catch(e){t(__e(e))}})}call(t){return new Promise(async(a,i)=>{t.args.db_source=this.db_file.path;let s={path:this.pwd().path+"/api/api.lua",parameters:t},r=await e.apigateway(s,!1);r.error?i(e.throwe(__("SQLiteDB server call error: {0}",r.error))):a(r.result)})}request(e){return new Promise(async(t,a)=>{try{this.db_file.ready||await this.init(),t(await this.call(e))}catch(e){a(__e(e))}})}select(e){let t={action:"select",args:{filter:e}};return this.request(t)}delete_records(e){let t={action:"delete_records",args:{filter:e}};return this.request(t)}drop_table(e){let t={action:"drop_table",args:{table_name:e}};return this.request(t)}list_tables(){return this.request({action:"list_table",args:{}})}create_table(e,t){let a={action:"create_table",args:{table_name:e,scheme:t}};return this.request(a)}get_table_scheme(e){let t={action:"table_scheme",args:{table_name:e}};return this.request(t)}insert(e,t,a){let i={action:"insert",args:{table_name:e,record:t,pk:a}};return this.request(i)}update(e,t,a){let i={action:"update",args:{table_name:e,record:t,pk:a}};return this.request(i)}last_insert_id(){return this.request({action:"last_insert_id",args:{}})}}let a;!function(e){class a extends e.BaseFileHandle{setPath(e){let a=e.split("@");if(super.setPath(a[0]),a.length>3)throw new Error(__("Invalid file path").__());this.path=e,this._table_name=a[1],this._id=a[2]?parseInt(a[2]):void 0,this._handle=new t("home://"+this.genealogy.join("/"))}meta(){return new Promise(async(e,t)=>{try{await this._handle.init();let t={result:{file:this._handle.fileinfo(),schema:void 0},error:!1};if(this._table_name){const e=await this._handle.get_table_scheme(this._table_name);if(0==e.length)t.result.schema=void 0;else{t.result.schema={fields:[],types:{},pk:void 0},t.result.schema.fields=e.map(e=>e.name);for(let a of e)t.result.schema.types[a.name]=a.type,a.pk&&(t.result.schema.pk=a.name)}}return e(t)}catch(e){return t(__e(e))}})}_rd(e){return new Promise(async(t,a)=>{try{if(this._table_name&&!this.info.schema)throw new Error(__("Table `{0}` does not exists in database: {1}",this._table_name,this.path).__());if(this._table_name){let a=e;a&&!this._id||(a={}),a.table_name=this._table_name,this._id&&(a.where={id:this._id});let i=await this._handle.select(a);this._id?this.cache=i[0]:this.cache=i,t(this.cache)}else{let e=await this._handle.list_tables();const a={};for(let t of e)a[t.name]=`${this.path}@${t.name}`.asFileHandle();this.cache=a,t(a)}}catch(e){return a(__e(e))}})}_wr(e){return new Promise(async(t,a)=>{try{if(!this.cache)throw new Error(__("No data to submit to remote database, please check the `cache` field").__());if(await this.onready(),this._id&&this._table_name)return this.cache.id=this._id,void t({result:await this._handle.update(this._table_name,this.cache,this.info.schema.pk),error:!1});if(this._table_name)return void t({result:await this._handle.insert(this._table_name,this.cache,this.info.schema.pk),error:!1});t({result:await this._handle.create_table(e,this.cache),error:!1})}catch(e){return a(__e(e))}})}_rm(e){return new Promise(async(t,a)=>{try{if(this._table_name&&!this.info.schema)throw new Error(__("Table `{0}` does not exists in database: {1}",this._table_name,this.path).__());if(this._table_name){let a=e;a&&!this._id||(a={}),a.table_name=this._table_name,this._id&&(a.where={id:this._id}),t({result:await this._handle.delete_records(a),error:!1})}else{let a=e;if(!a)throw new Error(__("No table specified for dropping").__());t({result:await this._handle.drop_table(a),error:!1})}}catch(e){return a(__e(e))}})}}e.register("^sqlite$",a)}(a=e.VFS||(e.VFS={}))}(t=e.API||(e.API={}))}(OS||(OS={}));