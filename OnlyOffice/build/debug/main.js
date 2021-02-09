(function() {
  var OnlyOffice;

  OnlyOffice = class OnlyOffice extends this.OS.application.BaseApplication {
    constructor(args) {
      super("OnlyOffice", args);
      this.eid = `id${Math.random().toString(36).replace(".", "")}`;
    }

    main() {
      var placeholder;
      this.currfile = void 0;
      if (this.args && this.args.length > 0) {
        this.currfile = this.args[0].path.asFileHandle();
      }
      placeholder = this.find("editor-area");
      placeholder.id = this.eid;
      if (this.currfile) {
        return this.open();
      }
    }

    open() {
      if (!this.currfile) {
        return;
      }
      console.log(this.currfile);
      return this.exec("token", {
        file: this.currfile.path
      }).then((d) => {
        if (d.error) {
          return this.error(d.error);
        }
        this.access_token = d.result;
        return this.currfile.onready().then((meta) => {
          if (this.editor) {
            //@scheme.apptitle = @currfile.path
            this.editor.destroyEditor();
          }
          return this.editor = new DocsAPI.DocEditor(this.eid, {
            events: {
              onRequestCreateNew: () => {
                return this.newDocument();
              },
              onRequestSaveAs: (e) => {
                return console.log(e);
              }
            },
            document: {
              fileType: this.currfile.ext,
              key: meta.mtime.hash().toString(),
              title: this.currfile.path,
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
      return console.log(e);
    }

    newDocument() {
      console.log("create document");
      return this.error(__("Unable to create document"));
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
