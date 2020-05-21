(function() {
  void 0;
  var Ant, ShowCase;

  Ant = this;

  ShowCase = class ShowCase extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("ShowCase", args);
    }

    main() {
      var bt, btrun, cal, dllist, fileview, grid, list, menu, pk, slider, spin, sw, tdata, tree, viewoption;
      bt = this.find('bttest');
      bt.set("onbtclick", (e) => {
        return this.error("test error");
      });
      this.observable.on("btclick", (e) => {
        return this.notify("button clicked");
      });
      this.observable.on("menuselect", (e) => {
        return this.notify(e.id);
      });
      list = this.find('list');
      list.set("data", [
        {
          text: "some thing with avery long text"
        },
        {
          text: "some thing 1",
          closable: true
        },
        {
          text: "some thing 2",
          iconclass: "fa fa-camera-retro fa-lg"
        },
        {
          text: "some thing 3"
        },
        {
          text: "some thing 4"
        },
        {
          text: "some thing 5"
        }
      ]);
      list.unshift({
        text: "shifted el"
      });
      list.set("onlistselect", (e) => {
        return this.notify(e.data.items);
      });
      sw = this.find('switch');
      sw.set("onchange", (e) => {
        return this.notify(e.data);
      });
      spin = this.find('spin');
      spin.set("onchange", (e) => {
        return this.notify(e.data);
      });
      menu = this.find('menu');
      menu.set("items", this.menu());
      list.contextmenuHandle = (e, m) => {
        m.set("items", this.menu());
        return m.show(e);
      };
      grid = this.find('grid');
      grid.set("oncelldbclick", (e) => {
        return this.notify("on dbclick", e);
      });
      grid.set("onrowselect", (e) => {
        return this.notify("on rowselect", e.data.items);
      });
      this.observable.on("cellselect", function(e) {
        return console.log("observable", e);
      });
      grid.set("header", [
        {
          text: "header1",
          width: 80
        },
        {
          text: "header2"
        },
        {
          text: "header3"
        }
      ]);
      grid.set("rows", [
        [
          {
            text: "text 1"
          },
          {
            text: "text 2"
          },
          {
            text: "text 3"
          }
        ],
        [
          {
            text: "text 4"
          },
          {
            text: "text 5"
          },
          {
            text: "text 6"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "Subgrid on columns and rows. Subgrid on columns, implicit grid rows. Subgrid on rows, defined column tracks"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ],
        [
          {
            text: "text 7"
          },
          {
            text: "text 8"
          },
          {
            text: "text 9"
          }
        ]
      ]);
      tdata = {
        name: 'My Tree',
        nodes: [
          {
            name: 'hello',
            iconclass: 'fa fa-car'
          },
          {
            name: 'wat'
          },
          {
            name: 'child folder',
            nodes: [
              {
                name: 'child folder',
                nodes: [
                  {
                    name: 'hello'
                  },
                  {
                    name: 'wat'
                  }
                ]
              },
              {
                name: 'hello'
              },
              {
                name: 'wat'
              },
              {
                name: 'child folder',
                nodes: [
                  {
                    name: 'hello'
                  },
                  {
                    name: 'wat'
                  }
                ]
              }
            ]
          }
        ]
      };
      tree = this.find('tree');
      tree.set("data", tdata);
      tree.set("ontreeselect", (e) => {
        return this.notify(e.data.item.get("treepath"));
      });
      tree.set("ontreedbclick", (e) => {
        return this.notify("treedbclick", e);
      });
      this.observable.on("treedbclick", (e) => {
        return this.notify("observable treedbclick", e);
      });
      slider = this.find('slider');
      slider.set("onchange", (v) => {
        return this.notify(v);
      });
      cal = this.find('cal');
      cal.set("ondateselect", (e) => {
        return this.notify(e);
      });
      pk = this.find('cpk');
      pk.set("oncolorselect", (e) => {
        return this.notify(e);
      });
      pk.set("oncolorselect", (e) => {
        return this.notify(e);
      });
      fileview = this.find('fileview');
      fileview.set("fetch", function(path) {
        return new Promise(function(resolve, reject) {
          var dir;
          dir = path.asFileHandle();
          return dir.read().then(function(d) {
            var p;
            p = dir.parent().asFileHandle();
            p.filename = "[..]";
            p.type = "dir";
            if (d.error) {
              return reject(d.error);
            }
            d.result.unshift(p);
            return resolve(d.result);
          });
        });
      });
      fileview.set("path", "home:///");
      viewoption = this.find('viewoption');
      viewoption.set("data", [
        {
          text: "icon"
        },
        {
          text: "list"
        },
        {
          text: "tree"
        }
      ]);
      viewoption.set("onlistselect", (e) => {
        this.notify(e.data.item.get("data").text);
        return fileview.set("view", e.data.item.get("data").text);
      });
      dllist = this.find("dialoglist");
      btrun = this.find("btrundia");
      dllist.set("data", [
        {
          text: "Prompt dialog",
          id: "prompt"
        },
        {
          text: "Calendar dialog",
          id: "calendar"
        },
        {
          text: "Color picker dialog",
          id: "colorpicker"
        },
        {
          text: "Info dialog",
          id: "info"
        },
        {
          text: "YesNo dialog",
          id: "yesno"
        },
        {
          text: "Selection dialog",
          id: "selection"
        },
        {
          text: "About dialog",
          id: "about"
        },
        {
          text: "File dialog",
          id: "file"
        },
        {
          text: "Text dialog",
          id: "text"
        }
      ]);
      return btrun.set("onbtclick", (e) => {
        var item;
        item = dllist.get("selectedItem");
        if (!item) {
          return;
        }
        switch (item.get("data").id) {
          case "prompt":
            return this.openDialog("PromptDialog", {
              title: "Prompt review",
              value: "txt data",
              label: "enter value"
            }).then((d) => {
              return this.notify(d);
            });
          case "calendar":
            return this.openDialog("CalendarDialog", {
              title: "Calendar"
            }).then((d) => {
              return this.notify(d);
            });
          case "colorpicker":
            return this.openDialog("ColorPickerDialog").then((d) => {
              return this.notify(d);
            });
          case "info":
            return this.openDialog("InfoDialog", {
              title: "Info application",
              name: "Show case",
              date: "10/12/2014",
              description: "the brown fox jumps over the lazy dog"
            }).then(function(d) {});
          case "yesno":
            return this.openDialog("YesNoDialog", {
              title: "Question ?",
              text: "Do you realy want to delete file ?"
            }).then((d) => {
              return this.notify(d);
            });
          case "selection":
            return this.openDialog("SelectionDialog", {
              title: "Select data ?",
              data: [
                {
                  text: "Option 1"
                },
                {
                  text: "Option 2"
                },
                {
                  text: "Option 3",
                  iconclass: "fa fa-camera-retro fa-lg"
                }
              ]
            }).then((d) => {
              return this.notify(d.text);
            });
          case "about":
            return this.openDialog("AboutDialog").then((d) => {});
          case "file":
            return this.openDialog("FileDialog", {
              title: "Select file ?",
              //root: "home:///",
              mimes: ["text/*", "dir"],
              file: "Untitled".asFileHandle()
            }).then((f, name) => {
              return this.notify(f, name);
            });
          case "text":
            return this.openDialog("TextDialog", {
              title: "Text dialog review",
              value: "txt data"
            }).then((d) => {
              return this.notify(d);
            });
        }
      });
    }

    mnFile() {
      var arr;
      //@notify file
      arr = {
        text: "__(File)",
        child: [
          {
            text: "__(New file)",
            dataid: `${this.name}-mkf`,
            shortcut: 'C-F'
          },
          {
            text: "__(New folder)",
            dataid: `${this.name}-mkdir`,
            shortcut: 'C-D'
          },
          {
            text: "__(Open with)",
            dataid: `${this.name}-open`,
            child: this.apps
          },
          {
            text: "__(Upload)",
            dataid: `${this.name}-upload`,
            shortcut: 'C-U'
          },
          {
            text: "__(Download)",
            dataid: `${this.name}-download`
          },
          {
            text: "__(Share file)",
            dataid: `${this.name}-share`,
            shortcut: 'C-S'
          },
          {
            text: "__(Properties)",
            dataid: `${this.name}-info`,
            shortcut: 'C-I'
          }
        ],
        onchildselect: (e) => {
          return this.notify("child", e);
        }
      };
      return arr;
    }

    mnEdit() {
      return {
        text: "__(Edit)",
        child: [
          {
            text: "__(Rename)",
            dataid: `${this.name}-mv`,
            shortcut: 'C-R'
          },
          {
            text: "__(Delete)",
            dataid: `${this.name}-rm`,
            shortcut: 'C-M'
          },
          {
            text: "__(Cut)",
            dataid: `${this.name}-cut`,
            shortcut: 'C-X'
          },
          {
            text: "__(Copy)",
            dataid: `${this.name}-copy`,
            shortcut: 'C-C'
          },
          {
            text: "__(Paste)",
            dataid: `${this.name}-paste`,
            shortcut: 'C-P'
          }
        ],
        onchildselect: (e) => {
          return console.log("child", e);
        }
      };
    }

    menu() {
      var menu;
      menu = [
        this.mnFile(),
        this.mnEdit(),
        {
          text: "__(View)",
          child: [
            {
              text: "__(Refresh)",
              dataid: `${this.name}-refresh`,
              onmenuselect: function(e) {
                return console.log("select",
            e);
              }
            },
            {
              text: "__(Sidebar)",
              switch: true,
              checked: true
            },
            {
              text: "__(Navigation bar)",
              switch: true,
              checked: false
            },
            {
              text: "__(Hidden files)",
              switch: true,
              checked: true,
              dataid: `${this.name}-hidden`
            },
            {
              text: "__(Type)",
              child: [
                {
                  text: "__(Icon view)",
                  radio: true,
                  checked: true,
                  dataid: `${this.name}-icon`,
                  type: 'icon'
                },
                {
                  text: "__(List view)",
                  radio: true,
                  checked: false,
                  dataid: `${this.name}-list`,
                  type: 'list'
                },
                {
                  text: "__(Tree view)",
                  radio: true,
                  checked: false,
                  dataid: `${this.name}-tree`,
                  type: 'tree'
                }
              ],
              onchildselect: function(e) {
                return console.log("child",
            e);
              }
            }
          ],
          onchildselect: (e) => {
            return console.log("child",
        e);
          }
        }
      ];
      return menu;
    }

  };

  ShowCase.singleton = true;

  this.OS.register("ShowCase", ShowCase);

}).call(this);
