(function() {
  var ConnectionDialog, CredentialDialog, RemoteDesktop, WVNC;

  ConnectionDialog = class ConnectionDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("ConnectionDialog", ConnectionDialog.scheme);
    }

    main() {
      super.main();
      this.find("bbp").data = [
        {
          text: "16 bits",
          value: 16,
          selected: true
        },
        {
          text: "32 bits",
          value: 32
        }
      ];
      this.find("jq").value = 40;
      this.find("bt-ok").onbtclick = (e) => {
        var data;
        if (!this.handle) {
          return;
        }
        data = {
          wvnc: (this.find("txtWVNC")).value,
          server: (this.find("txtServer")).value,
          bbp: (this.find("bbp")).selectedItem.data.value,
          quality: (this.find("jq")).value
        };
        this.handle(data);
        return this.quit();
      };
      return this.find("bt-cancel").onbtclick = (e) => {
        return this.quit();
      };
    }

  };

  ConnectionDialog.scheme = `<afx-app-window width='350' height='320'>
    <afx-vbox padding="5">
        <afx-input label="__(WVNC Websocket)" data-height="50" data-id="txtWVNC" value="wss://app.iohub.dev/wbs/wvnc"></afx-input>
        <afx-input label="__(VNC Server)" data-height="50" data-id="txtServer" value="192.168.1.27:5900"></afx-input>
        <div data-height="5"></div>
        <afx-label text="__(Bits per pixel)" data-height="30" class="header" ></afx-label>
        <afx-list-view dropdown = "true" data-id ="bbp" data-height="35" ></afx-list-view>
        <div data-height="5"></div>
        <afx-label text="__(JPEG quality)" data-height="30" class="header" ></afx-label>
        <afx-slider data-id ="jq" data-height="30" ></afx-slider>
        <afx-hbox data-height = '35'>
            <div  style=' text-align:right;'>
                <afx-button data-id = "bt-ok" text = "__(Connect)"></afx-button>
                <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>
`;

  CredentialDialog = class CredentialDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("CredentialDialog", CredentialDialog.scheme);
    }

    main() {
      this.find("bt-ok").onbtclick = () => {
        var data;
        if (!this.handle) {
          return this.quit();
        }
        data = {
          username: (this.find("txtUser")).value,
          password: (this.find("txtPass")).value
        };
        this.handle(data);
        return this.quit();
      };
      return this.find("bt-cancel").onbtclick = () => {
        return this.quit();
      };
    }

  };

  CredentialDialog.scheme = `<afx-app-window width='350' height='170'>
    <afx-vbox padding="5">
        <afx-input label="__(Username)" data-height="55" data-id="txtUser"></afx-input>
        <afx-input label="__(Password)" data-height="55" type="password" data-id="txtPass"></afx-input>
        <afx-hbox data-height = '35'>
            <div  style=' text-align:right;'>
                <afx-button data-id = "bt-ok" text = "__(Ok)"></afx-button>
                <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>`;

  RemoteDesktop = class RemoteDesktop extends this.OS.application.BaseApplication {
    constructor(args) {
      super("RemoteDesktop", args);
    }

    main() {
      this.canvas = this.find("screen");
      this.container = this.find("container");
      this.client = new WVNC({
        element: this.canvas
      });
      this.bindKey("CTRL-SHIFT-V", (e) => {
        return this.pasteText();
      });
      //@client.onerror = (m) =>
      //    @error m.toString()
      //    @showConnectionDialog()
      this.client.ondisconnect = () => {
        return this.showConnectionDialog();
      };
      this.client.onresize = () => {
        return this.setScale();
      };
      this.client.onpassword = () => {
        return new Promise((r, e) => {
          return this.openDialog("PromptDialog", {
            title: __("VNC password"),
            label: __("VNC password"),
            value: "password",
            type: "password"
          }).then(function(d) {
            return r(d);
          });
        });
      };
      this.client.oncopy = (text) => {
        return this._api.setClipboard(text);
      };
      this.client.oncredential = () => {
        return new Promise((r, e) => {
          return this.openDialog(new CredentialDialog(), {
            title: __("User credential")
          }).then(function(d) {
            return r(d.username, d.password);
          });
        });
      };
      this.on("resize", (e) => {
        return this.setScale();
      });
      this.on("focus", (e) => {
        return $(this.canvas).focus();
      });
      return this.client.init().then(() => {
        return this.showConnectionDialog();
      });
    }

    pasteText() {
      var cb;
      if (!this.client) {
        return;
      }
      cb = (text) => {
        if (!(text && text !== "")) {
          return;
        }
        return this.client.sendTextAsClipboard(text);
      };
      return this._api.getClipboard().then((text) => {
        return cb(text);
      }).catch((e) => {
        this.error(__("Unable to paste"), e);
        //ask for user to enter the text manually
        return this.openDialog("TextDialog", {
          title: "Paste text"
        }).then((text) => {
          return cb(text);
        }).catch((err) => {
          return this.error(err.toString(), err);
        });
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

    menu() {
      return [
        {
          text: "__(Connection)",
          nodes: [
            {
              text: "__(New Connection)",
              dataid: `${this.name}-new`
            },
            {
              text: "__(Disconnect)",
              dataid: `${this.name}-close`
            }
          ],
          onchildselect: (e) => {
            if (this.client) {
              return this.client.disconnect(false);
            }
          }
        }
      ];
    }

    showConnectionDialog() {
      if (!this.client) {
        return;
      }
      return this.openDialog(new ConnectionDialog(), {
        title: __("Connection")
      }).then((d) => {
        this.client.ws = d.wvnc;
        return this.client.connect(d.server, d);
      });
    }

    cleanup() {
      if (this.client) {
        this.client.disconnect(true);
      }
      return this.client = void 0;
    }

  };

  this.OS.register("RemoteDesktop", RemoteDesktop);

  WVNC = class WVNC {
    constructor(args) {
      var me, worker;
      this.socket = void 0;
      this.ws = void 0;
      this.canvas = void 0;
      worker = "pkg://RemoteDesktop/decoder_asm.js".asFileHandle().getlink();
      this.scale = 1.0;
      if (args.ws) {
        this.ws = args.ws;
      }
      this.canvas = args.element;
      if (typeof this.canvas === 'string') {
        this.canvas = document.getElementById(this.canvas);
      }
      this.decoder = new Worker(worker);
      this.enableEvent = false;
      this.pingto = false;
      me = this;
      this.mouseMask = 0;
      this.decoder.onmessage = function(e) {
        return me.process(e.data);
      };
    }

    init() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        if (!me.canvas) {
          return e('Canvas is not set');
        }
        // fix keyboard event problem
        $(me.canvas).attr('tabindex', '1');
        $(me.canvas).on("focus", () => {
          return me.resetModifierKeys();
        });
        me.initInputEvent();
        return r();
      });
    }

    initInputEvent() {
      var fn, getMousePos, me, sendMouseLocation;
      me = this;
      if (!this.canvas) {
        return;
      }
      getMousePos = function(e) {
        var pos, rect;
        rect = me.canvas.getBoundingClientRect();
        pos = {
          x: Math.floor((e.clientX - rect.left) / me.scale),
          y: Math.floor((e.clientY - rect.top) / me.scale)
        };
        return pos;
      };
      sendMouseLocation = function(e) {
        var p;
        if (!me.enableEvent) {
          return;
        }
        p = getMousePos(e);
        return me.sendPointEvent(p.x, p.y, me.mouseMask);
      };
      if (!me.canvas) {
        return;
      }
      me.canvas.oncontextmenu = function(e) {
        e.preventDefault();
        return false;
      };
      me.canvas.onmousemove = function(e) {
        return sendMouseLocation(e);
      };
      me.canvas.onmousedown = function(e) {
        var state;
        state = 1 << e.button;
        me.mouseMask = me.mouseMask | state;
        return sendMouseLocation(e);
      };
      //e.preventDefault()
      me.canvas.onmouseup = function(e) {
        var state;
        state = 1 << e.button;
        me.mouseMask = me.mouseMask & (~state);
        return sendMouseLocation(e);
      };
      //e.preventDefault()
      me.canvas.onkeydown = me.canvas.onkeyup = function(e) {
        var code, keycode;
        // get the key code
        keycode = e.keyCode;
        //console.log e
        switch (keycode) {
          case 8:
            code = 0xFF08; //back space
            break;
          case 9:
            code = 0xFF09; // tab ? 0xff89
            break;
          case 13:
            code = 0xFF0D; // return
            break;
          case 27:
            code = 0xFF1B; // esc
            break;
          case 46:
            code = 0xFFFF; // delete to verify
            break;
          case 38:
            code = 0xFF52; // up
            break;
          case 40:
            code = 0xFF54; // down
            break;
          case 37:
            code = 0xFF51; // left
            break;
          case 39:
            code = 0xFF53; // right
            break;
          case 91:
            code = 0xFFE7; // meta left
            break;
          case 93:
            code = 0xFFE8; // meta right
            break;
          case 16:
            code = 0xFFE1; // shift left
            break;
          case 17:
            code = 0xFFE3; // ctrl left
            break;
          case 18:
            code = 0xFFE9; // alt left
            break;
          case 20:
            code = 0xFFE5; // capslock
            break;
          case 113:
            code = 0xFFBF; // f2
            break;
          case 112:
            code = 0xFFBE; // f1
            break;
          case 114:
            code = 0xFFC0; // f3
            break;
          case 115:
            code = 0xFFC1; // f4
            break;
          case 116:
            code = 0xFFC2; // f5
            break;
          case 117:
            code = 0xFFC3; // f6
            break;
          case 118:
            code = 0xFFC4; // f7
            break;
          case 119:
            code = 0xFFC5; // f8
            break;
          case 120:
            code = 0xFFC6; // f9
            break;
          case 121:
            code = 0xFFC7; // f10
            break;
          case 122:
            code = 0xFFC8; // f11
            break;
          case 123:
            code = 0xFFC9; // f12
            break;
          default:
            code = e.key.charCodeAt(0); //if not e.ctrlKey and not e.altKey
        }
        //if ((keycode > 47 and keycode < 58) or (keycode > 64 and keycode < 91)  or (keycode > 95 and keycode < 112)  or (keycode > 185 and keycode < 193) or (keycode > 218 && keycode < 223))
        //    code = e.key.charCodeAt(0)
        //else 
        //    code = keycode
        e.preventDefault();
        if (!code) {
          return;
        }
        if (e.type === "keydown") {
          return me.sendKeyEvent(code, 1);
        } else if (e.type === "keyup") {
          return me.sendKeyEvent(code, 0);
        }
      };
      // mouse wheel event
      this.canvas.addEventListener('wheel', function(e) {
        var p;
        if (!me.enableEvent) {
          return;
        }
        //if (e.deltaY < 0) # up
        p = getMousePos(e);
        e.preventDefault();
        if (e.deltaY < 0) {
          me.sendPointEvent(p.x, p.y, 8);
          me.sendPointEvent(p.x, p.y, 0);
          return;
        }
        me.sendPointEvent(p.x, p.y, 16);
        return me.sendPointEvent(p.x, p.y, 0);
      });
      // paste event
      this.canvas.onpaste = function(e) {
        var pastedText;
        if (!me.enableEvent) {
          return;
        }
        pastedText = void 0;
        if (window.clipboardData && window.clipboardData.getData) { //IE
          pastedText = window.clipboardData.getData('Text');
        } else if (e.clipboardData && e.clipboardData.getData) {
          pastedText = e.clipboardData.getData('text/plain');
        }
        if (!pastedText) {
          return false;
        }
        e.preventDefault();
        return me.sendTextAsClipboard(pastedText);
      };
      // global event
      fn = (e) => {
        return this.disconnect(true);
      };
      window.addEventListener("unload", fn);
      return window.addEventListener("beforeunload", fn);
    }

    initCanvas(w, h, d) {
      var me;
      me = this;
      this.canvas.width = w;
      this.canvas.height = h;
      this.resolution = {
        w: w,
        h: h
      };
      this.decoder.postMessage(this.resolution);
      //me.canvas.style.cursor = "none"
      return this.setScale(this.scale);
    }

    process(msg) {
      var ctx, data, imgData;
      if (!this.socket) {
        this.socket.send(this.buildCommand(0x04, 1));
        return;
      }
      data = new Uint8Array(msg.pixels);
      ctx = this.canvas.getContext("2d", {
        alpha: false
      });
      imgData = ctx.createImageData(msg.w, msg.h);
      imgData.data.set(data);
      ctx.putImageData(imgData, msg.x, msg.y);
      // tell the server that we are ready
      return this.socket.send(this.buildCommand(0x04, 1));
    }

    setScale(n) {
      this.scale = n;
      if (!this.canvas) {
        return;
      }
      this.canvas.style.transformOrigin = '0 0';
      return this.canvas.style.transform = 'scale(' + n + ')';
    }

    connect(url, args) {
      var me;
      me = this;
      this.disconnect(false);
      if (!this.ws) {
        return;
      }
      this.socket = new WebSocket(this.ws);
      this.socket.binaryType = "arraybuffer";
      this.socket.onopen = function() {
        console.log("socket opened");
        return me.initConnection(url, args);
      };
      this.socket.onmessage = function(e) {
        return me.consume(e);
      };
      this.socket.onerror = (e) => {
        return me.onerror("Websocket error");
      };
      return this.socket.onclose = function() {
        me.socket = null;
        me.canvas.style.cursor = "auto";
        if (me.canvas && me.resolution) {
          me.canvas.getContext('2d').clearRect(0, 0, me.resolution.w, me.resolution.h);
        }
        if (me.pingto) {
          clearTimeout(me.pingto);
        }
        me.pingto = void 0;
        me.ondisconnect();
        return console.log("socket closed");
      };
    }

    disconnect(close_worker) {
      if (this.socket) {
        this.socket.close();
      }
      this.socket = void 0;
      if (close_worker) {
        this.decoder.terminate();
      }
      return this.enableEvent = false;
    }

    initConnection(vncserver, params) {
      var data;
      //vncserver = "192.168.1.20:5901"
      data = new Uint8Array(vncserver.length + 2);
      data[0] = 16; // bbp
      data[1] = 50; // jpeg quality
      if (params) {
        if (params.bbp) {
          data[0] = params.bbp;
        }
        if (params.quality) {
          data[1] = params.quality;
        }
      }
      //# rate in milisecond
      data.set((new TextEncoder()).encode(vncserver), 2);
      return this.socket.send(this.buildCommand(0x01, data));
    }

    resetModifierKeys() {
      if (!this.socket) {
        return;
      }
      if (!this.enableEvent) {
        return;
      }
      this.sendKeyEvent(0xFFE7, 0); // meta left
      this.sendKeyEvent(0xFFE8, 0); // meta right
      this.sendKeyEvent(0xFFE1, 0); // shift left
      this.sendKeyEvent(0xFFE3, 0); // ctrl left
      return this.sendKeyEvent(0xFFE9, 0); // alt left
    }

    sendPointEvent(x, y, mask) {
      var data;
      if (!this.socket) {
        return;
      }
      if (!this.enableEvent) {
        return;
      }
      data = new Uint8Array(5);
      data[0] = x & 0xFF;
      data[1] = x >> 8;
      data[2] = y & 0xFF;
      data[3] = y >> 8;
      data[4] = mask;
      return this.socket.send(this.buildCommand(0x05, data));
    }

    sendKeyEvent(code, v) {
      var data;
      // console.log code, v
      if (!this.socket) {
        return;
      }
      if (!this.enableEvent) {
        return;
      }
      data = new Uint8Array(3);
      data[0] = code & 0xFF;
      data[1] = (code >> 8) & 0xFF;
      data[2] = v;
      return this.socket.send(this.buildCommand(0x06, data));
    }

    sendPing() {
      if (!this.socket) {
        return;
      }
      return this.socket.send(this.buildCommand(0x08, 'PING WVNC'));
    }

    buildCommand(hex, o) {
      var cmd, data;
      data = void 0;
      switch (typeof o) {
        case 'string':
          data = (new TextEncoder()).encode(o);
          break;
        case 'number':
          data = new Uint8Array([o]);
          break;
        default:
          data = o;
      }
      cmd = new Uint8Array(data.length + 3);
      cmd[0] = hex;
      cmd[2] = data.length >> 8;
      cmd[1] = data.length & 0x0F;
      cmd.set(data, 3);
      //console.log "the command is", cmd.buffer
      return cmd.buffer;
    }

    oncopy(text) {
      return console.log("Get clipboard text: " + text);
    }

    onpassword() {
      return new Promise(function(resolve, reject) {
        return reject("onpassword is not implemented");
      });
    }

    sendTextAsClipboard(text) {
      var charcode;
      if (!this.socket) {
        return;
      }
      this.socket.send(this.buildCommand(0x07, text));
      // send ctrl-v to paste
      charcode = 'v'.charCodeAt(0);
      this.sendKeyEvent(0xFFE3, 1); // CTRL down
      this.sendKeyEvent(charcode, 1); // v down
      this.sendKeyEvent(charcode, 0); // v up
      return this.sendKeyEvent(0xFFE3, 0); // CTRL up
    }

    oncredential() {
      return new Promise(function(resolve, reject) {
        return reject("oncredential is not implemented");
      });
    }

    onerror(m) {
      return console.log("Error", m);
    }

    onresize() {
      return console.log("resize");
    }

    ondisconnect() {
      return console.log("disconnect");
    }

    consume(e) {
      var cmd, data, dec, fn, h, me, w;
      data = new Uint8Array(e.data);
      cmd = data[0];
      me = this;
      switch (cmd) {
        case 0xFE: //error
          data = data.subarray(1, data.length - 1);
          dec = new TextDecoder("utf-8");
          return this.onerror(dec.decode(data));
        case 0x81:
          console.log("Request for password");
          this.enableEvent = false;
          return this.onpassword().then(function(pass) {
            me.socket.send(me.buildCommand(0x02, pass));
            return me.enableEvent = true;
          });
        case 0x82:
          console.log("Request for login");
          this.enableEvent = false;
          return this.oncredential().then(function(user, pass) {
            var arr;
            arr = new Uint8Array(user.length + pass.length + 1);
            arr.set((new TextEncoder()).encode(user), 0);
            arr.set(['\0'], user.length);
            arr.set((new TextEncoder()).encode(pass), user.length + 1);
            me.socket.send(me.buildCommand(0x03, arr));
            return me.enableEvent = true;
          });
        case 0x83:
          w = data[1] | (data[2] << 8);
          h = data[3] | (data[4] << 8);
          this.initCanvas(w, h);
          // status command for ack
          this.socket.send(this.buildCommand(0x04, 1));
          this.enableEvent = true;
          // @resetModifierKeys()
          this.onresize();
          if (this.pingto) {
            return;
          }
          fn = () => {
            this.sendPing();
            return this.pingto = setTimeout(fn, 5000);
          };
          return this.pingto = setTimeout(fn, 5000);
        case 0x84:
          // send data to web assembly for decoding
          return this.decoder.postMessage(data.buffer, [data.buffer]);
        case 0x85:
          // clipboard data from server
          data = data.subarray(1);
          dec = new TextDecoder("utf-8");
          this.oncopy(dec.decode(data));
          return this.socket.send(this.buildCommand(0x04, 1));
        default:
          return console.log(cmd);
      }
    }

  };

  window.WVNC = WVNC;

}).call(this);
