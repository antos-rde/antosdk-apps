(function() {
  var LuaPlayground;

  LuaPlayground = class LuaPlayground extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("LuaPlayground", args);
    }

    main() {
      var me;
      me = this;
      this.datarea = this.find("editorea");
      this.output = this.find("output");
      this.editor = ace.edit(this.datarea);
      this.editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        fontSize: "10pt"
      });
      this.editor.getSession().setUseWrapMode(true);
      this.editor.session.setMode("ace/mode/lua");
      this.editor.setTheme("ace/theme/monokai");
      this.on("vboxchange", function() {
        return me.editor.resize();
      });
      (this.find("log-clear")).set("onbtclick", function(e) {
        return me.log("clean");
      });
      this.socket = null;
      return this.bindKey("CTRL-R", function() {
        return me.run();
      });
    }

    menu() {
      var me, menu;
      me = this;
      menu = [
        {
          text: "__(Code)",
          child: [
            {
              text: "__(Run)",
              dataid: `${this.name}-Run`,
              shortcut: "C-R"
            }
          ],
          onmenuselect: function(e) {
            return me.run();
          }
        }
      ];
      return menu;
    }

    log(t, m) {
      var p;
      if (t === "clean") {
        return $(this.output).empty();
      }
      p = ($("<p>")).attr("class", t.toLowerCase())[0];
      $(p).html(`${t}: ${m.__()}`);
      ($(this.output)).append(p);
      return ($(this.output)).scrollTop(this.output.scrollHeight);
    }

    run() {
      var me, proto, value;
      me = this;
      value = this.editor.getValue().trim();
      if (!(value && value !== "")) {
        return;
      }
      proto = window.location.protocol === "https:" ? "wss://" : "ws://";
      this.socket = new WebSocket(proto + this._api.HOST + "/lua-api/os/apigateway?ws=1");
      this.socket.onopen = function() {
        //send data to server
        return me.socket.send(JSON.stringify({
          code: value
        }));
      };
      this.socket.onmessage = function(e) {
        if (e.data) {
          return me.log("INFO", e.data);
        }
      };
      return this.socket.onclose = function() {
        me.socket = null;
        return console.log("socket closed");
      };
    }

    cleanup(e) {
      if (this.socket) {
        return this.socket.close();
      }
    }

  };

  this.OS.dependencies = ["ace/ace"];

  this.OS.register("LuaPlayground", LuaPlayground);

}).call(this);
