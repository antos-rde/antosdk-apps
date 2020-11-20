(function() {
  var DocDialog, Docify, FilePreviewDialog, OwnerDialog;

  OwnerDialog = class OwnerDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("OwnerDialog", OwnerDialog.scheme);
    }

    main() {
      super.main();
      this.oview = this.find("ownview");
      this.oview.buttons = [
        {
          text: "",
          iconclass: "fa fa-plus-circle",
          onbtclick: (e) => {
            return this.openDialog("PromptDialog",
        {
              title: __("Owner"),
              label: __("Name")
            }).then((d) => {
              return this.parent.exec("insert",
        {
                table: "owners",
                data: {
                  name: d
                }
              }).then((r) => {
                if (r.error) {
                  return this.error(r.error);
                }
                return this.owner_refresh();
              }).catch((e) => {
                return this.error(__("Unable to insert owner: {0}",
        e.toString()),
        e);
              });
            }).catch((e) => {
              return this.error(e.toString(),
        e);
            });
          }
        },
        {
          text: "",
          iconclass: "fa fa-minus-circle",
          onbtclick: (e) => {
            var item;
            item = this.oview.selectedItem;
            if (!item) {
              return;
            }
            return this.ask({
              text: __("Do you realy want to delete: `{0}`",
        item.data.text)
            }).then((d) => {
              if (!d) {
                return;
              }
              return this.parent.exec("delete",
        {
                table: "owners",
                id: parseInt(item.data.id)
              }).then((d) => {
                if (d.error) {
                  return this.error(d.error);
                }
                return this.owner_refresh();
              }).catch((e) => {
                return this.error(__("Unable delete category: {0}",
        e.toString()),
        e);
              });
            });
          }
        },
        {
          text: "",
          iconclass: "fa fa-pencil-square-o",
          onbtclick: (e) => {
            var item;
            item = this.oview.selectedItem;
            if (!item) {
              return;
            }
            return this.openDialog("PromptDialog",
        {
              title: __("Owner"),
              label: __("Name"),
              value: item.data.name
            }).then((d) => {
              return this.parent.exec("update",
        {
                table: "owners",
                data: {
                  id: parseInt(item.data.id),
                  name: d
                }
              }).then((r) => {
                if (r.error) {
                  return this.error(r.error);
                }
                return this.owner_refresh();
              }).catch((e) => {
                return this.error(__("Unable to update owner: {0}",
        e.toString()),
        e);
              });
            }).catch((e) => {
              return this.error(e.toString());
            });
          }
        }
      ];
      return this.owner_refresh();
    }

    owner_refresh() {
      return this.parent.exec("fetch", "owners").then((d) => {
        var i, len, ref, v;
        ref = d.result;
        for (i = 0, len = ref.length; i < len; i++) {
          v = ref[i];
          v.text = v.name;
        }
        return this.oview.data = d.result;
      }).catch((err) => {
        return this.error(__("Unable to fetch owners: {0}", err.toString()), e);
      });
    }

  };

  OwnerDialog.scheme = `<afx-app-window width='200' height='300'>
    <afx-vbox>
        <afx-list-view data-id="ownview"></afx-list-view>
    </afx-vbox>
</afx-app-window>`;

  DocDialog = class DocDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("DocDialog", DocDialog.scheme);
    }

    main() {
      super.main();
      return this.find("file-list").buttons = [
        {
          text: "",
          iconclass: "fa fa-plus-circle",
          onbtclick: (e) => {}
        },
        {
          text: "",
          iconclass: "fa fa-minus-circle",
          onbtclick: (e) => {}
        }
      ];
    }

  };

  DocDialog.scheme = `<afx-app-window width='500' height='300'>
    <afx-hbox>
        <afx-vbox data-width="300">
            <afx-hbox data-height="22">
                <afx-label text = "__(title)" data-width="50"></afx-label>
                <input type="text"></input>
            </afx-hbox>
            <afx-hbox data-height="22">
                <afx-label text = "__(Day)" data-width="50"></afx-label>
                <afx-list-view dropdown="true"></afx-list-view>
                <afx-label text = "__(Month)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true"></afx-list-view>
                <afx-label text = "__(Year)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true"></afx-list-view>
            </afx-hbox>
            <afx-label text = "__(Files)" data-height="22"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
            <afx-label text = "__(Note)" data-height="22"></afx-label>
            <textarea></textarea>
            <afx-hbox data-height = "27">
                <afx-label text = "__(Tags)" data-width="50"></afx-label>
                <input type="text"></input>
            </afx-hbox>
        </afx-vbox>
        <afx-vbox>
            <div></div>
            <afx-button text="__(Save)" iconclass="" data-height="30" ></afx-button>
        </afx-vbox>
    </afx-hbox>
</afx-app-window>`;

  FilePreviewDialog = class FilePreviewDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("FilePreviewDialog", FilePreviewDialog.scheme);
    }

    main() {
      super.main();
      this.flist = this.find("file-list");
      this.flist.onlistselect = (e) => {
        // console.log e.data.item.data
        return this.parent.exec("preview", e.data.item.data.path).then((d) => {
          return console.log(d);
        }).catch((e) => {
          return this.error(e.toString(), e);
        });
      };
      return this.refresh();
    }

    refresh() {
      return `${this.parent.setting.docpath}/unclassified`.asFileHandle().read().then((d) => {
        var i, len, ref, v;
        if (d.error) {
          return this.parent.error(d.error);
        }
        ref = d.result;
        for (i = 0, len = ref.length; i < len; i++) {
          v = ref[i];
          v.text = v.filename;
        }
        return this.flist.data = d.result;
      }).catch((e) => {
        return this.error(__("Unable to fetch unclassified file list: {0}", e.toString()), e);
      });
    }

  };

  FilePreviewDialog.scheme = `<afx-app-window width='500' height='300'>
    <afx-hbox>
        <afx-vbox data-width="200">
            <afx-label text = "__(Files)" data-height="22"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
        </afx-vbox>
        <afx-vbox>
            <div></div>
            <afx-button text="__(Ok)" iconclass="" data-height="30" ></afx-button>
        </afx-vbox>
    </afx-hbox>
</afx-app-window>`;

  Docify = class Docify extends this.OS.application.BaseApplication {
    constructor(args) {
      super("Docify", args);
    }

    main() {
      this.catview = this.find("catview");
      this.catview.buttons = [
        {
          text: "",
          iconclass: "fa fa-plus-circle",
          onbtclick: (e) => {
            return this.openDialog("PromptDialog",
        {
              title: __("Category"),
              label: __("Name")
            }).then((d) => {
              return this.exec("insert",
        {
                table: "categories",
                data: {
                  name: d
                }
              }).then((r) => {
                if (r.error) {
                  return this.error(r.error);
                }
                return this.cat_refresh();
              }).catch((e) => {
                return this.error(__("Unable to insert category: {0}",
        e.toString()));
              });
            }).catch((e) => {
              return this.error(e.toString());
            });
          }
        },
        {
          text: "",
          iconclass: "fa fa-minus-circle",
          onbtclick: (e) => {
            var item;
            item = this.catview.selectedItem;
            if (!item) {
              return;
            }
            return this.ask({
              text: __("Do you realy want to delete: `{0}`",
        item.data.text)
            }).then((d) => {
              if (!d) {
                return;
              }
              return this.exec("delete",
        {
                table: "categories",
                id: parseInt(item.data.id)
              }).then((d) => {
                if (d.error) {
                  return this.error(d.error);
                }
                return this.cat_refresh();
              }).catch((e) => {
                return this.error(__("Unable delete category: {0}",
        e.toString()));
              });
            });
          }
        },
        {
          text: "",
          iconclass: "fa fa-pencil-square-o",
          onbtclick: (e) => {
            var item;
            item = this.catview.selectedItem;
            if (!item) {
              return;
            }
            return this.openDialog("PromptDialog",
        {
              title: __("Category"),
              label: __("Name"),
              value: item.data.name
            }).then((d) => {
              return this.exec("update",
        {
                table: "categories",
                data: {
                  id: parseInt(item.data.id),
                  name: d
                }
              }).then((r) => {
                if (r.error) {
                  return this.error(r.error);
                }
                return this.cat_refresh();
              }).catch((e) => {
                return this.error(__("Unable to update category: {0}",
        e.toString()));
              });
            }).catch((e) => {
              return this.error(e.toString());
            });
          }
        }
      ];
      this.find("bt-add-doc").onbtclick = (e) => {
        return this.openDialog(new DocDialog());
      };
      return this.initialize();
    }

    cat_refresh() {
      return this.exec("fetch", "categories").then((d) => {
        var i, len, ref, v;
        ref = d.result;
        for (i = 0, len = ref.length; i < len; i++) {
          v = ref[i];
          v.text = v.name;
        }
        return this.catview.data = d.result;
      }).catch((err) => {
        return this.error(__("Unable to fetch categories: {0}", err.toString()));
      });
    }

    initialize() {
      // Check if we have configured docpath
      if (this.setting.docpath) {
        // check data base
        return this.initdb();
      } else {
        // ask user to choose a docpath
        return this.openDialog("FileDialog", {
          title: __("Please select a doc path"),
          mimes: ['dir']
        }).then((d) => {
          this.setting.docpath = d.file.path;
          this._api.setting();
          return this.initdb();
        }).catch((msg) => {
          return this.error(msg.toString(), msg);
        });
      }
    }

    exec(action, args) {
      var cmd;
      cmd = {
        path: `${this.path()}/api.lua`,
        parameters: {
          action: action,
          docpath: this.setting.docpath,
          args: args
        }
      };
      return this.call(cmd);
    }

    initdb() {
      if (!this.setting.docpath) {
        return this.error(__("No configured docpath"));
      }
      // fetch the categories from the database
      return this.exec("init").then((d) => {
        if (d.error) {
          return this.error(d.error);
        }
        this.notify(d.result);
        // load categories
        return this.cat_refresh();
      }).catch((e) => {
        return this.error(__("Unable to init database: {0}", e.toString()));
      });
    }

    menu() {
      return [
        {
          text: "__(View)",
          nodes: [
            {
              text: "__(Owners)",
              id: "owners",
              shortcut: "A-O"
            },
            {
              text: "__(Preview)",
              id: "preview",
              shortcut: "A-P"
            }
          ],
          onchildselect: (e) => {
            return this.fileMenuHandle(e.data.item.data.id);
          }
        }
      ];
    }

    fileMenuHandle(id) {
      switch (id) {
        case "owners":
          return this.openDialog(new OwnerDialog(), {
            title: __("Owners")
          });
        case "preview":
          return this.openDialog(new FilePreviewDialog());
      }
    }

  };

  this.OS.register("Docify", Docify);

}).call(this);
