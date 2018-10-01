(function() {
  var ConnectionDialog, RemoteDesktop;

  ConnectionDialog = class ConnectionDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("ConnectionDialog", {
        tags: [
          {
            tag: "afx-label",
            att: 'text="__(VNC server)" data-height="23" class="header"'
          },
          {
            tag: "input",
            att: 'data-height="30"'
          },
          {
            tag: "afx-label",
            att: 'text="__(Bits per pixel)" data-height="23" class="header"'
          },
          {
            tag: "afx-list-view",
            att: 'dropdown="true" data-height="30"'
          },
          {
            tag: "afx-label",
            att: 'text="__(Compression)" data-height="23" class="header"'
          },
          {
            tag: "afx-list-view",
            att: 'dropdown="true" data-height="30"'
          },
          {
            tag: "afx-label",
            att: 'text="__(JPEG quality)" data-height="23" class="header"'
          },
          {
            tag: "afx-slider",
            att: 'max="100" data-height="30"'
          },
          {
            tag: "div",
            att: ' data-height="5"'
          }
        ],
        width: 350,
        height: 280,
        resizable: false,
        buttons: [
          {
            label: "__(Connect)",
            onclick: function(d) {
              var data;
              if (!d.handler) {
                return;
              }
              data = {
                server: (d.find("content1")).value,
                bbp: ((d.find("content3")).get("selected")).value,
                flag: ((d.find("content5")).get("selected")).value,
                quality: (d.find("content7")).get("value")
              };
              d.handler(data);
              return d.quit();
            }
          },
          {
            label: "__(Cancel)",
            onclick: function(d) {
              return d.quit();
            }
          }
        ],
        filldata: function(d) {
          (d.find("content1")).value = "/opt/www/vnc.conf";
          (d.find("content3")).set("items", [
            {
              text: "16 bits",
              value: 16
            },
            {
              text: "32 bits",
              value: 32,
              selected: true
            }
          ]);
          (d.find("content5")).set("items", [
            {
              text: "No compression",
              value: 0
            },
            {
              text: "JPEG",
              value: 1
            },
            {
              text: "zLib",
              value: 2
            },
            {
              text: "JPEG & zLib",
              value: 3,
              selected: true
            }
          ]);
          return (d.find("content7")).set("value", 40);
        }
      });
    }

  };

  RemoteDesktop = class RemoteDesktop extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("RemoteDesktop", args);
    }

    main() {
      var me;
      me = this;
      this.canvas = this.find("screen");
      this.container = this.find("container");
      this.client = new WVNC({
        element: me.canvas,
        ws: 'wss://localhost:9192/wvnc',
        worker: `${me._api.handler.get}/${(me.meta().path)}/decoder.js`
      });
      this.client.onerror = function(m) {
        me.error(m);
        return me.showConnectionDialog();
      };
      this.client.onresize = function() {
        return me.setScale();
      };
      this.client.onpassword = function() {
        return new Promise(function(r, e) {
          return me.openDialog("PromptDialog", function(d) {
            return r(d);
          }, __("VNC password"), {
            label: __("VNC password"),
            value: "demopass",
            type: "password"
          });
        });
      };
      this.on("resize", function(e) {
        return me.setScale();
      });
      this.on("focus", function(e) {
        return $(me.canvas).focus();
      });
      return this.client.init().then(function() {
        return me.showConnectionDialog();
      });
    }

    setScale() {
      var h, sx, sy, w;
      if (!(this.client && this.client.resolution)) {
        return;
      }
      w = $(this.container).width();
      h = $(this.container).height();
      sx = w / this.client.resolution.w;
      sy = h / this.client.resolution.h;
      if (sx > sy) {
        return this.client.setScale(sy);
      } else {
        return this.client.setScale(sx);
      }
    }

    showConnectionDialog() {
      var me;
      me = this;
      return this.openDialog(new ConnectionDialog, function(d) {
        return me.client.connect(d.server, d);
      }, __("Connection"));
    }

    cleanup() {
      if (this.client) {
        return this.client.disconnect();
      }
    }

  };

  this.OS.register("RemoteDesktop", RemoteDesktop);

}).call(this);

(function(){var e;e=function(){function e(e){var t,n;this.socket=void 0,this.ws=void 0,this.canvas=void 0,n="decoder.js",this.scale=1,e.ws&&(this.ws=e.ws),this.canvas=e.element,"string"==typeof this.canvas&&(this.canvas=document.getElementById(this.canvas)),e.worker&&(n=e.worker),this.decoder=new Worker(n),this.enableEvent=!0,(t=this).mouseMask=0,this.decoder.onmessage=function(e){return t.process(e.data)}}return e.prototype.init=function(){var n;return n=this,new Promise(function(e,t){return n.canvas?(n.initInputEvent(),e()):t("Canvas is not set")})},e.prototype.initInputEvent=function(){var e,n,o,s;if((o=this).canvas&&(n=function(e){var t;return t=o.canvas.getBoundingClientRect(),{x:Math.floor((e.clientX-t.left)/o.scale),y:Math.floor((e.clientY-t.top)/o.scale)}},s=function(e){var t;if(o.enableEvent)return t=n(e),o.sendPointEvent(t.x,t.y,o.mouseMask)},o.canvas))return o.canvas.oncontextmenu=function(e){return e.preventDefault(),!1},o.canvas.onmousemove=function(e){return s(e)},o.canvas.onmousedown=function(e){var t;return t=1<<e.button,o.mouseMask=o.mouseMask|t,s(e)},o.canvas.onmouseup=function(e){var t;return t=1<<e.button,o.mouseMask=o.mouseMask&~t,s(e)},o.canvas.onkeydown=o.canvas.onkeyup=function(e){var t;switch(e.keyCode){case 8:t=65288;break;case 9:t=65417;break;case 13:t=65293;break;case 27:t=65307;break;case 46:t=65535;break;case 38:t=65362;break;case 40:t=65364;break;case 37:t=65361;break;case 39:t=65363;break;case 91:t=65511;break;case 93:t=65512;break;case 16:t=65505;break;case 17:t=65507;break;case 18:t=65513;break;case 20:t=65509;break;case 113:t=65471;break;case 112:t=65470;break;case 114:t=65472;break;case 115:t=65473;break;case 116:t=65474;break;case 117:t=65475;break;case 118:t=65476;break;case 119:t=65477;break;case 120:t=65478;break;case 121:t=65479;break;case 122:t=65480;break;case 123:t=65481;break;default:t=e.key.charCodeAt(0)}if(e.preventDefault(),t)return"keydown"===e.type?o.sendKeyEvent(t,1):"keyup"===e.type?o.sendKeyEvent(t,0):void 0},this.canvas.addEventListener("wheel",function(e){var t;if(o.enableEvent)return t=n(e),e.preventDefault(),e.deltaY<0?(o.sendPointEvent(t.x,t.y,8),void o.sendPointEvent(t.x,t.y,0)):(o.sendPointEvent(t.x,t.y,16),o.sendPointEvent(t.x,t.y,0))}),this.canvas.onpaste=function(e){var t;if(o.enableEvent)return t=void 0,window.clipboardData&&window.clipboardData.getData?t=window.clipboardData.getData("Text"):e.clipboardData&&e.clipboardData.getData&&(t=e.clipboardData.getData("text/plain")),!!t&&(e.preventDefault(),o.sendTextAsClipboard(t))},e=function(e){if(console.log("unload"),o.socket)return o.socket.close()},window.addEventListener("unload",e),window.addEventListener("beforeunload",e)},e.prototype.initCanvas=function(e,t,n){return this.depth=n,this.canvas.width=e,this.canvas.height=t,this.resolution={w:e,h:t,depth:this.depth},this.decoder.postMessage(this.resolution),this.canvas.style.cursor="none",this.setScale(this.scale)},e.prototype.process=function(e){var t,n,o;if(this.socket)return n=new Uint8Array(e.pixels),(o=(t=this.canvas.getContext("2d",{alpha:!1})).createImageData(e.w,e.h)).data.set(n),t.putImageData(o,e.x,e.y)},e.prototype.setScale=function(e){if(this.scale=e,this.canvas)return this.canvas.style.transformOrigin="0 0",this.canvas.style.transform="scale("+e+")"},e.prototype.connect=function(e,t){var n;if((n=this).socket&&this.socket.close(),this.ws)return this.socket=new WebSocket(this.ws),this.socket.binaryType="arraybuffer",this.socket.onopen=function(){return console.log("socket opened"),n.initConnection(e,t)},this.socket.onmessage=function(e){return n.consume(e)},this.socket.onclose=function(){return n.socket=null,n.canvas.style.cursor="auto",n.canvas&&n.resolution&&n.canvas.getContext("2d").clearRect(0,0,n.resolution.w,n.resolution.h),console.log("socket closed")}},e.prototype.disconnect=function(){if(this.socket)return this.socket.close()},e.prototype.initConnection=function(e,t){var n;return(n=new Uint8Array(e.length+3))[0]=32,n[1]=2,n[2]=50,t&&(t.bbp&&(n[0]=t.bbp),t.flag&&(n[1]=t.flag),t.quality&&(n[2]=t.quality)),n.set((new TextEncoder).encode(e),3),this.socket.send(this.buildCommand(1,n))},e.prototype.sendPointEvent=function(e,t,n){var o;if(this.socket)return(o=new Uint8Array(5))[0]=255&e,o[1]=e>>8,o[2]=255&t,o[3]=t>>8,o[4]=n,this.socket.send(this.buildCommand(5,o))},e.prototype.sendKeyEvent=function(e,t){var n;if(console.log(e,t),this.socket&&this.enableEvent)return(n=new Uint8Array(3))[0]=255&e,n[1]=e>>8,n[2]=t,this.socket.send(this.buildCommand(6,n))},e.prototype.buildCommand=function(e,t){var n,o;switch(o=void 0,typeof t){case"string":o=(new TextEncoder).encode(t);break;case"number":o=new Uint8Array([t]);break;default:o=t}return(n=new Uint8Array(o.length+3))[0]=e,n[2]=o.length>>8,n[1]=15&o.length,n.set(o,3),n.buffer},e.prototype.oncopy=function(e){return console.log("Get clipboard text: "+e)},e.prototype.onpassword=function(){return new Promise(function(e,t){return t("onpassword is not implemented")})},e.prototype.sendTextAsClipboard=function(e){if(this.socket)return console.log("send ",e),this.socket.send(this.buildCommand(7,e))},e.prototype.oncredential=function(){return new Promise(function(e,t){return t("oncredential is not implemented")})},e.prototype.onerror=function(e){return console.log("Error",e)},e.prototype.onresize=function(){return console.log("resize")},e.prototype.consume=function(e){var t,n,o,s,a,r,i;switch(t=(n=new Uint8Array(e.data))[0],r=this,t){case 254:return n=n.subarray(1,n.length-1),o=new TextDecoder("utf-8"),this.onerror(o.decode(n));case 129:return console.log("Request for password"),this.enableEvent=!1,this.onpassword().then(function(e){return r.socket.send(r.buildCommand(2,e)),r.enableEvent=!0});case 130:return console.log("Request for login"),this.enableEvent=!1,this.oncredential().then(function(e,t){var n;return(n=new Uint8Array(e.length+t.length+1)).set((new TextEncoder).encode(e),0),n.set(["\0"],e.length),n.set((new TextEncoder).encode(t),e.length+1),r.socket.send(r.buildCommand(3,n)),r.enableEvent=!0});case 131:return i=n[1]|n[2]<<8,a=n[3]|n[4]<<8,s=n[5],this.initCanvas(i,a,s),this.socket.send(this.buildCommand(4,1)),this.onresize();case 132:return this.decoder.postMessage(n.buffer,[n.buffer]);case 133:return n=n.subarray(1),o=new TextDecoder("utf-8"),this.oncopy(o.decode(n)),this.socket.send(this.buildCommand(4,1));default:return console.log(t)}},e}(),window.WVNC=e}).call(this);
