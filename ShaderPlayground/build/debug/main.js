var OS;!function(e){let t,i;!function(e){let t;!function(e){class t extends e.ListViewItemTag{itemlayout(){return{el:"div",children:[{el:"img",ref:"img"},{el:"p",ref:"name"}]}}ondatachange(){const e=this.data,t=this.refs.img,i=e.path.asFileHandle().getlink();t.src=i,$(this.refs.name).text(e.name)}init(){this.closable=!0}reload(e){}}e.define("afx-shader-texture-item",t)}(t=e.tag||(e.tag={}))}(t=e.GUI||(e.GUI={})),function(e){class i extends t.BasicDialog{constructor(){super("AddTextureDialog",i.scheme)}main(){super.main();const e=$("input",this.scheme);this.find("btnOk").onbtclick=t=>{let i={};for(const t of e){let e=t;if(""==e.value.trim())return this.notify(__("All fields should be filled"));i[e.name]=e.value.trim()}this.handle&&this.handle(i),this.quit()},this.find("btnFile").onbtclick=e=>{this.openDialog("FileDialog",{title:__("Select image file"),type:"file",mimes:["image/.*"]}).then(e=>{this.find("txtPath").value=e.file.path})}}}i.scheme='<afx-app-window width=\'250\' height=\'170\'>\n    <afx-hbox>\n        <div data-width="5"></div>\n        <afx-vbox>\n            <div data-height="5"></div>\n            <afx-label text="__(Name)" data-height="25"></afx-label>\n            <input type="text" data-height="25" name="name"> </input>\n            <div data-height="5"></div>\n            <afx-label text="__(Path/URL)" data-height="25"></afx-label>\n            <afx-hbox data-height="26">\n                <input type="text" name="path" data-id="txtPath"> </input>\n                <afx-button data-id="btnFile" iconclass = "bi bi-folder2-open" data-width="25"></afx-button>\n            </afx-hbox>\n            <div data-height="5"></div>\n            <div style="text-align:right;">\n                <afx-button text="__(Ok)" data-id="btnOk"></afx-button>\n            </div>\n            <div data-height="5"></div>\n        </afx-vbox>\n        <div data-width="5"></div>\n    </afx-hbox>\n</afx-app-window>';class s{constructor(e,t){this.glsl_values=[s.frg_template,""],this.renderer=t,this.ums=[new ace.UndoManager,new ace.UndoManager],this.current_idx=-1,this.tmp_canvas=$("<canvas />")[0],this.gl_compiling_ctx=this.tmp_canvas.getContext("webgl"),this._filehandle=void 0,this.editormux=!1,ace.require("ace/ext/language_tools"),this._onfilechange=e=>{},this._ontextureadded=e=>{},this.editor=ace.edit(e),this.editor.setOptions({enableBasicAutocompletion:!0,enableLiveAutocompletion:!0,enableSnippets:!0,highlightActiveLine:!0}),this.editor.getSession().setUseWrapMode(!0),this.editor.session.setMode("ace/mode/glsl"),this.editor.setTheme("ace/theme/monokai"),this.cursors=[this.editor.getCursorPosition(),this.editor.getCursorPosition()],this.editor.on("input",e=>{const t=this.editor.getValue(),i=0==this.current_idx?this.gl_compiling_ctx.FRAGMENT_SHADER:this.gl_compiling_ctx.VERTEX_SHADER,s=this.compile(t,i);if(!1!==this.filehandle.dirty||this.editormux||(this.filehandle.dirty=!0,this._onfilechange(this.filehandle.path+"*")),this.editormux&&(this.editormux=!1),s){const e="ERROR:\\s*([0-9]+):([0-9]+):\\s*(.*)\\n",t=s.match(new RegExp(e,"g"));t&&this.editor.getSession().setAnnotations(t.map(t=>{const i=t.match(new RegExp(e));let s={};return i&&(s={row:parseInt(i[2])-1,column:0,text:i[3],type:"error"}),s}))}else this.editor.getSession().setAnnotations([]),this.glsl_values[this.current_idx]=t,this.renderer.apply_mat(this.glsl_values[0],this.glsl_values[1])})}set onfilechange(e){this._onfilechange=e}set ontextureadded(e){this._ontextureadded=e}set filehandle(e){this._filehandle=e,this.read()}get filehandle(){return this._filehandle}read(){return new Promise(async(e,t)=>{if(void 0===this._filehandle)return this.renderer.textures.length=0,this._filehandle="Untitled".asFileHandle(),this._onfilechange(this._filehandle.path),this.glsl_values=[s.frg_template,""],2!=this.current_idx&&-1!=this.current_idx&&(this.editormux=!0,this.editor.setValue(this.glsl_values[this.current_idx])),this._ontextureadded(void 0),e(void 0);try{const t=await this._filehandle.read("json");this.glsl_values[0]=t.source[0],this.glsl_values[1]=t.source[1],2!=this.current_idx&&-1!=this.current_idx&&(this.editormux=!0,this.editor.setValue(this.glsl_values[this.current_idx])),this._ontextureadded(void 0);for(const e of t.textures)this._ontextureadded(e);this._onfilechange(this._filehandle.path),e(void 0)}catch(e){t(e)}})}write(e){return new Promise(async(t,i)=>{let s=e;const n=__("Unknown save path");if(!s){if(void 0===this._filehandle)return i(n);s=this._filehandle.path}if("Untitled"===s)return i(n);try{this._filehandle.setPath(s);const e={};2!=this.current_idx&&(this.glsl_values[this.current_idx]=this.editor.getValue()),e.source=this.glsl_values,e.textures=this.renderer.textures.map(e=>({name:e.name,path:e.path})),this.filehandle.cache=e,await this.filehandle.write("object"),this._filehandle.dirty=!1,this._onfilechange(""+this.filehandle.path),t(void 0)}catch(e){i(e)}})}compile(e,t){let i=this.gl_compiling_ctx.createShader(t);this.gl_compiling_ctx.shaderSource(i,e),this.gl_compiling_ctx.compileShader(i);let s=void 0;return this.gl_compiling_ctx.getShaderParameter(i,this.gl_compiling_ctx.COMPILE_STATUS)||(s=this.gl_compiling_ctx.getShaderInfoLog(i)),this.gl_compiling_ctx.deleteShader(i),s}edit(e){if(e<0)return;if(2!=e&&2!=this.current_idx)0===e?(this.glsl_values[1]=this.editor.getValue(),this.cursors[1]=this.editor.getCursorPosition()):1===e&&(this.glsl_values[0]=this.editor.getValue(),this.cursors[0]=this.editor.getCursorPosition());else if(2==e)return this.glsl_values[this.current_idx]=this.editor.getValue(),this.cursors[this.current_idx]=this.editor.getCursorPosition(),void(this.current_idx=e);this.current_idx=e,this.editormux=!0,this.editor.getSession().setUndoManager(new ace.UndoManager),this.editor.setValue(this.glsl_values[e]),this.editor.getSession().setUndoManager(this.ums[e]);const t=this.cursors[e];this.editor.renderer.scrollCursorIntoView({row:t.row,column:t.column},.5),this.editor.selection.moveTo(t.row,t.column),this.editor.focus()}cleanup(){this.renderer.cleanup(),$(this.tmp_canvas).remove()}resize(){this.editor.resize(),this.renderer.viewport_resize()}}class n{constructor(e){this.textures=[],this.renderer=new THREE.WebGLRenderer({canvas:e,alpha:!0}),this.renderer.autoClearColor=!1,this.clock=new THREE.Clock,this.camera=new THREE.OrthographicCamera(-1,1,1,-1,-1,1),this.needupdateTexture=!1,this.scene=new THREE.Scene;const t=new THREE.MeshBasicMaterial({color:"white"}),i=new THREE.PlaneGeometry(2,2);this.mesh=new THREE.Mesh(i,t),this.scene.add(this.mesh),this.uniforms={u_resolution:{value:{x:0,y:0}},u_time:{value:0},u_mouse:{value:{x:0,y:0}}},this.viewport_resize(),this.ani_request_id=requestAnimationFrame(()=>this.viewport_render())}viewport_render(){this.needupdateTexture&&(this.update_textures(),this.needupdateTexture=!1),this.uniforms.u_time.value=this.clock.getElapsedTime();try{this.renderer.render(this.scene,this.camera)}catch(e){console.error(e)}this.ani_request_id=requestAnimationFrame(()=>this.viewport_render())}viewport_resize(){const e=this.renderer.domElement,t=e.clientWidth,i=e.clientHeight;this.uniforms.u_resolution.value.x=t,this.uniforms.u_resolution.value.y=i,(e.width!==t||e.height!==i)&&this.renderer.setSize(t,i,!1)}cleanup(){console.log("Stop the animation before quitting..."),window.cancelAnimationFrame(this.ani_request_id)}update_textures(){for(const e in this.uniforms)-1===["u_resolution","u_time","u_mouse"].indexOf(e)&&(this.uniforms[e]=new THREE.MeshBasicMaterial({color:"black"}));for(const e of this.textures)this.uniforms[e.name]={value:e.texture};console.log(this.uniforms)}apply_mat(e,t){const i={fragmentShader:""===e.trim()?"void main(){}":e,uniforms:this.uniforms,vertexShader:void 0};""!=t.trim()&&(i.vertexShader=t);const s=new THREE.ShaderMaterial(i);this.mesh.material=s,console.log(this.uniforms)}}s.frg_template="#ifdef GL_ES\nprecision mediump float;\n#endif\n// uniform vec2 u_resolution;\n// uniform vec2 u_mouse;\nuniform float u_time;\n\nvoid main() {\n    gl_FragColor = vec4(abs(sin(u_time)),0.0,0.0,1.0);\n}        ";class r extends e.BaseApplication{constructor(e){super("ShaderPlayground",e)}main(){this.init_editor(),this.init_textures_list(),this.bindKey("ALT-N",()=>this.newFile()),this.bindKey("ALT-O",()=>this.openFile()),this.bindKey("CTRL-S",()=>this.saveFile())}init_editor(){this.tabbar=this.find("tabbar"),this.tabbar.items=[{text:__("Fragment"),iconclass:"bi bi-palette"},{text:__("Vertex"),iconclass:"bi bi-intersect"},{text:__("Textures"),iconclass:"bi bi-image-alt"}],this.tabbar.ontabselect=e=>{this.selectTab()},this.editor=new s(this.find("editor-container"),new n(this.find("viewport"))),this.on("resize",e=>{this.editor.resize()}),this.editor.onfilechange=e=>{this.scheme.apptitle=e},this.editor.ontextureadded=e=>{this.add_texture(e)},this.editor.filehandle=void 0,this.tabbar.selected=0}add_texture(e){{const t=this.find("texture-list");if(!e)return this.editor.renderer.textures=[],t.data=this.editor.renderer.textures,void(this.editor.renderer.needupdateTexture=!0);const i=(new THREE.TextureLoader).load(e.path.asFileHandle().getlink());i.minFilter=THREE.NearestFilter,i.magFilter=THREE.NearestFilter,i.wrapS=THREE.RepeatWrapping,i.wrapT=THREE.RepeatWrapping,e.texture=i,t.push(e),this.editor.renderer.needupdateTexture=!0}}init_textures_list(){const e=this.find("texture-list");e.buttons=[{text:"__(Add texture)",iconclass:"bi bi-plus",onbtclick:e=>{this.openDialog(new i).then(e=>this.add_texture(e))}}],e.itemtag="afx-shader-texture-item",e.onitemclose=e=>(this.editor.renderer.needupdateTexture=!0,!0),this.add_texture(void 0)}selectTab(){const e=this.tabbar.selected;2===e?($(this.find("editor-container")).hide(),$(this.find("texture-list")).show()):($(this.find("editor-container")).show(),$(this.find("texture-list")).hide()),this.editor.edit(e)}menu(){return[{text:"__(File)",nodes:[{text:"__(New)",dataid:"new",shortcut:"A-N"},{text:"__(Open)",dataid:"open",shortcut:"A-O"},{text:"__(Save)",dataid:"save",shortcut:"C-S"}],onchildselect:e=>{switch(e.data.item.data.dataid){case"new":return this.newFile();case"open":return this.openFile();case"save":return this.saveFile()}}}]}ignore_unsaved(){return new Promise(async(e,t)=>!0===this.editor.filehandle.dirty?e(!!await this.ask({title:__("Unsaved shader"),text:__("Ignore unsaved file?")})):e(!0))}async newFile(){await this.ignore_unsaved()&&(this.editor.filehandle=void 0)}async openFile(){try{if(!await this.ignore_unsaved())return;const e=await this.openDialog("FileDialog",{title:__("Open file"),mimes:this.meta().mimes});this.editor.filehandle.setPath(e.file.path),await this.editor.read()}catch(e){this.error(__(e.toString()),e)}}async saveFile(){if("Untitled"!==this.editor.filehandle.path)return this.editor.write(void 0);const e=await this.openDialog("FileDialog",{title:__("Save as"),file:this.editor.filehandle});let t=e.file.path.asFileHandle();"file"===e.file.type&&(t=t.parent());try{await this.editor.write(`${t.path}/${e.name}`)}catch(e){this.error(__(e.toString()),e)}}cleanup(e){if(this.editor.filehandle.dirty)return this.ignore_unsaved().then(e=>{e&&(this.editor.filehandle.dirty=!1,this.quit(!0))}),void e.preventDefault();this.editor.cleanup()}}e.ShaderPlayground=r,r.dependencies=["pkg://libthreejs/main.js","pkg://ACECore/core/ace.js","pkg://ACECore/path.js","pkg://ACECore/core/ext-language_tools.js","pkg://ShaderPlayground/glslx.js"]}(i=e.application||(e.application={}))}(OS||(OS={}));