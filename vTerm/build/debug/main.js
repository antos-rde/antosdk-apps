(function(){var t;(t=class extends this.OS.application.BaseApplication{constructor(t){super("vTerm",t)}main(){var t;return this.mterm=this.find("myterm"),this.term=new Terminal({cursorBlink:!0}),this.fitAddon=new FitAddon.FitAddon,this.term.loadAddon(this.fitAddon),this.term.setOption("fontSize","12"),this.term.open(this.mterm),this.sub=void 0,this.term.onKey(t=>{if(this.sub)return this.sub.send(Antunnel.Msg.DATA,new TextEncoder("utf-8").encode(t.key))}),this.on("focus",()=>this.term.focus()),this.mterm.contextmenuHandle=(t,e)=>(e.items=[{text:"__(Copy)",id:"copy"},{text:"__(Paste)",id:"paste"}],e.onmenuselect=t=>{if(t)return this.mctxHandle(t.data.item.data)},e.show(t)),this.resizeContent(),this.systemsetting.desktop.menu[this.name]||(this.systemsetting.desktop.menu[this.name]={text:"__(Open terminal)",app:"vTerm"}),this.on("hboxchange",t=>this.resizeContent()),t=()=>Antunnel.tunnel?(this.tunnel=Antunnel.tunnel,this.openSession()):(this.error(__("The Antunnel service is not started, please start it first")),this._gui.pushService("Antunnel/AntunnelService").catch(t=>this.error(t.toString(),t)),this.quit()),window.Antunnel?t():(console.log("require Antunnel"),this._api.requires("pkg://Antunnel/main.js").then(()=>t()).catch(t=>(this.error(__("Unable to load Antunnel: {0}",t.toString()),t),this.quit())))}mctxHandle(t){var e,s;switch(t.id){case"paste":return e=t=>{if(t&&""!==t)return t=t.replace(/\n/g,"\r"),this.sub&&this.sub.send(Antunnel.Msg.DATA,new TextEncoder("utf-8").encode(t)),this.term.focus()},this._api.getClipboard().then(t=>e(t)).catch(t=>(this.error(__("Unable to paste"),t),this.openDialog("TextDialog",{title:"Paste text"}).then(t=>e(t)).catch(t=>this.error(t.toString(),t))));case"copy":if(!(s=this.term.getSelection())||""===s)return;return this._api.setClipboard(s)}}resizeContent(){var t,e,s;if(this.fitAddon.fit(),e=this.term.cols,s=this.term.rows,this.sub)return(t=new Uint8Array(8)).set(Antunnel.Msg.bytes_of(e),0),t.set(Antunnel.Msg.bytes_of(s),4),this.sub.send(Antunnel.Msg.CTRL,t)}openSession(){return this.term.clear(),this.term.focus(),this.sub=new Antunnel.Subscriber("vterm"),this.sub.onopen=()=>(console.log("Subscribed"),this.resizeContent($(this.mterm).width(),$(this.mterm).height()),this.term.focus()),this.sub.onerror=t=>(this.error(__("Unable to connect to: vterm"),t),this.sub=void 0),this.sub.onmessage=t=>{if(this.term&&t.data)return this.term.write(new TextDecoder("utf-8").decode(t.data))},this.sub.onclose=()=>(this.sub=void 0,this.notify(__("Terminal connection closed")),this.quit()),this.tunnel.subscribe(this.sub)}cleanup(t){if(this.sub)return this.sub.close()}}).dependencies=["pkg://xTerm/main.js","pkg://xTerm/main.css","pkg://Antunnel/main.js"],this.OS.register("vTerm",t)}).call(this);