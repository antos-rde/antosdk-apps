(function(){var t;(t=class extends this.OS.application.BaseApplication{constructor(t){super("Archive",t),this.currfile="Untitled".asFileHandle(),this.args&&this.args.length>0&&this.args[0].path&&(this.currfile=t[0].path.asFileHandle())}main(){return this.btadd=this.find("btaradd"),this.btdel=this.find("btardel"),this.btxtract=this.find("btarxtract"),this.filetree=this.find("filetree"),this.zip=void 0,this.bindKey("ALT-N",()=>this.fileMenuHandle("new")),this.bindKey("ALT-O",()=>this.fileMenuHandle("open")),this.bindKey("CTRL-S",()=>this.fileMenuHandle("save")),this.bindKey("ALT-S",()=>this.fileMenuHandle("saveas")),this.btxtract.onbtclick=t=>{var e,i;return(e=this.filetree.selectedItem)?(i=e.data,this.openDialog("FileDialog",{title:__("Select a folder"),mimes:["dir"]}).then(t=>this.xtract(i,t.file.path).then(()=>this.notify(__("extract successful: {0}",i.path))).catch(t=>this.error(t.toString(),t))).catch(t=>this.error(t.toString(),t))):this.notify(__("Please select file/folder to extract"))},this.btadd.onbtclick=t=>this.actionAdd(),this.btdel.onbtclick=t=>this.actionDel(),this.filetree.contextmenuHandle=(t,e)=>{var i,r;if(i=this.filetree.selectedItem)return r=[{text:"__(Delete)",onmenuselect:()=>this.actionDel()},{text:"__(Info)",onmenuselect:()=>this.actionInfo()}],"dir"===i.data.type&&r.unshift({text:"__(Add)",onmenuselect:()=>this.actionAdd()}),e.items=r,e.show(t)},this.openar(this.currfile)}actionAdd(){var t,e;return(t=this.filetree.selectedItem)&&"dir"===t.data.type?(e=t.data,this.openDialog("FileDialog",{title:__("Select a file/folder")}).then(t=>this.addToZip(t.file,`${e.path}/${t.file.path.asFileHandle().basename}`).then(()=>(this.currfile.dirty=!0,this.refreshTreeFile())).catch(t=>this.error(t.toString(),t))).catch(t=>this.error(t.toString(),t))):this.notify(__("Please select a destination folder"))}actionDel(){var t,e;return(t=this.filetree.selectedItem)?(e=t.data).root?this.notify(__("You cannot delete the root node")):this.ask({title:"__(Delete)",text:__("Do you really want to delete: {0}?",e.text)}).then(t=>{if(t)return this.zip.remove(e.path.trimBy("/")),this.currfile.dirty=!0,this.refreshTreeFile()}).catch(t=>this.error(t.toString(),t)):this.notify(__("Please select a destination folder"))}actionInfo(){var t,e,i;return(t=this.filetree.selectedItem)?(e=t.data.path.trimBy("/"),"dir"===t.data.type&&(e+="/"),(i=this.zip.files[e])?this.openDialog("InfoDialog",{title:"About: "+i.name,name:i.name,date:i.date,dir:i.dir,dataBinary:i._dataBinary,size:i._data.uncompressedSize}):this.notify(__("Cannot get entry meta data"))):this.notify(__("Please select a file/folder"))}openar(t){return this.zip=void 0,"Untitled"===t.filename?(this.zip=new JSZip,this.currfile=t,this.refreshTreeFile()):t.read("binary").then(e=>JSZip.loadAsync(e).then(e=>(this.zip=e,this.currfile=t,this.refreshTreeFile())).catch(t=>this.error(__("Wrong zip format: {0}",t.toString()),t))).catch(e=>this.error(__("Unable to read archive: {0}",t.path),e))}refreshTreeFile(){var t,e,i,r,n;if(this.zip){for(t in r={text:this.currfile.filename.trimFromRight(".zip"),type:"dir",path:"",open:!0,root:!0,nodes:[]},i=this.zip.files)n=i[t],e=this.putFileInTree(t.split("/"),r),n.dir||(e.type="file",delete e.nodes);return this.filetree.data=r}}putFileInTree(t,e){var i,r,n,a;return i=function(){var t,i,r,n;for(n=[],t=0,i=(r=e.nodes).length;t<i;t++)a=r[t],n.push(a.text);return n}(),(r=t.shift())?i.includes(r)?this.putFileInTree(t,e.nodes[i.indexOf(r)]):(n={text:r,path:`${e.path}/${r}`,type:"dir",nodes:[]},e.nodes.push(n),this.putFileInTree(t,n)):e}xtract(t,e){return new Promise((i,r)=>"file"===t.type?this.zip.file(t.path.trimBy("/")).async("uint8array").then(n=>{var a;return(a=`${e}/${t.text}`.asFileHandle()).cache=new Blob([n],{type:"octet/stream"}),a.write().then((function(){return i()})).catch((function(t){return r(__e(t))}))}).catch((function(t){return r(__e(t))})):e.asFileHandle().mk(t.text).then(()=>{var n,a;return n=function(){var e,i,r,n;for(n=[],e=0,i=(r=t.nodes).length;e<i;e++)a=r[e],n.push(a);return n}(),this.xtractall(n,`${e}/${t.text}`).then((function(){return i()})).catch((function(t){return r(__e(t))}))}).catch((function(t){return r(__e(t))})))}xtractall(t,e){return new Promise((i,r)=>{var n;return 0===t.length?i():(n=t.shift(),this.xtract(n,e).then(()=>this.xtractall(t,e).then((function(){return i()})).catch((function(t){return r(__e(t))}))).catch((function(t){return r(__e(t))})))})}addToZip(t,e){return new Promise((i,r)=>"dir"===t.type?t.path.asFileHandle().read().then(t=>t.error?r(__e(this.throwe(t.error))):this.addFilesTozip(t.result,e).then((function(){return i()})).catch(t=>r(__e(t)))):t.path.asFileHandle().read("binary").then(t=>(this.zip.file(e.trimBy("/"),t,{binary:!0}),i())).catch((function(t){return i(__e(t))})))}addFilesTozip(t,e){return new Promise((i,r)=>{var n;return 0===t.length?i():(n=t.shift(),this.addToZip(n,`${e}/${n.path.asFileHandle().basename}`).then(()=>this.addFilesTozip(t,e).then((function(){return i()})).catch((function(t){return r(__e(t))}))).catch((function(t){return r(__e(t))})))})}saveZipAs(){return this.openDialog("FileDialog",{title:__("Save as"),file:this.currfile}).then(t=>{var e;return e=t.file.path.asFileHandle(),"file"===t.file.type&&(e=e.parent()),this.currfile.setPath(`${e.path}/${t.name}`),this.write()})}write(){if(this.zip&&"Untitled"!==this.currfile.path)return this.zip.generateAsync({type:"base64"}).then(t=>this.currfile.setCache("data:application/zip;base64,"+t).write("base64").then(()=>(this.currfile.dirty=!1,this.refreshTreeFile(),this.notify(__("zip file saved in {0}",this.currfile.path)))).catch(t=>this.error(__("Unable to save zip file: {0}",this.currfile.path))))}fileMenuHandle(t){switch(t){case"open":return this.openDialog("FileDialog",{title:__("Select a zip file"),mimes:["application/zip"]}).then(t=>this.openar(t.file.path.asFileHandle())).catch(t=>this.error(t.toString(),t));case"save":return"Untitled"!==this.currfile.path?this.write():this.saveZipAs();case"saveas":return this.saveZipAs()}}menu(){return[{text:"__(File)",nodes:[{text:"__(New)",id:"new",shortcut:"A-N"},{text:"__(Open)",id:"open",shortcut:"A-O"},{text:"__(Save)",id:"save",shortcut:"C-S"},{text:"__(Save as)",id:"saveas",shortcut:"A-S"}],onchildselect:t=>this.fileMenuHandle(t.data.item.data.id)}]}cleanup(t){if(this.currfile.dirty)return t.preventDefault(),this.ask({title:"__(Quit)",text:"__(Zip file has been modified. Quit without saving?)"}).then(t=>{if(t)return this.currfile.dirty=!1,this.quit()})}}).dependencies=["os://scripts/jszip.min.js"],this.OS.register("Archive",t)}).call(this);