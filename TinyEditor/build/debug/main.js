(function() {
  var TinyEditor;

  TinyEditor = class TinyEditor extends this.OS.application.BaseApplication {
    constructor(args) {
      super("TinyEditor", args);
    }

    main() {
      this.editor = this.find("editor");
      this.bindKey("ALT-N", () => {
        return this.newFile();
      });
      this.bindKey("ALT-O", () => {
        return this.openFile();
      });
      this.bindKey("CTRL-S", () => {
        return this.saveFile();
      });
      this.filehandle = this.args && this.args.length > 0 ? this.args[0].path.asFileHandle() : null;
      $(this.editor).on('input', (e) => {
        if (this.filehandle.dirty === true) {
          return;
        }
        this.filehandle.dirty = true;
        return this.scheme.apptitle = `${this.filehandle.path}*`;
      });
      return this.read();
    }

    menu() {
      var m;
      m = [
        {
          text: "__(File)",
          nodes: [
            {
              text: "__(New)",
              dataid: "new",
              shortcut: 'A-N'
            },
            {
              text: "__(Open)",
              dataid: "open",
              shortcut: 'A-O'
            },
            {
              text: "__(Save)",
              dataid: "save",
              shortcut: 'C-S'
            }
          ],
          onchildselect: (e) => {
            switch (e.data.item.data.dataid) {
              case "new":
                return this.newFile();
              case "open":
                return this.openFile();
              case "save":
                return this.saveFile();
            }
          }
        }
      ];
      return m;
    }

    newFile() {
      this.filehandle = null;
      return this.read();
    }

    openFile() {
      return this.openDialog("FileDialog", {
        title: __("Open file")
      }).then((d) => {
        this.filehandle = d.file.path.asFileHandle();
        return this.read();
      });
    }

    saveFile() {
      this.filehandle.cache = this.editor.value;
      if (this.filehandle.path !== "Untitled") {
        return this.write();
      }
      return this.openDialog("FileDialog", {
        title: __("Save as"),
        file: this.filehandle
      }).then((f) => {
        var d;
        d = f.file.path.asFileHandle();
        if (f.file.type === "file") {
          d = d.parent();
        }
        this.filehandle.setPath(`${d.path}/${f.name}`);
        return this.write();
      });
    }

    read() {
      this.editor.value = "";
      if (this.filehandle === null) {
        this.filehandle = "Untitled".asFileHandle();
        this.scheme.apptitle = "Untitled";
        return;
      }
      return this.filehandle.read().then((d) => {
        this.scheme.apptitle = this.filehandle.path;
        return this.editor.value = d;
      }).catch((e) => {
        return this.error(__("Unable to read file content"));
      });
    }

    write() {
      return this.filehandle.write("text/plain").then((d) => {
        this.filehandle.dirty = false;
        return this.scheme.apptitle = `${this.filehandle.path}`;
      }).catch((e) => {
        return this.error(__("Error saving file {0}", this.filehandle.path), e);
      });
    }

    cleanup(e) {
      if (!this.filehandle.dirty) {
        return;
      }
      e.preventDefault();
      return this.ask({
        title: "__(Quit)",
        text: "__(Quit without saving?)"
      }).then((d) => {
        if (!d) {
          return;
        }
        this.filehandle.dirty = false;
        return this.quit();
      });
    }

  };

  this.OS.register("TinyEditor", TinyEditor);

}).call(this);
