(function() {
  var TinyEditor;

  TinyEditor = class TinyEditor extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("TinyEditor", args);
    }

    main() {
      var me;
      me = this;
      this.editor = this.find("editor");
      this.stbar = this.find("statusbar");
      this.bindKey("ALT-N", function() {
        return me.newFile();
      });
      this.bindKey("ALT-O", function() {
        return me.openFile();
      });
      this.bindKey("CTRL-S", function() {
        return me.saveFile();
      });
      this.filehandler = null;
      $(this.editor).on('input', function(e) {
        if (me.filehandler.dirty === true) {
          return;
        }
        me.filehandler.dirty = true;
        return me.scheme.set("apptitle", `${me.filehandler.path}*`);
      });
      return this.read();
    }

    menu() {
      var m, me;
      me = this;
      m = [
        {
          text: "__(File)",
          child: [
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
          onmenuselect: function(e) {
            switch (e.item.data.dataid) {
              case "new":
                return me.newFile();
              case "open":
                return me.openFile();
              case "save":
                return me.saveFile();
            }
          }
        }
      ];
      return m;
    }

    newFile() {
      this.filehandler = null;
      return this.read();
    }

    openFile(fi) {
      var me;
      me = this;
      return this.openDialog("FileDiaLog", function(dir, fname, d) {
        me.filehandler = `${dir}/${fname}`.asFileHandler();
        return me.read();
      }, __("Open file"));
    }

    saveFile() {
      var me;
      me = this;
      this.filehandler.cache = this.editor.value;
      if (this.filehandler.path !== "Untitled") {
        return this.write();
      }
      return this.openDialog("FileDiaLog", function(dir, fname, d) {
        me.filehandler.setPath(`${dir}/${fname}`);
        return me.write();
      }, __("Save as"), {
        file: me.filehandler
      });
    }

    read() {
      var me;
      me = this;
      this.editor.value = "";
      if (this.filehandler === null) {
        this.filehandler = "Untitled".asFileHandler();
        this.scheme.set("apptitle", "Untitled");
        return;
      }
      return this.filehandler.read(function(d) {
        me.scheme.set("apptitle", me.filehandler.path);
        return me.editor.value = d;
      });
    }

    write() {
      var me;
      me = this;
      return this.filehandler.write("text/plain", function(d) {
        if (d.error) {
          return me.error(__("Error saving file {0}", me.filehandler.path));
        }
        me.filehandler.dirty = false;
        return me.scheme.set("apptitle", `${me.filehandler.path}`);
      });
    }

    cleanup(e) {
      var me;
      if (!this.filehandler.dirty) {
        return;
      }
      me = this;
      e.preventDefault();
      return this.ask("__(Quit)", "__(Quit without saving?)", function() {
        me.filehandler.dirty = false;
        return me.quit();
      });
    }

  };

  this.OS.register("TinyEditor", TinyEditor);

}).call(this);
