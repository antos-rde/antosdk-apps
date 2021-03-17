<<<<<<< HEAD
(function() {
  var Ant, ShowCase;

  Ant = this;

  ShowCase = class ShowCase extends this.OS.application.BaseApplication {
    constructor(args) {
      super("ShowCase", args);
    }

    main() {
      var bt, btrun, cal, dllist, fileview, grid, list, menu, pk, slider, spin, sw, tdata, tree, viewoption;
      bt = this.find('bttest');
      this.observable.on("btclick", (e) => {
        return this.notify("button clicked");
      });
      list = this.find('list');
      list.data = [
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
      ];
      list.onlistselect = (e) => {
        return this.notify(e.data.items);
      };
      sw = this.find('switch');
      sw.onswchange = (e) => {
        return this.notify(e.data);
      };
      spin = this.find('spin');
      spin.onvaluechange = (e) => {
        return this.notify(e.data);
      };
      menu = this.find('menu');
      menu.items = this.menu();
      list.contextmenuHandle = (e, m) => {
        m.items = this.menu();
        return m.show(e);
      };
      grid = this.find('grid');
      grid.oncelldbclick = (e) => {
        return this.notify("on dbclick", e);
      };
      grid.onrowselect = (e) => {
        return this.notify("on rowselect");
      };
      grid.header = [
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
      ];
      grid.rows = [
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
            text: "text 10"
          },
          {
            text: "this is a long text"
          },
          {
            text: "text 11"
          }
        ]
      ];
      tdata = {
        text: 'Tree root',
        nodes: [
          {
            text: 'leaf 1',
            iconclass: 'fa fa-car'
          },
          {
            text: 'leaf 2'
          },
          {
            text: 'sub tree 1',
            nodes: [
              {
                text: 'sub sub tree 1',
                nodes: [
                  {
                    text: 'leaf 1 of sub sub tree 1'
                  },
                  {
                    text: 'leaf 2 of sub sub tree 1'
                  }
                ]
              },
              {
                text: 'leaf 1 of sub tree'
              },
              {
                text: 'leaf 2 of sub tree'
              },
              {
                text: 'sub sub tree 2',
                nodes: [
                  {
                    text: 'leaf 1 of sub sub tree 2'
                  },
                  {
                    text: 'leaf 2 of sub sub tree 2'
                  }
                ]
              }
            ]
          }
        ]
      };
      tree = this.find('tree');
      tree.data = tdata;
      tree.ontreeselect = (e) => {
        return this.notify(e.data.item.treepath);
      };
      tree.ontreedbclick = (e) => {
        return this.notify("treedbclick");
      };
      this.observable.on("treedbclick", (e) => {
        return this.notify("observable treedbclick");
      });
      slider = this.find('slider');
      slider.onvaluechange = (v) => {
        return this.notify(v);
      };
      cal = this.find('cal');
      cal.ondateselect = (e) => {
        return this.notify(e.data.toString());
      };
      pk = this.find('cpk');
      pk.oncolorselect = (e) => {
        return this.notify(JSON.stringify(e));
      };
      fileview = this.find('fileview');
      fileview.fetch = function(path) {
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
      };
      fileview.path = "home:///";
      viewoption = this.find('viewoption');
      viewoption.data = [
        {
          text: "icon"
        },
        {
          text: "list"
        },
        {
          text: "tree"
        }
      ];
      viewoption.onlistselect = (e) => {
        this.notify(e.data.item.data.text);
        return fileview.view = e.data.item.data.text;
      };
      dllist = this.find("dialoglist");
      btrun = this.find("btrundia");
      dllist.data = [
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
      ];
      return btrun.onbtclick = (e) => {
        var item;
        item = dllist.selectedItem;
        if (!item) {
          return;
        }
        switch (item.data.id) {
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
              title: "Calendar dialog"
            }).then((d) => {
              return this.notify(d.toString());
            });
          case "colorpicker":
            return this.openDialog("ColorPickerDialog").then((d) => {
              return this.notify(JSON.stringify(d));
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
      };
    }

    mnFile() {
      var arr;
      //@notify file
      arr = {
        text: "__(File)",
        nodes: [
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
          return this.notify(e.data.item.data.text);
        }
      };
      return arr;
    }

    mnEdit() {
      return {
        text: "__(Edit)",
        nodes: [
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
          return this.notify(e.data.item.data.text);
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
          nodes: [
            {
              text: "__(Refresh)",
              dataid: `${this.name}-refresh`
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
                return this.notify(e.data.item.data.text);
              }
            }
          ],
          onchildselect: (e) => {
            return this.notify(e.data.item.data.text);
          }
        }
      ];
      return menu;
    }

  };

  ShowCase.singleton = true;

  this.OS.register("ShowCase", ShowCase);

}).call(this);
