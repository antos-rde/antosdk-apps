(function() {
  var Book, Booklet, BookletChapter, BookletEntry, BookletFile, BookletFolder, BookletSection;

  Booklet = class Booklet extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("Booklet", args);
    }

    main() {
      var me;
      me = this;
      this.tree = this.find("toc-ui");
      this.currentToc = void 0;
      this.on("treeselect", function(e) {
        if ((me.currentToc === e) || (e === void 0) || (e.treepath === 0)) {
          return;
        }
        return me.open(e);
      });
      this.initEditor();
      this.resizeContent();
      this.tree.contextmenuHandler = function(e, m) {
        var menus;
        menus = me.contextMenu();
        if (!menus) {
          return;
        }
        m.set("items", menus);
        m.set("onmenuselect", function(evt) {
          return me[evt.item.data.dataid]();
        });
        return m.show(e);
      };
      return this.editor.codemirror.on("change", function() {
        if (!me.currentToc) {
          return;
        }
        return me.currentToc.descFile.dirty = true;
      });
    }

    newChapter() {
      var ch;
      if (!(this.currentToc && this.currentToc.type === "book")) {
        return this.error(__("No book selected"));
      }
      ch = new BookletChapter(this.book);
      return this.displayToc();
    }

    newSection() {
      var sec;
      if (!(this.currentToc && this.currentToc.type === "chapter")) {
        return this.error(__("No chapter selected"));
      }
      sec = new BookletSection(this.currentToc);
      return this.displayToc();
    }

    newFile() {
      var file;
      if (!(this.currentToc && this.currentToc.type === "section")) {
        return this.error(__("No section selected"));
      }
      file = new BookletFile(this.currentToc);
      return this.displayToc();
    }

    contextMenu() {
      if (!this.currentToc) {
        return void 0;
      }
      switch (this.currentToc.type) {
        case "book":
          return [
            {
              text: __("New chapter"),
              dataid: "newChapter"
            },
            {
              text: __("Delete book"),
              dataid: "deleteBook"
            }
          ];
        case "chapter":
          return [
            {
              text: __("New section"),
              dataid: "newSection"
            },
            {
              text: __("Delete chapter"),
              dataid: "deleteChapter"
            }
          ];
        case "section":
          return [
            {
              text: __("New file"),
              dataid: "newFile"
            },
            {
              text: __("Delete section"),
              dataid: "deleteSection"
            }
          ];
      }
      return void 0;
    }

    initEditor() {
      var markarea, me;
      markarea = this.find("markarea");
      this.container = this.find("mycontainer");
      this.previewOn = false;
      this.editormux = false;
      me = this;
      this.editor = new SimpleMDE({
        element: markarea,
        autofocus: true,
        tabSize: 4,
        indentWithTabs: true,
        toolbar: [
          "bold",
          "italic",
          "heading",
          "|",
          "quote",
          "code",
          "unordered-list",
          "ordered-list",
          "|",
          "link",
          "image",
          "table",
          "horizontal-rule",
          "|",
          {
            name: "preview",
            className: "fa fa-eye no-disable",
            action: function(e) {
              me.previewOn = !me.previewOn;
              return SimpleMDE.togglePreview(e);
            }
          }
        ]
      });
      //if(self.previewOn) toggle the highlight
      //{
      //    var container = self._scheme.find(self,"Text")
      //                        .$element.getElementsByClassName("editor-preview");
      //    if(container.length == 0) return;
      //    var codes = container[0].getElementsByTagName('pre');
      //    codes.forEach(function(el){
      //        hljs.highlightBlock(el);
      //    });
      //    //console.log(code);
      //}
      this.on("hboxchange", function(e) {
        return me.resizeContent();
      });
      this.bindKey("ALT-N", function() {
        return me.actionFile(`${me.name}-New`);
      });
      this.bindKey("ALT-O", function() {
        return me.actionFile(`${me.name}-Open`);
      });
      return this.bindKey("CTRL-S", function() {
        return me.actionFile(`${me.name}-Save`);
      });
    }

    reloadEditor() {
      if (this.currentToc === void 0) {
        this.editor.value("");
        return this.scheme.set("apptitle", this.name);
      }
      this.editor.value(this.currentToc.descFile.cache || "");
      return this.scheme.set("apptitle", `Booklet - ${this.currentToc.descFile.path}`);
    }

    saveContext() {
      if (!this.currentToc) {
        return;
      }
      return this.currentToc.descFile.cache = this.editor.value();
    }

    resizeContent() {
      var cheight, children, statusbar, titlebar, toolbar;
      children = ($(this.container)).children();
      titlebar = (($(this.scheme)).find(".afx-window-top"))[0];
      toolbar = children[1];
      statusbar = children[4];
      cheight = ($(this.scheme)).height() - ($(titlebar)).height() - ($(toolbar)).height() - ($(statusbar)).height() - 40;
      return ($(children[2])).css("height", cheight + "px");
    }

    menu() {
      var me, menu;
      me = this;
      menu = [
        {
          text: "__(File)",
          child: [
            {
              text: "__(New booklet)",
              dataid: `${this.name}-New`,
              shortcut: "A-N"
            },
            {
              text: "__(Open a booklet)",
              dataid: `${this.name}-Open`,
              shortcut: "A-O"
            },
            {
              text: "__(Save a booklet)",
              dataid: `${this.name}-Save`,
              shortcut: "C-S"
            }
          ],
          onmenuselect: function(e) {
            return me.actionFile(e.item.data.dataid);
          }
        }
      ];
      return menu;
    }

    actionFile(e) {
      var me;
      me = this;
      switch (e) {
        case `${this.name}-Open`:
          return this.openDialog("FileDiaLog", function(d, f) {
            return console.log(`${d}/${f}`.asFileHandler());
          }, __("Open file"), {
            mimes: me.meta().mimes
          });
        case `${this.name}-New`:
          return this.openDialog("FileDiaLog", function(d, f) {
            return me.newAt(`${d}/${f}`);
          }, __("Open file"), {
            mimes: ['dir'],
            file: {
              basename: __("BookName")
            }
          });
        case `${this.name}-Save`:
          return me.book.save(me);
      }
    }

    open(toc) {
      this.saveContext();
      this.currentToc = toc;
      this.reloadEditor();
      return this.displayToc();
    }

    newAt(folder) {
      this.tree.set("selectedItem", false);
      this.book = new Book(folder);
      this.book.treepath = this.book.path;
      this.currentToc = void 0;
      this.reloadEditor();
      return this.displayToc();
    }

    displayToc() {
      this.book.toc();
      return this.tree.set("data", this.book);
    }

  };

  Booklet.dependencies = ["mde/simplemde.min"];

  this.OS.register("Booklet", Booklet);

  BookletEntry = class BookletEntry {
    constructor() {
      this.name = "Untitled";
    }

    save() {}

    remove() {}

    toc() {}

    updateName() {
      var t;
      if (!this.descFile.dirty) {
        return this.name;
      }
      t = (new RegExp("^\s*#+(.*)[\n,$]", "g")).exec(this.descFile.cache);
      if (!(t && t.length === 2)) {
        return this.name;
      }
      return this.name = t[1].trim();
    }

  };

  BookletFolder = class BookletFolder extends BookletEntry {
    constructor(type, path1, hasMeta) {
      super();
      this.type = type;
      this.path = path1;
      this.hasMeta = hasMeta;
      this.nodes = [];
      if (this.hasMeta) {
        this.metaFile = `${this.path}/meta.json`.asFileHandler();
      }
      this.descFile = `${this.path}/${this.type}.md`.asFileHandler();
    }

    add(chap) {
      chap.parent = this;
      return this.nodes.push(chap);
    }

    size() {
      return this.nodes.length;
    }

    mkdir() {
      var me;
      me = this;
      console.log("making:" + me.path);
      return new Promise(function(r, e) {
        var dir;
        dir = me.path.asFileHandler();
        return dir.meta(function(d) {
          var bname;
          if (!d.error) {
            return r();
          }
          bname = dir.basename;
          dir = dir.parent().asFileHandler();
          return dir.mk(bname, function(result) {
            if (result.error) {
              e(__("Error when create directory: {0}", result.error));
            }
            return r();
          });
        });
      });
    }

    mkdirs() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        var i, j, len, list, ref, v;
        list = [];
        if (me.hasMeta) {
          ref = me.nodes;
          for (i = j = 0, len = ref.length; j < len; i = ++j) {
            v = ref[i];
            list[i] = v;
          }
        }
        console.log(list);
        return me.mkdir().then(function() {
          var fn;
          fn = function(l) {
            var el;
            if (l.length === 0) {
              return r();
            }
            el = (l.splice(0, 1))[0];
            return el.mkdirs().then(function() {
              return fn(l);
            });
          };
          return fn(list);
        });
      });
    }

    save(handle) {
      return this.mkdirs().then(function() {
        return handle.notify(__("All directories are created"));
      }).catch(function(msg) {
        return handle.error(msg);
      });
    }

    toc() {
      var j, len, ref, v;
      this.updateName();
      ref = this.nodes;
      for (j = 0, len = ref.length; j < len; j++) {
        v = ref[j];
        v.toc();
      }
      return this;
    }

    remove(apif) {}

  };

  Book = class Book extends BookletFolder {
    constructor(path) {
      super('book', path, true);
    }

  };

  BookletChapter = class BookletChapter extends BookletFolder {
    constructor(book) {
      var path;
      path = `${book.path}/c_${book.size()}`;
      super('chapter', path, true);
      book.add(this);
    }

  };

  BookletSection = class BookletSection extends BookletFolder {
    constructor(chapter) {
      var path;
      path = `${chapter.path}/s_${chapter.size()}`;
      super("section", path, false);
      chapter.add(this);
    }

  };

  BookletFile = class BookletFile extends BookletEntry {
    constructor(section) {
      super();
      this.section = section;
      this.section.add(this);
      this.path = `${this.section.path}/f_${this.section.size()}.md`;
      this.descFile = this.path.asFileHandler();
    }

    save(handle) {
      var j, len, me, ref, v;
      ref = this.sections;
      for (j = 0, len = ref.length; j < len; j++) {
        v = ref[j];
        v.save(this.descFile);
      }
      me = this;
      if (this.descFile.dirty) {
        return this.descFile.write("text/plain", function(r) {
          if (r.error) {
            handle.error(__("Fail to save file {0}: {1}", me.descFile.path, r.error));
          }
          this.descFile.dirty = false;
          return handle.notify(__("Book saved"));
        });
      }
    }

    toc() {
      this.updateName();
      return this;
    }

  };

}).call(this);
