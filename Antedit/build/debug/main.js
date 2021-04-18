var OS;!function(t){let e;!function(t){t.BaseEditorModel=class{constructor(t,e,i){this.container=i,this.currfile="Untitled".asFileHandle(),this.tabbar=e,this.editorSetup(i),this.app=t,this.editormux=!1,this.onstatuschange=void 0,this.on("focus",()=>{this.onstatuschange&&this.onstatuschange(this.getEditorStatus())}),this.on("input",()=>this.editormux?(this.editormux=!1,!1):this.currfile.dirty?void 0:(this.currfile.dirty=!0,this.currfile.text+="*",this.tabbar.update(void 0))),this.on("changeCursor",()=>{this.onstatuschange&&this.onstatuschange(this.getEditorStatus())}),this.tabbar.ontabselect=t=>this.selecteTab($(t.data.item).index()),this.tabbar.ontabclose=t=>{const e=t.data.item;return!!e&&(e.data.dirty?(this.app.openDialog("YesNoDialog",{title:__("Close tab"),text:__("Close without saving ?")}).then(t=>t?this.closeTab(e):this.focus()),!1):this.closeTab(e))}}findTabByFile(t){const e=this.tabbar.items,i=(()=>{const i=[];for(let a=0;a<e.length;a++)e[a].hash()===t.hash()&&i.push(a);return i})();return 0===i.length?-1:i[0]}newTab(t){t.text=t.basename?t.basename:t.path,t.cache||(t.cache=""),t.textModel=this.newTextModelFrom(t),this.currfile.selected=!1,t.selected=!0,this.tabbar.push(t)}closeTab(t){this.tabbar.delete(t);const e=this.tabbar.items.length;return 0===e?(this.openFile("Untitled".asFileHandle()),!1):(this.tabbar.selected=e-1,!1)}selecteTab(t){const e=this.tabbar.items[t];e&&(this.currfile!==e&&(this.currfile.textModel=this.getTexModel(),this.currfile.selected=!1,this.currfile=e),this.editormux=!0,this.setTextModel(e.textModel),this.onstatuschange&&this.onstatuschange(this.getEditorStatus()),this.focus())}selectFile(t){const e=this.findTabByFile(t.asFileHandle());-1!==e&&(this.tabbar.selected=e)}openFile(t){const e=this.findTabByFile(t);-1===e?"Untitled"!==t.path.toString()?t.read().then(e=>(t.cache=e||"",this.newTab(t))).catch(e=>this.app.error(__("Unable to open: {0}",t.path),e)):this.newTab(t):this.tabbar.selected=e}write(t){this.currfile.cache=this.getValue(),t.write("text/plain").then(e=>{t.dirty=!1,t.text=t.basename,this.tabbar.update(void 0)}).catch(e=>this.app.error(__("Unable to save file: {0}",t.path),e))}save(){return this.currfile.cache=this.getValue(),this.currfile.basename?this.write(this.currfile):this.saveAs()}saveAs(){this.app.openDialog("FileDialog",{title:__("Save as"),file:this.currfile}).then(t=>{let e=t.file.path.asFileHandle();"file"===t.file.type&&(e=e.parent()),this.currfile.setPath(`${e.path}/${t.name}`),this.write(this.currfile)})}dirties(){const t=[];for(let e of Array.from(this.tabbar.items))e.dirty&&t.push(e);return t}set contextmenuHandle(t){this.container.contextmenuHandle=t}closeAll(){this.tabbar.items=[],this.resetEditor()}isDirty(){return this.dirties().length>0}}}(e=t.application||(t.application={}))}(OS||(OS={})),function(t){let e;!function(t){class e extends t.BaseEditorModel{constructor(t,e,i){super(t,e,i)}resetEditor(){this.setValue("")}getTexModel(){return{model:this.editor.getModel(),position:this.editor.getPosition()}}setTextModel(t){this.editor.setModel(t.model),t.position&&this.editor.setPosition(t.position)}newTextModelFrom(t){if("Untitled"===t.path.toString())return{model:monaco.editor.createModel(t.cache,"textplain")};const e=monaco.Uri.parse(t.path),i=monaco.editor.getModel(e);return i?{model:i}:{model:monaco.editor.createModel(t.cache,void 0,e)}}getModes(){return monaco.languages.getLanguages()}setTheme(t){}setMode(t){}editorSetup(t){this.editor=monaco.editor.create(t,{value:"",language:"textplain"}),e.modes||(e.modes={},monaco.languages.getLanguages().forEach(t=>{e.modes[t.id]=t}))}on(t,e){switch(t){case"input":this.editor.onDidChangeModelContent(e);break;case"focus":this.editor.onDidFocusEditorText(e);break;case"changeCursor":this.editor.onDidChangeCursorPosition(e)}}resize(){this.editor&&this.editor.layout()}focus(){this.editor&&this.editor.focus()}getModeForPath(t){return{}}getEditorStatus(){const t=this.editor.getPosition(),i=e.modes[this.editor.getModel().getModeId()];return{row:t.lineNumber,column:t.column,line:this.editor.getModel().getLineCount(),langmode:{text:i.aliases[0],mode:i},file:this.currfile.path}}getValue(){return this.editor.getValue()}setValue(t){this.editor.setValue(t)}getEditor(){return this.editor}}t.MonacoEditorModel=e}(e=t.application||(t.application={}))}(OS||(OS={})),function(t){let e;!function(t){class e extends t.BaseApplication{constructor(t){super("Antedit",t),this.currdir=void 0}main(){this.extensions={},this.eum=new i,this.fileview=this.find("fileview"),this.sidebar=this.find("sidebar"),this.bottombar=this.find("bottombar"),this.langstat=this.find("langstat"),this.editorstat=this.find("editorstat"),this.filestat=this.find("current-file-lbl"),this.logger=new a(this.find("output-tab")),this.split_mode=!0,this.fileview.fetch=t=>new Promise((async function(e,i){let a;a="string"==typeof t?t.asFileHandle():t;try{const t=await a.read();return t.error?i(t.error):e(t.result)}catch(t){return i(__e(t))}}));let e="Untitled".asFileHandle();this.args&&this.args.length>0&&(this.addRecent(this.args[0].path),"dir"===this.args[0].type?this.currdir=this.args[0].path.asFileHandle():(e=this.args[0].path.asFileHandle(),this.currdir=e.parent())),this.setting.recent||(this.setting.recent=[]);const s=this.find("wrapper");$(s).css("visibility","hidden"),this.load(new Promise((i,a)=>{require.config({paths:{vs:"pkg://MonacoCore/vs".asFileHandle().getlink()}}),require(["vs/editor/editor.main"],()=>{monaco.editor.setTheme("vs-dark"),this.eum.add(new t.MonacoEditorModel(this,this.find("left-tabbar"),this.find("left-editorarea"))).add(new t.MonacoEditorModel(this,this.find("right-tabbar"),this.find("right-editorarea"))),this.eum.onstatuschange=t=>this.updateStatus(t),$(s).css("visibility","visible"),this.setup(),this.eum.active.openFile(e),i(void 0)})}))}setup(){this.fileview.onfileopen=t=>{if(t.data&&t.data.path&&"dir"!==t.data.type)return this.addRecent(t.data.path),this.eum.active.openFile(t.data.path.asFileHandle())},this.fileview.onfileselect=t=>{t.data&&t.data.path&&"dir"!==t.data.type&&this.eum.active.selectFile(t.data.path)},this.on("resize",()=>this.eum.resize()),this.on("focus",()=>this.eum.active.focus()),this.fileview.contextmenuHandle=(t,e)=>(e.items=[{text:"__(New file)",id:"new"},{text:"__(New folder)",id:"newdir"},{text:"__(Rename)",id:"rename"},{text:"__(Delete)",id:"delete"}],e.onmenuselect=t=>this.ctxFileMenuHandle(t),e.show(t)),this.bindKey("ALT-N",()=>this.menuAction("new")),this.bindKey("ALT-O",()=>this.menuAction("open")),this.bindKey("ALT-F",()=>this.menuAction("opendir")),this.bindKey("CTRL-S",()=>this.menuAction("save")),this.bindKey("ALT-W",()=>this.menuAction("saveas")),this.fileview.ondragndrop=t=>{const e=t.data.from.data.path.asFileHandle(),i=t.data.to.data.path;return e.move(`${i}/${e.basename}`).then((function(a){const s=i,n=e.parent().path;s.length<n.length?(t.data.to.update(s),t.data.from.parent.update(n)):(t.data.from.parent.update(n),t.data.to.update(s))})).catch(t=>this.error(__("Unable to move file/folder"),t))},this.on("filechange",t=>{let{path:e}=t.file;return"file"===t.type&&({path:e}=t.file.parent()),this.fileview.update(e)}),this.find("logger-clear").onbtclick=()=>{this.logger.clear()},void 0===this.setting.showBottomBar&&(this.setting.showBottomBar=!1),this.loadExtensionMetaData(),this.toggleSideBar(),this.toggleSplitMode(),this.applyAllSetting()}updateStatus(t){t||(t=this.eum.active.getEditorStatus()),this.editorstat.text=__("Row {0}, col {1}, lines: {2}",t.row,t.column,t.line),t.langmode&&(this.langstat.text=t.langmode.text),this.filestat.text=t.file;let e=this.scheme;e.apptitle!=t.file&&(e.apptitle=t.file)}toggleSideBar(){this.currdir?($(this.sidebar).show(),this.fileview.path=this.currdir.path):$(this.sidebar).hide(),this.trigger("resize")}showOutput(t=!1){t&&this.showBottomBar(!0),this.bottombar.selectedIndex=0}applySetting(t){"showBottomBar"==t&&this.showBottomBar(this.setting.showBottomBar)}showBottomBar(t){this.setting.showBottomBar=t,t?$(this.bottombar).show():$(this.bottombar).hide(),this.trigger("resize")}toggleBottomBar(){this.showBottomBar(!this.setting.showBottomBar)}toggleSplitMode(){const t=this.find("right-panel"),e=this.eum.editors[1],i=this.eum.editors[0];if(this.split_mode){if(e.isDirty())return void this.notify(__("Unable to disable split view: Please save changes of modified files on the right panel"));e.closeAll(),$(t).hide(),this.split_mode=!1,i.focus()}else $(t).show(),this.split_mode=!0,e.openFile("Untitled".asFileHandle()),e.focus();this.trigger("resize")}fileMenu(){const t=this.setting.recent.map(t=>({text:t}));return{text:__("File"),nodes:[{text:__("New"),dataid:"new",shortcut:"A-N"},{text:__("Open Recent"),dataid:"recent",nodes:t,onchildselect:(t,e)=>{const i=t.data.item.data.text.asFileHandle();i.onready().then(t=>{t&&("dir"==t.type?(this.currdir=i,this.toggleSideBar()):this.eum.active.openFile(i))})}},{text:__("Open"),dataid:"open",shortcut:"A-O"},{text:__("Open Folder"),dataid:"opendir",shortcut:"A-F"},{text:__("Save"),dataid:"save",shortcut:"C-S"},{text:__("Save as"),dataid:"saveas",shortcut:"A-W"}],onchildselect:(t,e)=>this.menuAction(t.data.item.data.dataid,e)}}ctxFileMenuHandle(t){const e=t.data.item;if(!e)return;const i=e.data;if(!i)return;let a=this.fileview.selectedFile,s=this.currdir;switch(a&&"dir"===a.type&&(s=a.path.asFileHandle()),a&&"file"===a.type&&(s=a.path.asFileHandle().parent()),i.id){case"new":if(!s)return;this.openDialog("PromptDialog",{title:"__(New file)",label:"__(File name)"}).then(async t=>{const e=`${s.path}/${t}`.asFileHandle();try{return await e.write("text/plain"),this.fileview.update(s.path)}catch(t){return this.error(__("Fail to create: {0}",t.stack),t)}});break;case"newdir":if(!s)return;this.openDialog("PromptDialog",{title:"__(New folder)",label:"__(Folder name)"}).then(async t=>{try{return await s.mk(t),this.fileview.update(s.path)}catch(t){return this.error(__("Fail to create: {0}",s.path),t)}});break;case"rename":if(!a)return;this.openDialog("PromptDialog",{title:"__(Rename)",label:"__(File name)",value:a.filename}).then(async t=>{if(t!==a.filename){a=a.path.asFileHandle(),s=a.parent();try{return await a.move(`${s.path}/${t}`),this.fileview.update(s.path)}catch(t){return this.error(__("Fail to rename: {0}",a.path),t)}}});break;case"delete":if(!a)return;this.openDialog("YesNoDialog",{title:"__(Delete)",iconclass:"fa fa-question-circle",text:__("Do you really want to delete: {0}?",a.filename)}).then(async t=>{if(t){a=a.path.asFileHandle(),s=a.parent();try{return await a.remove(),this.fileview.update(s.path)}catch(t){return this.error(__("Fail to delete: {0}",a.path),t)}}})}}addRecent(t){this.setting.recent||(this.setting.recent=[]),this.setting.recent.includes(t)||(this.setting.recent.push(t),this.setting.recent.length>10&&(this.setting.recent=this.setting.recent.slice(0,10)))}menuAction(t,e){let i=this;switch(e&&(i=e),t){case"new":return i.eum.active.openFile("Untitled".asFileHandle());case"open":return i.openDialog("FileDialog",{title:__("Open file"),mimes:Array.from(i.meta().mimes).filter(t=>"dir"!==t)}).then(t=>{this.addRecent(t.file.path),i.eum.active.openFile(t.file.path.asFileHandle())});case"opendir":return i.openDialog("FileDialog",{title:__("Open folder"),mimes:["dir"]}).then((function(t){return i.addRecent(t.file.path),i.currdir=t.file.path.asFileHandle(),i.toggleSideBar()}));case"save":return i.eum.active.save();case"saveas":return i.eum.active.saveAs();default:return console.log(t)}}cleanup(t){let e;const i=this.eum.dirties();if(0!==i.length)t.preventDefault(),this.openDialog("YesNoDialog",{title:"__(Quit)",text:__("Ignore all unsaved files: {0} ?",(()=>{const t=[];for(e of Array.from(i))t.push(e.filename);return t})().join(", "))}).then(t=>{if(t){for(e of Array.from(i))e.dirty=!1;return this.quit(!1)}});else for(let t in this.extensions)this.extensions[t]&&this.extensions[t].cleanup&&this.extensions[t].cleanup()}menu(){return[this.fileMenu(),{text:"__(View)",nodes:[{text:"__(Toggle bottom bar)",dataid:"bottombar"},{text:"__(Toggle split view)",dataid:"splitview"}],onchildselect:(t,e)=>{switch(t.data.item.data.dataid){case"bottombar":return this.toggleBottomBar();case"splitview":return this.toggleSplitMode()}}}]}loadExtensionMetaData(){this.loadExtensionMetaFromFile(this.meta().path+"/extensions/extensions.json").catch(t=>this.error(__("Cannot load extension meta data"),t))}loadExtensionMetaFromFile(t){return new Promise((e,i)=>{t.asFileHandle().read("json").then(t=>{for(let e of t)for(let t of e.actions)this.eum.addAction(e,t,(t,i)=>{this.loadAndRunExtensionAction(t,i,e.root)});e()}).catch(t=>{i(__e(t))})})}loadAndRunExtensionAction(t,i,a){if(e.extensions[t])this.runExtensionAction(t,i);else{let e=`${this.meta().path}/extensions/${t}/main.js`;a&&(e=a+"/main.js"),this._api.requires(e,!0).then(()=>this.runExtensionAction(t,i)).catch(e=>this.error(__("unable to load extension: {0}",t),e))}}runExtensionAction(t,i){if(!this.extensions[t]){if(!e.extensions[t])return this.error(__("Unable to find extension: {0}",t));this.extensions[t]=new e.extensions[t](this)}if(!this.extensions[t][i])return this.error(__("Unable to find action: {0}",i));this.extensions[t].preload().then(()=>this.extensions[t][i]()).catch(t=>this.error(__("Unable to preload extension"),t))}}t.Antedit=e;class i{constructor(){this.active_editor=void 0,this.models=[]}get editors(){return this.models}set contextmenuHandle(t){for(let e of this.models)e.contextmenuHandle=t}get active(){return this.active_editor}add(t){return this.models.push(t),this.active_editor||(this.active_editor=t),t.on("focus",()=>{this.active_editor=t}),this}addAction(t,e,i){const a={id:`${t.name}:${e.name}`,label:`${t.text.__()}: ${e.text.__()}`,precondition:null,keybindingContext:null,contextMenuGroupId:t.name,run:()=>i(t.name,e.name)};for(let t of this.models){const e=t.getEditor();e.getAction(a.id)||e.addAction(a)}}set onstatuschange(t){for(let e of this.models)e.onstatuschange=t}dirties(){let t=[];for(let e of this.models)t=t.concat(e.dirties());return t}resize(){for(let t of this.models)t.resize()}}class a{constructor(t){this.target=t}info(t){this.log("info",t,!0)}warn(t){this.log("warn",t,!0)}error(t){this.log("error",t,!0)}log(t,e,i){let a=$("<pre></pre>").attr("class","code-pad-log-"+t);if(i){let t=new Date,i=t.getDate()+"/"+(t.getMonth()+1)+"/"+t.getFullYear()+" "+t.getHours()+":"+t.getMinutes()+":"+t.getSeconds();a.text(`[${i}]: ${e.__()}`)}else a.text(e.__());$(this.target).append(a),$(this.target).scrollTop($(this.target)[0].scrollHeight)}print(t){this.log("info",t,!1)}clear(){$(this.target).empty()}}e.Logger=a,e.dependencies=["pkg://MonacoCore/vs/loader.js"]}(e=t.application||(t.application={}))}(OS||(OS={})),function(t){class e{constructor(t,e){this.app=e,this.name=t}preload(){return t.API.require(t.application.Antedit.extensions[this.name].dependencies)}basedir(){return`${this.app.meta().path}/extensions/${this.name}`}notify(t){return this.app.notify(t)}error(t,e){return this.app.error(t,e)}logger(){return this.app.setting.showBottomBar?this.app.showOutput(!1):this.app.showOutput(!0),this.app.logger}metadata(e){return new Promise((i,a)=>{if(!this.app.currdir)return a(t.API.throwe(__("Current folder is not found")));`${this.app.currdir.path}/${e}`.asFileHandle().read("json").then(t=>{!t.root&&this.app.currdir&&(t.root=this.app.currdir.path),i(t)}).catch(s=>{this.app.openDialog("FileDialog",{title:__("Select build directory"),root:this.app.currdir.path,mimes:["dir"]}).then(t=>{`${t.file.path}/${e}`.asFileHandle().read("json").then(e=>{e.root||(e.root=t.file.path),i(e)}).catch(t=>a(t))}).catch(e=>a(t.API.throwe(__("Unable to read meta-data"))))})})}}e.dependencies=[],t.application.Antedit.extensions={},t.application.Antedit.EditorBaseExtension=e,t.application.Antedit.extensions.EditorExtensionMaker=class extends e{constructor(t){super("EditorExtensionMaker",t)}create(){this.logger().clear(),this.app.openDialog("FileDialog",{title:"__(New CodePad extension at)",file:{basename:__("ExtensionName")},mimes:["dir"]}).then(t=>this.mktpl(t.file.path,t.name))}build(e){this.logger().clear(),this.metadata("extension.json").then(async i=>{try{const a=await t.API.VFS.cat(i.javascripts.map(t=>`${i.root}/${t}`),"");await(i.root+"/build/debug/main.js").asFileHandle().setCache(a).write("text/plain"),await(i.root+"/build/debug/extension.json").asFileHandle().setCache(i.meta).write("object"),await t.API.VFS.copy(i.copies.map(t=>`${i.root}/${t}`),i.root+"/build/debug"),this.logger().info(__("Files generated in {0}",i.root+"/build/debug")),e&&e()}catch(t){return this.logger().error(__("Unable to build extension:{0}",t.stack))}}).catch(t=>this.logger().error(__("Unable to read meta-data:{0}",t.stack)))}run(){this.logger().clear(),this.metadata("extension.json").then(async e=>{if(!e||!e.meta||!e.meta.name)return this.logger().error(__("Invalid extension meta-data"));try{const i=e.root+"/build/debug/main.js";t.API.shared[i]&&delete t.API.shared[i],await t.API.requires(i),this.app.extensions[e.meta.name]&&this.app.extensions[e.meta.name].cleanup&&this.app.extensions[e.meta.name].cleanup(),this.app.extensions[e.meta.name]=new t.application.Antedit.extensions[e.meta.name](this.app);for(let t of e.meta.actions)this.app.eum.addAction(e.meta,t,(t,i)=>{this.app.loadAndRunExtensionAction(t,i,e.root+"/build")});this.app.eum.active.getEditor().trigger(e.meta.name,"editor.action.quickCommand")}catch(t){return this.logger().error(__("Unable to run extension:{0}",t.stack))}}).catch(t=>this.logger().error(__("Unable to read meta-data:{0}",t.stack)))}release(){this.logger().clear(),this.metadata("extension.json").then(e=>{this.build(async()=>{try{t.API.VFS.mkar(e.root+"/build/debug",`${e.root}/build/release/${e.meta.name}.zip`),this.logger().info(__("Archive created at {0}",`${e.root}/build/release/${e.meta.name}.zip`))}catch(t){return this.logger().error(__("Unable to create archive: {0}",t.stack))}})}).catch(t=>this.logger().error(__("Unable to read meta-data: {0}",t.stack)))}install(){this.logger().clear(),this.app.openDialog("FileDialog",{title:"__(Select extension archive)",mimes:[".*/zip"]}).then(async t=>{try{return await this.installZip(t.file.path),this.logger().info(__("Extension installed")),this.app.loadExtensionMetaData()}catch(t){return this.logger().error(__("Unable to install extension: {0}",t.stack))}})}installFromURL(){this.logger().clear(),this.app.openDialog("PromptDialog",{title:__("Enter URI"),label:__("Please enter extension URI:")}).then(async t=>{if(t)try{return await this.installZip(t),this.logger().info(__("Extension installed")),this.app.loadExtensionMetaData()}catch(e){return this.app.error(__("Unable to install extension: {0}",t))}})}mktpl(e,i){const a=`${e}/${i}`,s=[a,a+"/build",a+"/build/release",a+"/build/debug"],n=[["main.tpl",`${a}/${i}.js`],["meta.tpl",a+"/extension.json"]];t.API.VFS.mkdirAll(s).then(async()=>{try{return await t.API.VFS.mktpl(n,this.basedir(),t=>t.format(i,`${e}/${i}`)),this.app.currdir=a.asFileHandle(),this.app.toggleSideBar(),this.app.eum.active.openFile(`${a}/${i}.js`.asFileHandle())}catch(t){return this.logger().error(__("Unable to create extension template: {0}",t.stack))}}).catch(t=>this.logger().error(__("Unable to create extension directories: {0}",t.stack)))}installZip(e){return new Promise((i,a)=>{t.API.requires("os://scripts/jszip.min.js").then(()=>{e.asFileHandle().read("binary").then(e=>{JSZip.loadAsync(e).then(e=>{e.file("extension.json").async("uint8array").then(s=>{const n=JSON.parse(new TextDecoder("utf-8").decode(s)),o=this.ext_dir(n.name),r=[o],l=[];for(let t in e.files)e.files[t].dir?r.push(o+"/"+t):"extension.json"!=t&&l.push(t);r.length>0?t.API.VFS.mkdirAll(r).then(()=>{this.installFiles(l,e,n).then(()=>i()).catch(t=>a(__e(t)))}).catch(t=>a(__e(t))):this.installFiles(l,e,n).then(()=>i()).catch(t=>a(__e(t)))}).catch(t=>a(__e(t)))}).catch(t=>a(__e(t)))}).catch(t=>a(__e(t)))}).catch(t=>a(__e(t)))})}ext_dir(t){return`${this.app.meta().path}/extensions/${t}`}installFiles(t,e,i){return 0===t.length?this.installMeta(i):new Promise((a,s)=>{const n=t.splice(0,1)[0],o=`${this.ext_dir(i.name)}/${n}`;return e.file(n).async("uint8array").then(n=>o.asFileHandle().setCache(new Blob([n],{type:"octet/stream"})).write("text/plain").then(n=>n.error?s(n.error):this.installFiles(t,e,i).then(()=>a()).catch(t=>s(__e(t)))).catch(t=>s(__e(t)))).catch(t=>s(__e(t)))})}installMeta(t){return new Promise(async(e,i)=>{const a=(this.ext_dir("")+"/extensions.json").asFileHandle();try{const s=await a.read("json"),n=[];for(let t of s)n.push(t.name);const o=n.indexOf(t.name);o>=0&&s.splice(o,1),s.push(t);try{return await a.setCache(s).write("object"),e()}catch(t){return i(__e(t))}}catch(s){try{return await a.setCache([t]).write("object"),e()}catch(t){return i(__e(t))}}})}}}(OS||(OS={})),function(){}.call(this);