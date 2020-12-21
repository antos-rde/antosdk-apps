(function() {
  var DiffEditor;

  DiffEditor = class DiffEditor extends this.OS.application.BaseApplication {
    constructor(args) {
      super("DiffEditor", args);
    }

    main() {
      var j, len, list, opts, ref, v;
      this.editor_cnt = this.find("diffeditor");
      this.fileview = this.find("fileview");
      this.fileview.fetch = (path) => {
        return new Promise((resolve, reject) => {
          return path.asFileHandle().read().then((d) => {
            if (d.error) {
              return reject(d.error);
            }
            return resolve(d.result);
          }).catch((e) => {
            return reject(__e(e));
          });
        });
      };
      this.fileview.onfileopen = (e) => {
        if (!(e.data && e.data.path)) {
          return;
        }
        if (e.data.type === "dir") {
          return;
        }
        return this.openFile(e.data.path.asFileHandle());
      };
      this.currdir = void 0;
      ace.config.set('basePath', "scripts/ace");
      ace.require("ace/ext/language_tools");
      this.modelist = ace.require("ace/ext/modelist");
      list = [];
      ref = this.modelist.modes;
      for (j = 0, len = ref.length; j < len; j++) {
        v = ref[j];
        list.push({
          text: v.caption,
          mode: v.mode
        });
      }
      this.langlist = this.find("langmode");
      this.langlist.data = list;
      this.langlist.onlistselect = (e) => {
        this.editors.left.getSession().setMode(e.data.item.data.mode);
        return this.editors.right.getSession().setMode(e.data.item.data.mode);
      };
      this.differ = new AceDiff({
        // ace: window.ace,
        element: this.editor_cnt,
        theme: "ace/theme/monokai",
        left: {
          content: ''
        },
        right: {
          content: ''
        }
      });
      this.editors = this.differ.getEditors();
      opts = {
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        highlightActiveLine: true,
        highlightSelectedWord: true,
        behavioursEnabled: true,
        //wrap: true,
        fontSize: "10pt",
        showInvisibles: true
      };
      this.editors.left.setOptions(opts);
      this.editors.right.setOptions(opts);
      this.editors.left.current_file = void 0;
      this.editors.right.current_file = void 0;
      this.editors.left.afx_label = this.find("left-file");
      this.editors.right.afx_label = this.find("right-file");
      this.editors.left.mux = false;
      this.editors.right.mux = false;
      this.on("resize", () => {
        this.editors = this.differ.getEditors();
        this.editors.left.resize();
        return this.editors.right.resize();
      });
      $('.acediff__left .ace_scrollbar-v', this.editor_cnt).scroll(() => {
        return this.editors.right.session.setScrollTop(this.editors.left.session.getScrollTop());
      });
      $('.acediff__right .ace_scrollbar-v', this.editor_cnt).scroll(() => {
        return this.editors.left.session.setScrollTop(this.editors.right.session.getScrollTop());
      });
      this.editors.left.on("focus", (e) => {
        return this.current_editor = this.editors.left;
      });
      this.editors.right.on("focus", (e) => {
        return this.current_editor = this.editors.right;
      });
      this.editors.left.on("input", (e) => {
        if (this.editors.left.mux) {
          return this.editors.left.mux = false;
        }
        if (!this.editors.left.current_file) {
          return this.editors.left.afx_label.text = __("Temporary file");
        }
        if (this.editors.left.current_file.dirty) {
          return;
        }
        this.editors.left.current_file.dirty = true;
        return this.editors.left.afx_label.text += "*";
      });
      this.editors.right.on("input", (e) => {
        if (this.editors.right.mux) {
          return this.editors.right.mux = false;
        }
        if (!this.editors.right.current_file) {
          return this.editors.right.afx_label.text = __("Temporary file");
        }
        if (this.editors.right.current_file.dirty) {
          return;
        }
        this.editors.right.current_file.dirty = true;
        return this.editors.right.afx_label.text += "*";
      });
      this.current_editor = this.editors.left;
      this.current_editor.focus();
      this.bindKey("ALT-O", () => {
        return this.menuAction("open");
      });
      this.bindKey("ALT-F", () => {
        return this.menuAction("opendir");
      });
      this.bindKey("CTRL-S", () => {
        return this.menuAction("save");
      });
      return this.toggleSideBar();
    }

    toggleSideBar() {
      if (this.currdir) {
        $(this.fileview).show();
        this.fileview.path = this.currdir.path;
      } else {
        $(this.fileview).hide();
      }
      return this.trigger("resize");
    }

    menu() {
      return [
        {
          text: __("File"),
          nodes: [
            {
              text: __("Open"),
              dataid: "open",
              shortcut: "A-O"
            },
            {
              text: __("Open Folder"),
              dataid: "opendir",
              shortcut: "A-F"
            },
            {
              text: __("Save"),
              dataid: "save",
              shortcut: "C-S"
            }
          ],
          onchildselect: (e) => {
            return this.menuAction(e.data.item.data.dataid);
          }
        }
      ];
    }

    openFile(file) {
      this.current_editor.mux = true;
      return file.read().then((d) => {
        var i, item, j, len, m, ref, v;
        file.cache = d;
        this.current_editor.current_file = file;
        this.current_editor.afx_label.text = file.path;
        this.current_editor.setValue(d, -1);
        // select current mode
        m = this.modelist.getModeForPath(file.path);
        ref = this.langlist.data;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          v = ref[i];
          if (v.mode === m.mode) {
            item = i;
          }
        }
        if (item === void 0) {
          return;
        }
        return this.langlist.selected = item;
      });
    }

    menuAction(dataid) {
      var fn;
      switch (dataid) {
        case "open":
          return this.openDialog("FileDialog", {
            title: __("Open file"),
            mimes: ["text/.*", "application/json", "application/javascript"]
          }).then((f) => {
            return this.openFile(f.file.path.asFileHandle());
          });
        case "opendir":
          return this.openDialog("FileDialog", {
            title: __("Open folder"),
            mimes: ["dir"]
          }).then((f) => {
            this.currdir = f.file.path.asFileHandle();
            return this.toggleSideBar();
          });
        case "save":
          fn = (ed) => {
            if (!(ed.current_file && ed.current_file.dirty)) {
              return;
            }
            ed.current_file.cache = ed.getValue();
            return ed.current_file.write("text/plain").then((r) => {
              ed.current_file.dirty = false;
              ed.afx_label.text = ed.current_file.path;
              return this.notify(__("File {0} saved", ed.current_file.path));
            }).catch((e) => {
              return this.error(__("Unable to save to: {0}", ed.current_file.path), e);
            });
          };
          fn(this.editors.left);
          return fn(this.editors.right);
        default:
          return console.log(dataid);
      }
    }

    cleanup(evt) {
      var dirty;
      dirty = false;
      if (this.editors.left.current_file && this.editors.left.current_file.dirty) {
        dirty = true;
      }
      if (this.editors.right.current_file && this.editors.right.current_file.dirty) {
        dirty = true;
      }
      if (dirty) {
        evt.preventDefault();
        return this.ask({
          title: __("Unsaved changes"),
          text: __("Ignore modification ?")
        }).then((d) => {
          if (!d) {
            return;
          }
          this.editors.left.current_file.dirty = false;
          this.editors.right.current_file.dirty = false;
          return this.quit();
        });
      } else {
        return this.differ.destroy();
      }
    }

  };

  DiffEditor.dependencies = ["os://scripts/ace/ace.js", "pkg://AceDiff/main.js", "pkg://AceDiff/main.css"];

  this.OS.register("DiffEditor", DiffEditor);

}).call(this);
