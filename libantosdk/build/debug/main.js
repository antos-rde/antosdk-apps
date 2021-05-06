var OS;!function(t){let e;!function(e){class i{constructor(e){this.worker=new Worker(e.asFileHandle().getlink()),this.jobs={},this.worker.onmessage=t=>{let e=t.data,i=this.jobs[e.id];i?"log"===e.type?i.logger&&(e.error?i.logger.error(e.result):!1===e.show_time&&i.logger.print?i.logger.print(e.result):i.logger.info(e.result)):(i.callback(e),delete this.jobs[e.id]):console.log("Unable to identify result of job",e.id,e)};const i={};for(const e in t.setting.system.packages){const s=t.setting.system.packages[e];i[e]={path:s.path,name:s.pkgname}}this.submit("sdk-setup",{REST:t.API.REST,pkgs:i})}newJobID(){return"job_"+Math.random().toString(36).replace(".","")}exectue_job(t,e,i,s,r){const o=this.newJobID(),n={id:o,cmd:t,data:e,root:i};this.jobs[o]={callback:s,logger:r},this.worker.postMessage(n)}submit(t,e,i,s){return new Promise((r,o)=>{this.exectue_job(t,e,i,t=>{if(t.error)return o(t.error);r(t.result)},s)})}terminate(){this.worker.terminate()}}class s{constructor(t,e){this.root=e,this.logger=t,s.worker||(s.worker=new i("pkg://libantosdk/core/worker.js"))}require(t){return this.run("sdk-import",t.map(t=>t+".worker.js"))}compile(t,e){return new Promise(async(i,s)=>{try{await this.require([t]),i(await this.run(t+"-compile",e))}catch(t){s(__e(t))}})}run(e,i){return"sdk-run-app"===e?new Promise(async(e,s)=>{try{let s=i;1==s.split("://").length&&(s=`${this.root}/${i}`);const r=await(s+"/package.json").asFileHandle().read("json");return r.text=r.name,r.path=s,r.filename=r.pkgname,r.type="app",r.mime="antos/app",r.icon&&(r.icon=`${r.path}/${r.icon}`),r.iconclass||r.icon||(r.iconclass="fa fa-adn"),this.logger.info(__("Installing...")),t.setting.system.packages[r.pkgname]=r,r.app?(this.logger.info(__("Running {0}...",r.app)),t.GUI.forceLaunch(r.app,[])):this.logger.error(__("{0} is not an application",r.pkgname)),e(void 0)}catch(t){s(t)}}):s.worker.submit(e,i,this.root,this.logger)}batch(t,e){return e.root&&(this.root=e.root),new Promise(async(i,s)=>{try{e.targets||s("No target found");for(const i of t){const t=e.targets[i];if(!t)return s(__("No target: {0}",i));if(t.depend&&await this.batch(t.depend,e),t.require&&await this.require(t.require),this.logger&&this.logger.info(__("### RUNNING STAGE: {0}###",i).__()),t.jobs)for(const e of t.jobs)await this.run(e.name,e.data)}i(void 0)}catch(t){s(t)}})}}let r;e.AntOSDKBuilder=s,function(t){class e extends t.RemoteFileHandle{constructor(t){super(t);const e="pkg://libantosdk/"+this.genealogy.join("/");this.setPath(e.asFileHandle().path)}}t.SDKFileHandle=e,t.register("^sdk$",e)}(r=e.VFS||(e.VFS={}))}(e=t.API||(t.API={}))}(OS||(OS={})),function(t){let e;!function(e){class i{constructor(t){this.target=t}info(t){this.log("info",t,!0)}warn(t){this.log("warn",t,!0)}error(t){this.log("error",t,!0)}log(t,e,i){let s=$("<pre></pre>").attr("class","sdk-log-"+t);if(i){let t=new Date,i=t.getDate()+"/"+(t.getMonth()+1)+"/"+t.getFullYear()+" "+t.getHours()+":"+t.getMinutes()+":"+t.getSeconds();s.text(`[${i}]: ${e.__()}`)}else s.text(e.__());$(this.target).append(s),$(this.target).scrollTop($(this.target)[0].scrollHeight)}print(t){t.match(/warn/i)?this.log("warn",t,!1):t.match(/error/i)?this.log("error",t,!1):this.log("info",t,!1)}clear(){$(this.target).empty()}}class s extends e.BaseApplication{constructor(t){super("libantosdk",t)}main(){this.logger=new i(this.find("container")),this.sdk=new t.API.AntOSDKBuilder(this.logger,""),this.filehandle=void 0,this.options=void 0,this.targets=this.find("target-list"),this.args&&this.args.length>0&&(this.filehandle=this.args[0].path.asFileHandle()),this.find("btnbuild").onbtclick=t=>{const e=this.targets.selectedItem;e&&this.load(this.compile([e.data.text]))},this.find("btnclear").onbtclick=t=>{this.logger.clear()},this.find("btnrefresh").onbtclick=t=>{this.open()},this.find("btnopen").onbtclick=async t=>{try{const t=await this.openDialog("FileDialog",{title:__("Select build file"),mimes:this.meta().mimes});this.filehandle=t.file.path.asFileHandle(),this.open()}catch(t){this.logger.error(t.toString())}},this.open()}open(){void 0!==this.filehandle&&this.filehandle.read("json").then(t=>{if(!t.targets)return this.logger.error(__("Invalid build file: {0}",this.filehandle.path));const e=Object.keys(t.targets).map(t=>({text:t}));this.scheme.apptitle=this.filehandle.path,this.options=t,this.options.root=this.filehandle.parent().path,this.targets.data=e,this.logger.info(__("Loaded: {0}",this.filehandle.path))}).catch(t=>this.logger.error(__("Unable to load build file: {0}: {1}",this.filehandle.path,t.toString())))}compile(t){return new Promise(async(e,i)=>{try{this.logger.clear(),await this.sdk.batch(t,this.options),e("OK")}catch(t){i(__e(t))}})}}e.libantosdk=s}(e=t.application||(t.application={}))}(OS||(OS={}));