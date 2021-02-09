(function() {
  var OnlyOffice;

  OnlyOffice = class OnlyOffice extends this.OS.application.BaseApplication {
    constructor(args) {
      super("OnlyOffice", args);
      this.eid = `id${Math.random().toString(36).replace(".", "")}`;
    }

    main() {
      this.currfile = void 0;
      if (this.args && this.args.length > 0) {
        this.currfile = this.args[0].path.asFileHandle();
      }
      this.placeholder = this.find("editor-area");
      this.placeholder.id = this.eid;
      this.find("btn-open-file").onbtclick = (e) => {
        return this.openFile();
      };
      this.find("btn-new-doc").onbtclick = (e) => {
        return this.create("word");
      };
      this.find("btn-new-cell").onbtclick = (e) => {
        return this.create("sheet");
      };
      this.find("btn-new-slide").onbtclick = (e) => {
        return this.create("slide");
      };
      if (this.currfile) {
        return this.open();
      }
    }

    create(type) {
      var ext;
      ext = void 0;
      if (type === "word") {
        ext = "docx";
      }
      if (type === "sheet") {
        ext = "xlsx";
      }
      if (type === "slide") {
        ext = "pptx";
      }
      if (!ext) {
        return this.error(__("Unkown file type"));
      }
      return this.openDialog("FileDialog", {
        title: __("Save file as"),
        type: "dir",
        file: `home://Untitled.${ext}`.asFileHandle()
      }).then((d) => {
        var file, model;
        file = `${d.file.path}/${d.name}`.asFileHandle();
        // copy file to destination
        model = `${this.path()}/templates/model.${ext}`.asFileHandle();
        return model.read("binary").then((d) => {
          var blob;
          blob = new Blob([d], {
            type: model.info.mime
          });
          file.cache = blob;
          return file.write(model.info.mime).then((r) => {
            file.cache = void 0;
            this.currfile = file;
            return this.open();
          }).catch((e) => {
            return this.error(e.toString(), e);
          });
        }).catch((err) => {
          return this.error(err.toString(), err);
        });
      });
    }

    openFile() {
      return this.openDialog("FileDialog", {
        title: __("Open file"),
        type: "file",
        mimes: this.meta().mimes
      }).then((f, name) => {
        this.currfile = f.file.path.asFileHandle();
        return this.open();
      });
    }

    open() {
      if (!this.currfile) {
        return;
      }
      return this.exec("token", {
        file: this.currfile.path
      }).then((d) => {
        if (d.error) {
          return this.error(d.error);
        }
        this.access_token = d.result;
        return this.currfile.onready().then((meta) => {
          this.scheme.apptitle = this.currfile.path;
          $(this.placeholder).empty();
          if (this.editor) {
            this.editor.destroyEditor();
          }
          return this.editor = new DocsAPI.DocEditor(this.eid, {
            events: {
              onRequestCreateNew: () => {
                return this.newDocument();
              },
              onRequestSaveAs: (e) => {
                return this.saveAs(e);
              }
            },
            document: {
              fileType: this.currfile.ext,
              key: meta.mtime.hash().toString(),
              title: this.currfile.filename,
              url: this.currfile.getlink() + "?" + this.access_token
            },
            documentType: this.getDocType(this.currfile.ext),
            editorConfig: {
              user: {
                id: this.systemsetting.user.id.toString(),
                name: this.systemsetting.user.username
              },
              customization: {
                compactHeader: false
              },
              //autosave: false,
              //forcesave: true
              callbackUrl: this.uapi("save")
            }
          });
        });
      }).catch((e) => {
        return this.error(e.toString(), e);
      });
    }

    getDocType(ext) {
      if ("doc,docx,epub,odt".split(",").includes(ext)) {
        return "word";
      }
      if ("csv,ods,xls,xlsx".split(",").includes(ext)) {
        return "cell";
      }
      if ("odp,ppt,pptx".split(",").includes(ext)) {
        return "slide";
      }
      return "none";
    }

    saveAs(e) {
      var rfile;
      if (!e.data.url) {
        return;
      }
      rfile = e.data.url.asFileHandle();
      return this.openDialog("FileDialog", {
        title: __("Save file as"),
        type: "dir",
        file: `home://${e.data.title}`.asFileHandle()
      }).then((d) => {
        var file;
        file = `${d.file.path}/${d.name}`;
        // copy file to destination
        return this.exec("duplicate", {
          remote: e.data.url,
          as: file
        }).then((r) => {
          if (r.error) {
            return this.error(r.error);
          }
          this.currfile = file.asFileHandle();
          return this.open();
        }).catch((e) => {
          return this.error(e.toString(), e);
        });
      });
    }

    newDocument() {
      return this.openDialog("SelectionDialog", {
        title: __("Create new"),
        data: [
          {
            text: __("Open a file"),
            iconclass: "fa fa-folder-open",
            type: "open"
          },
          {
            text: __("Document"),
            iconclass: "fa  fa-file-word-o",
            type: "word"
          },
          {
            text: __("Spreadsheet"),
            iconclass: "fa  fa-file-excel-o",
            type: "sheet"
          },
          {
            text: __("Presentation"),
            iconclass: "fa  fa-file-powerpoint-o",
            type: "slide"
          }
        ]
      }).then((d) => {
        switch (d.type) {
          case "open":
            return this.openFile();
          default:
            return this.create(d.type);
        }
      });
    }

    uapi(action) {
      return `${this._api.REST}/system/apigateway?ws=0&path=${this.path()}/api.lua&action=${action}&file=${this.currfile.path}&${this.access_token}`;
    }

    exec(action, args) {
      var cmd;
      cmd = {
        path: `${this.path()}/api.lua`,
        parameters: {
          action: action,
          args: args
        }
      };
      return this.call(cmd);
    }

    cleanup() {
      if (this.editor) {
        this.editor.destroyEditor();
      }
      return this.editor = void 0;
    }

  };

  OnlyOffice.dependencies = ["https://office.iohub.dev/web-apps/apps/api/documents/api.js"];

  this.OS.register("OnlyOffice", OnlyOffice);

  this.extensionParams = {
    url: "https://office.iohub.dev/web-apps/"
  };

}).call(this);
