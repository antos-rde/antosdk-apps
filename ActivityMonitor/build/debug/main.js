(function() {
  void 0;
  var ActivityMonitor, _APP, _PM;

  // Copyright 2017-2018 Xuan Sang LE <xsang.le AT gmail DOT com>

  // AnTOS Web desktop is is licensed under the GNU General Public
  // License v3.0, see the LICENCE file for more information

  // This program is free software: you can redistribute it and/or
  // modify it under the terms of the GNU General Public License as
  // published by the Free Software Foundation, either version 3 of 
  // the License, or (at your option) any later version.

  // This program is distributed in the hope that it will be useful,
  // but WITHOUT ANY WARRANTY; without even the implied warranty of
  // MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
  // General Public License for more details.

  // You should have received a copy of the GNU General Public License
  //along with this program. If not, see https://www.gnu.org/licenses/.
  _PM = this.OS.PM;

  _APP = this.OS.APP;

  ActivityMonitor = class ActivityMonitor extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("ActivityMonitor", args);
    }

    main() {
      var header;
      this.scheme.set("apptitle", "Activity Monitor");
      this.grid = this.find("mygrid");
      this.on("btclick", (e) => {
        var app, data, item;
        if (e.id !== "btkill") {
          return;
        }
        item = this.grid.get("selectedRow");
        if (!item) {
          return;
        }
        data = item.get("data")[0];
        app = _PM.appByPid(data.text);
        if (app) {
          return app.quit(true);
        }
      });
      header = [
        {
          width: 50,
          text: "__(Pid)"
        },
        {
          text: "__(Name)"
        },
        {
          text: "__(Type)",
          width: 80
        },
        {
          width: 80,
          text: "__(Alive (ms))"
        }
      ];
      this.gdata = {
        processes: {},
        alive: []
      };
      this.grid.set("header", header);
      return this.monitor();
    }

    monitor() {
      var now;
      //get all current running process
      this.gdata.alive = [];
      now = (new Date()).getTime();
      $.each(_PM.processes, (i, d) => {
        return $.each(d, (j, a) => {
          if (this.gdata.processes[a.pid]) {
            this.gdata.processes[a.pid][3].text = now - a.birth;
            this.gdata.processes[a.pid][3].domel.update(); //add it
          } else {
            this.gdata.processes[a.pid] = [
              {
                text: a.pid
              },
              {
                icon: _APP[a.name].type === 1 ? _APP[a.name].meta.icon : a.icon,
                iconclass: _APP[a.name].type === 1 ? _APP[a.name].meta.iconclass : a.iconclass,
                text: a.name
              },
              {
                text: _APP[a.name].type === 1 ? "__(Application)" : "__(Service)"
              },
              {
                text: now - a.birth
              }
            ];
            this.grid.push(this.gdata.processes[a.pid]);
          }
          return this.gdata.alive.push(a.pid);
        });
      });
      $.each(this.gdata.processes, (i, e) => {
        if (($.inArray(Number(i), this.gdata.alive)) < 0) {
          this.grid.remove(this.gdata.processes[i].domel);
          this.gdata.processes[i] = void 0;
          return delete this.gdata.processes[i];
        }
      });
      return this.timer = setTimeout((() => {
        return this.monitor();
      }), 500);
    }

    cleanup(e) {
      if (this.timer) {
        return clearTimeout(this.timer);
      }
    }

  };

  ActivityMonitor.singleton = true;

  this.OS.register("ActivityMonitor", ActivityMonitor);

}).call(this);
