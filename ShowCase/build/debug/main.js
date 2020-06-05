(function(){var t;(t=class extends this.OS.application.BaseApplication{constructor(t){super("ShowCase",t)}main(){var t,e,i,a,o,n,s,d;return this.find("bttest"),this.observable.on("btclick",t=>this.notify("button clicked")),(o=this.find("list")).data=[{text:"some thing with avery long text"},{text:"some thing 1",closable:!0},{text:"some thing 2",iconclass:"fa fa-camera-retro fa-lg"},{text:"some thing 3"},{text:"some thing 4"},{text:"some thing 5"}],o.onlistselect=t=>this.notify(t.data.items),this.find("switch").onswchange=t=>this.notify(t.data),this.find("spin").onvaluechange=t=>this.notify(t.data),this.find("menu").items=this.menu(),o.contextmenuHandle=(t,e)=>(e.items=this.menu(),e.show(t)),(a=this.find("grid")).oncelldbclick=t=>this.notify("on dbclick",t),a.onrowselect=t=>this.notify("on rowselect"),a.header=[{text:"header1",width:80},{text:"header2"},{text:"header3"}],a.rows=[[{text:"text 1"},{text:"text 2"},{text:"text 3"}],[{text:"text 4"},{text:"text 5"},{text:"text 6"}],[{text:"text 7"},{text:"text 8"},{text:"text 9"}],[{text:"text 10"},{text:"this is a long text"},{text:"text 11"}]],n={text:"Tree root",nodes:[{text:"leaf 1",iconclass:"fa fa-car"},{text:"leaf 2"},{text:"sub tree 1",nodes:[{text:"sub sub tree 1",nodes:[{text:"leaf 1 of sub sub tree 1"},{text:"leaf 2 of sub sub tree 1"}]},{text:"leaf 1 of sub tree"},{text:"leaf 2 of sub tree"},{text:"sub sub tree 2",nodes:[{text:"leaf 1 of sub sub tree 2"},{text:"leaf 2 of sub sub tree 2"}]}]}]},(s=this.find("tree")).data=n,s.ontreeselect=t=>this.notify(t.data.item.treepath),s.ontreedbclick=t=>this.notify("treedbclick"),this.observable.on("treedbclick",t=>this.notify("observable treedbclick")),this.find("slider").onvaluechange=t=>this.notify(t),this.find("cal").ondateselect=t=>this.notify(t.data.toString()),this.find("cpk").oncolorselect=t=>this.notify(JSON.stringify(t)),(i=this.find("fileview")).fetch=function(t){return new Promise((function(e,i){var a;return(a=t.asFileHandle()).read().then((function(t){var o;return(o=a.parent().asFileHandle()).filename="[..]",o.type="dir",t.error?i(t.error):(t.result.unshift(o),e(t.result))}))}))},i.path="home:///",(d=this.find("viewoption")).data=[{text:"icon"},{text:"list"},{text:"tree"}],d.onlistselect=t=>(this.notify(t.data.item.data.text),i.view=t.data.item.data.text),e=this.find("dialoglist"),t=this.find("btrundia"),e.data=[{text:"Prompt dialog",id:"prompt"},{text:"Calendar dialog",id:"calendar"},{text:"Color picker dialog",id:"colorpicker"},{text:"Info dialog",id:"info"},{text:"YesNo dialog",id:"yesno"},{text:"Selection dialog",id:"selection"},{text:"About dialog",id:"about"},{text:"File dialog",id:"file"},{text:"Text dialog",id:"text"}],t.onbtclick=t=>{var i;if(i=e.selectedItem)switch(i.data.id){case"prompt":return this.openDialog("PromptDialog",{title:"Prompt review",value:"txt data",label:"enter value"}).then(t=>this.notify(t));case"calendar":return this.openDialog("CalendarDialog",{title:"Calendar dialog"}).then(t=>this.notify(t.toString()));case"colorpicker":return this.openDialog("ColorPickerDialog").then(t=>this.notify(JSON.stringify(t)));case"info":return this.openDialog("InfoDialog",{title:"Info application",name:"Show case",date:"10/12/2014",description:"the brown fox jumps over the lazy dog"}).then((function(t){}));case"yesno":return this.openDialog("YesNoDialog",{title:"Question ?",text:"Do you realy want to delete file ?"}).then(t=>this.notify(t));case"selection":return this.openDialog("SelectionDialog",{title:"Select data ?",data:[{text:"Option 1"},{text:"Option 2"},{text:"Option 3",iconclass:"fa fa-camera-retro fa-lg"}]}).then(t=>this.notify(t.text));case"about":return this.openDialog("AboutDialog").then(t=>{});case"file":return this.openDialog("FileDialog",{title:"Select file ?",mimes:["text/*","dir"],file:"Untitled".asFileHandle()}).then((t,e)=>this.notify(t,e));case"text":return this.openDialog("TextDialog",{title:"Text dialog review",value:"txt data"}).then(t=>this.notify(t))}}}mnFile(){return{text:"__(File)",nodes:[{text:"__(New file)",dataid:this.name+"-mkf",shortcut:"C-F"},{text:"__(New folder)",dataid:this.name+"-mkdir",shortcut:"C-D"},{text:"__(Open with)",dataid:this.name+"-open",child:this.apps},{text:"__(Upload)",dataid:this.name+"-upload",shortcut:"C-U"},{text:"__(Download)",dataid:this.name+"-download"},{text:"__(Share file)",dataid:this.name+"-share",shortcut:"C-S"},{text:"__(Properties)",dataid:this.name+"-info",shortcut:"C-I"}],onchildselect:t=>this.notify(t.data.item.data.text)}}mnEdit(){return{text:"__(Edit)",nodes:[{text:"__(Rename)",dataid:this.name+"-mv",shortcut:"C-R"},{text:"__(Delete)",dataid:this.name+"-rm",shortcut:"C-M"},{text:"__(Cut)",dataid:this.name+"-cut",shortcut:"C-X"},{text:"__(Copy)",dataid:this.name+"-copy",shortcut:"C-C"},{text:"__(Paste)",dataid:this.name+"-paste",shortcut:"C-P"}],onchildselect:t=>this.notify(t.data.item.data.text)}}menu(){return[this.mnFile(),this.mnEdit(),{text:"__(View)",nodes:[{text:"__(Refresh)",dataid:this.name+"-refresh"},{text:"__(Sidebar)",switch:!0,checked:!0},{text:"__(Navigation bar)",switch:!0,checked:!1},{text:"__(Hidden files)",switch:!0,checked:!0,dataid:this.name+"-hidden"},{text:"__(Type)",child:[{text:"__(Icon view)",radio:!0,checked:!0,dataid:this.name+"-icon",type:"icon"},{text:"__(List view)",radio:!0,checked:!1,dataid:this.name+"-list",type:"list"},{text:"__(Tree view)",radio:!0,checked:!1,dataid:this.name+"-tree",type:"tree"}],onchildselect:function(t){return this.notify(t.data.item.data.text)}}],onchildselect:t=>this.notify(t.data.item.data.text)}]}}).singleton=!0,this.OS.register("ShowCase",t)}).call(this);