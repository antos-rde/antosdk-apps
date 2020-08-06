(function() {
  var AntunnelApi, AntunnelService, Msg, Subscriber, W;

  Msg = class Msg {
    constructor() {
      this.header = {
        sid: 0,
        cid: 0,
        type: 0,
        size: 0
      };
      this.data = void 0;
    }

    as_raw() {
      var arr, bytes, length;
      length = 21 + this.header.size;
      arr = new Uint8Array(length);
      arr.set(Msg.MAGIC_START, 0);
      arr[4] = this.header.type;
      bytes = Msg.bytes_of(this.header.cid);
      arr.set(bytes, 5);
      bytes = Msg.bytes_of(this.header.sid);
      arr.set(bytes, 9);
      bytes = Msg.bytes_of(this.header.size);
      arr.set(bytes, 13);
      if (this.data) {
        arr.set(this.data, 17);
      }
      arr.set(Msg.MAGIC_END, this.header.size + 17);
      return arr.buffer;
    }

  };

  Msg.decode = function(raw) {
    return new Promise(function(resolve, reject) {
      var msg;
      msg = new Msg();
      if (Msg.int_from(Msg.MAGIC_START, 0) !== Msg.int_from(raw, 0)) {
        return reject("Unmatch message begin magic number");
      }
      msg.header.type = raw[4];
      msg.header.cid = Msg.int_from(raw, 5);
      msg.header.sid = Msg.int_from(raw, 9);
      msg.header.size = Msg.int_from(raw, 13);
      msg.data = raw.slice(17, 17 + msg.header.size);
      if (Msg.int_from(Msg.MAGIC_END, 0) !== Msg.int_from(raw, 17 + msg.header.size)) {
        return reject("Unmatch message end magic number");
      }
      return resolve(msg);
    });
  };

  Msg.bytes_of = function(x) {
    var bytes;
    bytes = new Uint8Array(4);
    bytes[0] = x & 255;
    x = x >> 8;
    bytes[1] = x & 255;
    x = x >> 8;
    bytes[2] = x & 255;
    x = x >> 8;
    bytes[3] = x & 255;
    return bytes;
  };

  Msg.int_from = function(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
  };

  Msg.OK = 0;

  Msg.ERROR = 1;

  Msg.DATA = 6;

  Msg.CLOSE = 5;

  Msg.SUBSCRIBE = 2;

  Msg.UNSUBSCRIBE = 3;

  Msg.CTRL = 7;

  Msg.MAGIC_END = [0x41, 0x4e, 0x54, 0x44];

  Msg.MAGIC_START = [0x44, 0x54, 0x4e, 0x41];

  Subscriber = class Subscriber {
    constructor(channel) {
      this.channel = channel;
      this.id = void 0;
      this.channel_id = void 0;
      this.onmessage = void 0;
      this.onerror = void 0;
      this.onopen = void 0;
      this.onclose = void 0;
      this.tunnel = void 0;
      this.is_opened = false;
    }

    send(type, arr) {
      if (!this.tunnel) {
        if (this.onerror) {
          this.onerror("Tunnel is not opened");
        }
        return;
      }
      if (!this.is_opened) {
        if (this.onerror) {
          this.onerror("Channel is not opened yet");
        }
        return;
      }
      return this.tunnel.send(this.genmsg(type, arr));
    }

    genmsg(type, data) {
      var msg;
      msg = new Msg();
      msg.header.sid = this.id;
      msg.header.cid = this.channel_id;
      msg.header.type = type;
      msg.header.size = data ? data.length : 0;
      msg.data = data;
      return msg;
    }

    close(b) {
      this.is_opened = false;
      if (!this.tunnel) {
        return;
      }
      return this.tunnel.unsubscribe(this, b);
    }

  };

  AntunnelApi = class AntunnelApi {
    constructor(uri1) {
      this.uri = uri1;
      this.socket = void 0;
      this.pending = {};
      this.subscribers = {};
      this.onclose = void 0;
    }

    ready() {
      return new Promise((resolve, reject) => {
        if (!this.uri) {
          return reject();
        }
        if (this.socket !== void 0) {
          return resolve();
        }
        // connect to the socket
        console.log(`Connect to ${this.uri}`);
        this.socket = new WebSocket(this.uri);
        this.socket.binaryType = 'arraybuffer';
        this.socket.onmessage = (evt) => {
          return this.process(evt);
        };
        this.socket.onclose = (evt) => {
          var k, ref, ref1, v;
          this.socket = void 0;
          ref = this.pending;
          for (k in ref) {
            v = ref[k];
            v.tunnel = void 0;
            if (v.onclose) {
              v.onclose();
            }
          }
          ref1 = this.subscribers;
          for (k in ref1) {
            v = ref1[k];
            v.tunnel = void 0;
            v.is_opened = false;
            if (v.onclose) {
              v.onclose();
            }
          }
          this.pending = {};
          this.subscribe = {};
          if (this.onclose()) {
            return this.onclose();
          }
        };
        this.socket.onerror = (evt) => {
          var k, ref, ref1, results, v;
          ref = this.pending;
          for (k in ref) {
            v = ref[k];
            if (v.onerror) {
              v.onerror(evt.toString());
            }
          }
          ref1 = this.subscribers;
          results = [];
          for (k in ref1) {
            v = ref1[k];
            if (v.onerror) {
              results.push(v.onerror(evt.toString()));
            }
          }
          return results;
        };
        return this.socket.onopen = (e) => {
          return resolve();
        };
      });
    }

    process(evt) {
      return Msg.decode(new Uint8Array(evt.data)).then((msg) => {
        var relay_msg, sub;
        // find the correct subscriber of the data
        relay_msg = (m, a) => {
          var sub;
          sub = this.pending[m.header.sid];
          if (sub) {
            if (sub[a]) {
              sub[a](m);
            }
            return;
          }
          sub = this.subscribers[m.header.sid];
          if (sub) {
            if (sub[a]) {
              return sub[a](m);
            }
          }
        };
        switch (msg.header.type) {
          case Msg.OK:
            // first look for the pending
            sub = this.pending[msg.header.sid];
            if (sub) {
              delete this.pending[msg.header.sid];
              sub.id = Msg.int_from(msg.data, 0);
              sub.channel_id = msg.header.cid;
              this.subscribers[sub.id] = sub;
              sub.is_opened = true;
              if (sub.onopen) {
                return sub.onopen();
              }
            } else {
              return relay_msg(msg, "onmessage");
            }
            break;
          case Msg.DATA:
            return relay_msg(msg, "onmessage");
          case Msg.ERROR:
            return relay_msg(msg, "onerror");
          case Msg.UNSUBSCRIBE:
            sub = this.subscribers[msg.header.sid];
            if (!sub) {
              return;
            }
            return sub.close(true);
          default:
            return console.error(`Message of type ${msg.header.type} is unsupported`, msg);
        }
      }).catch((e) => {
        var k, ref, ref1, results, v;
        ref = this.pending;
        for (k in ref) {
          v = ref[k];
          if (v.onerror) {
            v.onerror(e);
          }
        }
        ref1 = this.subscribers;
        results = [];
        for (k in ref1) {
          v = ref1[k];
          if (v.onerror) {
            results.push(v.onerror(e));
          }
        }
        return results;
      });
    }

    subscribe(sub) {
      return this.ready().then(() => {
        // insert it to pending list
        sub.tunnel = this;
        sub.id = Math.floor(Math.random() * 100000) + 1;
        while (this.subscribers[sub.id] || this.pending[sub.id]) {
          sub.id = Math.floor(Math.random() * 100000) + 1;
        }
        this.pending[sub.id] = sub;
        // send request to connect to a channel
        return this.send(sub.genmsg(Msg.SUBSCRIBE, (new TextEncoder()).encode(sub.channel)));
      }).catch(function(e) {
        if (sub.onerror) {
          return sub.onerror(e.toString());
        }
      });
    }

    unsubscribe(sub, b) {
      return this.ready().then(() => {
        if (!this.subscribers[sub.id]) {
          return;
        }
        if (!b) {
          // insert it to pending list
          // send request to connect to a channel
          this.send(sub.genmsg(Msg.UNSUBSCRIBE, void 0));
        }
        if (sub.onclose) {
          sub.onclose();
        }
        delete this.subscribers[sub.id];
        sub.tunnel = void 0;
        return sub.is_opened = false;
      }).catch(function(e) {
        if (sub.onerror) {
          return sub.onerror(e.toString());
        }
      });
    }

    send(msg) {
      // return unless @subscribers[msg.header.sid]
      return this.socket.send(msg.as_raw());
    }

    close() {
      console.log(`Close connection to ${this.uri}`);
      if (this.socket) {
        this.socket.close();
      }
      if (this.onclose()) {
        return this.onclose();
      }
    }

  };

  W = this;

  W.Antunnel = {
    tunnel: void 0,
    init: (function(url) {
      return new Promise(function(resolve, reject) {
        if (W.Antunnel.tunnel) {
          return resolve(W.Antunnel.tunnel);
        }
        W.Antunnel.tunnel = new AntunnelApi(url);
        W.Antunnel.tunnel.onclose = function() {
          return W.Antunnel.tunnel = void 0;
        };
        return W.Antunnel.tunnel.ready().then(function() {
          return resolve(W.Antunnel.tunnel);
        }).catch(function(e) {
          return reject(e);
        });
      });
    }),
    Subscriber: Subscriber,
    Msg: Msg
  };

  AntunnelService = class AntunnelService extends OS.application.BaseService {
    constructor(args) {
      super("AntunnelService", args);
      this.text = __("Tunnel");
      this.iconclass = "fa fa-close";
      this.is_connect = false;
      this.nodes = [
        {
          text: __("Connect"),
          id: 1
        },
        {
          text: __("Disconnect"),
          id: 2
        },
        {
          text: __("Enter uri"),
          id: 3
        },
        {
          text: __("Exit"),
          id: 4
        }
      ];
      this.onchildselect = (e) => {
        return this.action(e);
      };
    }

    init() {
      if (this.systemsetting.system.tunnel_uri) {
        this.start();
      }
      this.watch(1500, () => {
        var new_status;
        new_status = false;
        if (Antunnel.tunnel !== void 0) {
          new_status = true;
        }
        if (new_status === this.is_connect) {
          return;
        }
        this.is_connect = new_status;
        this.iconclass = "fa fa-circle";
        if (!this.is_connect) {
          this.iconclass = "fa fa-close";
        }
        return this.update();
      });
      return OS.onexit("cleanupAntunnel", () => {
        if (Antunnel.tunnel) {
          Antunnel.tunnel.close();
        }
        return this.quit();
      });
    }

    action(e) {
      var ask;
      ask = () => {
        return this._gui.openDialog("PromptDialog", {
          title: __("Tunnel uri"),
          label: __("Please enter tunnel uri"),
          value: "wss://localhost/tunnel"
        }).then((uri) => {
          if (!(uri && uri !== "")) {
            return;
          }
          this.systemsetting.system.tunnel_uri = uri;
          return this.start();
        });
      };
      switch (e.data.item.data.id) {
        case 1:
          if (this.is_connect) {
            return;
          }
          if (this.systemsetting.system.tunnel_uri) {
            return this.start();
          } else {
            return ask();
          }
          break;
        case 2:
          if (Antunnel.tunnel) {
            return Antunnel.tunnel.close();
          }
          break;
        case 3:
          if (Antunnel.tunnel) {
            Antunnel.tunnel.close();
          }
          return ask();
        case 4:
          if (Antunnel.tunnel) {
            Antunnel.tunnel.close();
          }
          return this.quit();
      }
    }

    start() {
      if (!this.systemsetting.system.tunnel_uri) {
        return;
      }
      if (Antunnel.tunnel) {
        return;
      }
      return Antunnel.init(this.systemsetting.system.tunnel_uri).then((t) => {
        return this.notify(__("Tunnel now connected to the server at: {0}", this.systemsetting.system.tunnel_uri));
      }).catch((e) => {
        if (Antunnel.tunnel) {
          Antunnel.tunnel.close();
        }
        return this.error(__("Unable to connect to the tunnel: {0}", e.toString()), e);
      });
    }

    awake() {}

  };

  this.OS.register("AntunnelService", AntunnelService);

}).call(this);
