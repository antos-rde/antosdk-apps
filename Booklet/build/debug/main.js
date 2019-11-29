(function() {
  var Booklet, BookletBook, BookletChapter, BookletEntry, BookletFile, BookletFolder, BookletSection, NS;

  Booklet = class Booklet extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("Booklet", args);
    }

    main() {
      var me;
      me = this;
      this.tree = this.find("toc-ui");
      this.currentToc = void 0;
      this.dirty = false;
      this.emux = false;
      this.on("treeselect", function(e) {
        if ((me.currentToc === e) || (e === void 0) || (e.treepath === 0)) {
          return me.reloadEditor();
        }
        e.treepath = e.path;
        return me.load(e).then(function() {
          return me.open(e);
        }).catch(function(msg) {
          e.loaded = true;
          me.open(e);
          return me.error(__("Error when loading '{0}': {1}", e.name, msg));
        });
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
        if (me.emux) {
          return;
        }
        if (!me.currentToc) {
          return;
        }
        me.currentToc.descFile.dirty = true;
        return me.dirty = true;
      });
    }

    newChapter() {
      var ch;
      if (!(this.currentToc && this.currentToc.type === "Book")) {
        return this.error(__("No book selected"));
      }
      ch = new BookletChapter(this.book);
      this.displayToc();
      return ch.treepath = ch.path;
    }

    newSection() {
      var sec;
      if (!(this.currentToc && this.currentToc.type === "Chapter")) {
        return this.error(__("No chapter selected"));
      }
      sec = new BookletSection(this.currentToc);
      this.displayToc();
      return sec.treepath = sec.path;
    }

    newFile() {
      var file;
      if (!(this.currentToc && this.currentToc.type === "Section")) {
        return this.error(__("No section selected"));
      }
      file = new BookletFile(this.currentToc);
      this.displayToc();
      return file.treepath = file.path;
    }

    delete() {
      var fn, me;
      me = this;
      if (!this.currentToc) {
        return this.error(__("No entrie select"));
      }
      fn = function() {
        me.currentToc = void 0;
        me.displayToc();
        return me.reloadEditor();
      };
      return this.currentToc.remove().then(function() {
        me.notify(__("Entrie deleted"));
        return fn();
      }).catch(function(e) {
        me.error(e);
        return fn();
      });
    }

    load(entry) {
      var me;
      me = this;
      return new Promise(function(r, e) {
        if (entry.loaded) {
          return r();
        }
        return entry.descFile.meta(function(d) {
          if (d.error) {
            return e(d.error);
          }
          return entry.descFile.read(function(data) {
            entry.descFile.cache = data;
            entry.loaded = true;
            entry.descFile.dirty = false;
            return r();
          });
        });
      });
    }

    contextMenu() {
      if (!this.currentToc) {
        return void 0;
      }
      switch (this.currentToc.type) {
        case "Book":
          return [
            {
              text: __("New chapter"),
              dataid: "newChapter"
            },
            {
              text: __("Delete book"),
              dataid: "delete"
            }
          ];
        case "Chapter":
          return [
            {
              text: __("New section"),
              dataid: "newSection"
            },
            {
              text: __("Delete chapter"),
              dataid: "delete"
            }
          ];
        case "Section":
          return [
            {
              text: __("New file"),
              dataid: "newFile"
            },
            {
              text: __("Delete section"),
              dataid: "delete"
            }
          ];
        case "File":
          return [
            {
              text: __("Delete file"),
              dataid: "delete"
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
          return this.checkForDirty(function() {
            return me.openDialog("FileDiaLog", function(d, f) {
              me.book = new BookletBook(d);
              return me.book.read(d).then(function() {
                me.book.treepath = me.book.path;
                me.tree.set("selectedItem", void 0);
                me.displayToc();
                return me.notify(__("Book loaded"));
              }).catch(function(msg) {
                return me.error(__("Cannot load book: {0}", msg));
              });
            }, __("Open file"), {
              mimes: ['dir']
            });
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
          if (!me.book) {
            return;
          }
          if (me.currentToc) {
            me.saveContext();
          }
          me.displayToc();
          return me.book.save().then(function() {
            me.dirty = false;
            return me.notify(__("Book saved"));
          }).catch(function(e) {
            return me.error(__("Can't save the book : {0}", e));
          });
      }
    }

    checkForDirty(f) {
      if (!this.dirty) {
        return f();
      }
      return this._gui.openDialog("YesNoDialog", function(d) {
        console.log(d);
        if (d) {
          return f();
        }
      }, __("Continue ?"), {
        text: __("Book is unsaved, you want to continue ?")
      });
    }

    open(toc) {
      var me;
      me = this;
      me.emux = true;
      me.saveContext();
      me.currentToc = toc;
      me.reloadEditor();
      me.displayToc();
      return me.emux = false;
    }

    openBook(metaFile) {}

    newAt(folder) {
      this.tree.set("selectedItem", false);
      this.book = new BookletBook(folder);
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
    constructor(name) {
      this.name = name;
      this.loaded = true;
    }

    save() {}

    remove() {}

    toc() {}

    updateName() {
      var t;
      if (!this.descFile.dirty) {
        return this.name;
      }
      t = (new RegExp("^\s*#+(.*)\n", "g")).exec(this.descFile.cache);
      if (!(t && t.length === 2)) {
        return this.name;
      }
      if (this.hasMeta && this.metaFile) {
        this.metaFile.dirty = true;
      }
      if (this.parent && this.parent.hasMeta && this.parent.metaFile) {
        this.parent.metaFile.dirty = true;
      }
      return this.name = t[1].trim();
    }

    remove() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        var f;
        f = me.path.asFileHandler();
        return f.meta(function(d) {
          if (d.error) {
            if (!me.parent) {
              return r();
            }
            return me.parent.removeChild(me).then(function() {
              return r();
            }).catch(function(msg) {
              return e(msg);
            });
          } else {
            return f.remove(function(ret) {
              if (ret.error) {
                return e(ret.error);
              }
              if (!me.parent) {
                return r();
              }
              return me.parent.removeChild(me).then(function() {
                return r();
              }).catch(function(msg) {
                return e(msg);
              });
            });
          }
        });
      });
    }

  };

  BookletFolder = class BookletFolder extends BookletEntry {
    constructor(type, path1, hasMeta) {
      super("Untitle");
      this.type = type;
      this.path = path1;
      this.hasMeta = hasMeta;
      this.init();
    }

    init() {
      this.cnt = 0;
      this.nodes = [];
      if (this.hasMeta) {
        this.metaFile = `${this.path}/meta.json`.asFileHandler();
      }
      return this.descFile = `${this.path}/INTRO.md`.asFileHandler();
    }

    add(chap) {
      chap.parent = this;
      this.nodes.push(chap);
      if (this.hasMeta && this.metaFile) {
        this.metaFile.dirty = true;
      }
      if (chap.metaFile && chap.hasMeta) {
        chap.metaFile.dirty = true;
      }
      return this.cnt = this.cnt + 1;
    }

    removeChild(child) {
      var me;
      me = this;
      //v.treepath = v.path for v in @nodes if @nodes
      return new Promise(function(r, e) {
        me.nodes.splice(me.nodes.indexOf(child), 1);
        if (!(me.hasMeta && me.metaFile)) {
          //if me.nodes.includes child
          return r();
        }
        me.metaFile.dirty = true;
        return me.updateMeta().then(function() {
          return r();
        }).catch(function(msg) {
          return e(msg);
        });
      });
    }

    read(folderPath) {
      var me;
      me = this;
      return new Promise(function(r, e) {
        me.path = folderPath;
        me.init();
        me.loaded = false;
        return me.metaFile.meta(function(d) {
          if (d.error) {
            return e(d.error);
          }
          return me.metaFile.read(function(data) {
            var fn, i, j, len, list, ref, v;
            // load all child
            me.name = data.name;
            list = [];
            ref = data.entries;
            for (i = j = 0, len = ref.length; j < len; i = ++j) {
              v = ref[i];
              list[i] = v;
            }
            fn = function(l) {
              var el, obj;
              if (l.length === 0) {
                me.cnt = data.cnt;
                return r();
              }
              el = (l.splice(0, 1))[0];
              console.log("create", el.type);
              obj = new NS[el.type](me);
              obj.name = el.name;
              return obj.read(el.path).then(function() {
                return fn(l);
              }).catch(function(msg) {
                return fn(l);
              });
            };
            return fn(list);
          }, "json");
        });
      });
    }

    size() {
      return this.nodes.length;
    }

    mkdir() {
      var me;
      me = this;
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
        if (me.type !== 'Section') {
          ref = me.nodes;
          for (i = j = 0, len = ref.length; j < len; i = ++j) {
            v = ref[i];
            list[i] = v;
          }
        }
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
            }).catch(function(msg) {
              return e(msg);
            });
          };
          return fn(list);
        }).catch(function(msg) {
          return e(msg);
        });
      });
    }

    updateMeta() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        var data, entries, i, j, len, ref, v;
        if (!me.metaFile.dirty) {
          return r();
        }
        entries = [];
        ref = me.nodes;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          v = ref[i];
          entries[i] = {
            name: v.name,
            path: v.path,
            type: v.type
          };
        }
        data = {
          name: me.name,
          entries: entries,
          cnt: me.cnt,
          meta: me.hasMeta
        };
        me.metaFile.cache = data;
        return me.metaFile.write("object", function(d) {
          if (d.error) {
            return e(d.error);
          }
          me.metaFile.dirty = false;
          console.log("saved " + me.metaFile.path);
          return r();
        });
      });
    }

    update() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        return me.updateMeta().then(function() {
          if (!me.descFile.dirty) {
            return r();
          }
          return me.descFile.write("text/plain", function(d) {
            if (d.error) {
              return e(d.error);
            }
            me.descFile.dirty = false;
            console.log("saved " + me.descFile.path);
            return r();
          });
        }).catch(function(msg) {
          return e(msg);
        });
      });
    }

    updateAll() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        var i, j, len, list, ref, v;
        list = [];
        ref = me.nodes;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          v = ref[i];
          list[i] = v;
        }
        return me.update().then(function() {
          var fn;
          fn = function(l) {
            var el;
            if (l.length === 0) {
              return r();
            }
            el = (l.splice(0, 1))[0];
            return el.updateAll().then(function() {
              return fn(l);
            }).catch(function(msg) {
              return e(msg);
            });
          };
          return fn(list);
        }).catch(function(msg) {
          return e(msg);
        });
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

  };

  BookletBook = class BookletBook extends BookletFolder {
    constructor(path) {
      super('Book', path, true);
    }

    save() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        return me.mkdirs().then(function() {
          return me.updateAll().then(function() {
            return r();
          }).catch(function(msg) {
            return e(msg);
          });
        }).catch(function(msg) {
          return e(msg);
        });
      });
    }

  };

  BookletChapter = class BookletChapter extends BookletFolder {
    constructor(book) {
      var path;
      path = `${book.path}/c_${book.cnt}`;
      super('Chapter', path, true);
      book.add(this);
    }

  };

  BookletSection = class BookletSection extends BookletFolder {
    constructor(chapter) {
      var path;
      path = `${chapter.path}/s_${chapter.cnt}`;
      super("Section", path, true);
      chapter.add(this);
    }

  };

  BookletFile = class BookletFile extends BookletEntry {
    constructor(section) {
      super("Untitle file");
      this.section = section;
      this.hasMeta = false;
      this.type = "File";
      this.path = `${this.section.path}/f_${this.section.cnt}.md`;
      this.descFile = this.path.asFileHandler();
      this.section.add(this);
    }

    updateAll() {
      var me;
      me = this;
      return new Promise(function(r, e) {
        if (!me.descFile.dirty) {
          return r();
        }
        return me.descFile.write("text/plain", function(d) {
          if (d.error) {
            return e(d.error);
          }
          me.descFile.dirty = false;
          console.log("saved" + me.descFile.path);
          return r();
        });
      });
    }

    read(p) {
      var me;
      me = this;
      return new Promise(function(r, e) {
        me.loaded = false;
        me.treepath = p;
        return r();
      });
    }

    toc() {
      this.updateName();
      return this;
    }

  };

  NS = {
    Book: BookletBook,
    Chapter: BookletChapter,
    Section: BookletSection,
    File: BookletFile
  };

}).call(this);
