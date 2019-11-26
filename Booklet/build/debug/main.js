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
      this.tree.set("ontreeselect", function(e) {
        me.saveContext();
        me.currfile = e.target.descFile;
        me.reloadEditor();
        return me.currentToc = e;
      });
      this.initEditor();
      this.resizeContent();
      return this.tree.contextmenuHandler = function(e, m) {
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
    }

    newChapter() {
      return console.log(this.currentToc);
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
      this.currfile = "Untitled".asFileHandler();
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
      return this.bindKey("ALT-O", function() {
        return me.actionFile(`${me.name}-Open`);
      });
    }

    reloadEditor() {
      this.editor.value(this.currfile.cache);
      return this.scheme.set("apptitle", `Booklet - ${this.currfile.basename}`);
    }

    saveContext() {
      return this.currfile.cache = this.editor.value();
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
            return me.open(`${d}/${f}`.asFileHandler());
          }, __("Open file"), {
            mimes: me.meta().mimes
          });
        case `${this.name}-New`:
          return this.openDialog("FileDiaLog", function(d, f) {
            return me.newAt(d);
          }, __("Open file"), {
            mimes: ['dir']
          });
      }
    }

    open(file) {}

    newAt(folder) {
      this.book = new Book(folder);
      return this.displayToc();
    }

    displayToc() {
      var toc;
      toc = this.book.toc();
      console.log(toc);
      return this.tree.set("data", toc);
    }

  };

  Booklet.dependencies = ["mde/simplemde.min"];

  this.OS.register("Booklet", Booklet);

  BookletEntry = class BookletEntry {
    constructor() {
      this.markAsDirty();
    }

    save() {}

    remove() {}

    markAsDirty() {
      return this.dirty = true;
    }

    markAsClean() {
      return this.dirty = false;
    }

    toc() {}

    titleFromFile(file) {
      var content, title;
      content = file.cache;
      title = (new RegExp("^#+(.*)\n", "g")).exec(content);
      if (!(title && title.length === 2)) {
        return "Untitled";
      }
      return title[1].trim();
    }

  };

  BookletFolder = class BookletFolder extends BookletEntry {
    constructor() {
      super();
    }

    save(apif) {}

    remove(apif) {}

    rename(newname) {}

  };

  Book = class Book extends BookletFolder {
    constructor(path) {
      super();
      this.path = path;
      this.chapters = [];
      this.metaFile = `${this.path}/meta.json`.asFileHandler();
      this.descFile = `${this.path}/book.md`.asFileHandler();
    }

    addChapter(chap) {
      chap.book = this;
      return this.chapters.push(chap);
    }

    size() {
      return this.chapters.length;
    }

    save(handle) {
      var i, len, me, ref, v;
      ref = this.chapters;
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        v.save(handle);
      }
      me = this;
      if (this.dirty) {
        if (this.descFile.dirty) {
          this.descFile.write("text/plain", function(r) {
            if (r.error) {
              return handle.error(__("Fail to save file {0}: {1}", me.descFile.path, r.error));
            }
          });
        }
        this.metaFile.cache = this.toc();
        this.metaFile.dirty = true;
        return this.metaFile.write("object", function(r) {
          return handle.error(__("Fail to write book meta: {0}", r.error));
          me.markAsClean;
          return handle.notify(__("Book saved"));
        });
      }
    }

    toc() {
      var v;
      return {
        target: this,
        name: this.titleFromFile(this.descFile),
        nodes: (function() {
          var i, len, ref, results;
          ref = this.chapters;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            v = ref[i];
            results.push(v.toc());
          }
          return results;
        }).call(this),
        type: 'book'
      };
    }

  };

  BookletChapter = class BookletChapter extends BookletFolder {
    constructor(book) {
      super();
      this.book = book;
      this.book.addChapter(this);
      this.sections = [];
      this.path = `${this.book.path}/${this.book.size()}`;
      this.metaFile = `${this.path}/meta.json`.asFileHandler();
      this.descFile = `${this.path}/chapter.md`.asFileHandler();
    }

    addSection(sec) {
      sec.chapter = this;
      return this.sections.push(sec);
    }

    size() {
      return this.sections.length;
    }

    toc() {
      var v;
      return {
        target: this,
        name: this.titleFromFile(this.descFile),
        nodes: (function() {
          var i, len, ref, results;
          ref = this.sections;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            v = ref[i];
            results.push(v.toc());
          }
          return results;
        }).call(this),
        type: 'chapter'
      };
    }

    save(handle) {
      var i, len, me, ref, v;
      ref = this.sections;
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        v.save(handle);
      }
      me = this;
      if (this.dirty) {
        if (this.descFile.dirty) {
          this.descFile.write("text/plain", function(r) {
            if (r.error) {
              return handle.error(__("Fail to save file {0}: {1}", me.descFile.path, r.error));
            }
          });
        }
        this.metaFile.cache = this.toc();
        this.metaFile.dirty = true;
        return this.metaFile.write("object", function(r) {
          return handle.error(__("Fail to write book meta: {0}", r.error));
          me.markAsClean;
          return handle.notify(__("chapter saved"));
        });
      }
    }

  };

  BookletSection = class BookletSection extends BookletFolder {
    constructor(chapter) {
      super();
      this.chapter = chapter;
      this.chapter.addSection(this);
      this.path = `${this.chapter.path}/${this.chapter.size()}`;
      this.files = [];
      this.descFile = `${this.path}/section.md`.asFileHandler();
    }

    addFile(file) {
      file.section = this;
      return this.files.push(file);
    }

    toc() {
      var v;
      return {
        target: this,
        name: this.titleFromFile(this.descFile),
        nodes: (function() {
          var i, len, ref, results;
          ref = this.files;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            v = ref[i];
            results.push(v.toc());
          }
          return results;
        }).call(this),
        type: 'section'
      };
    }

    save() {
      var i, len, me, ref, v;
      ref = this.sections;
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        v.save(handle);
      }
      me = this;
      if (this.dirty) {
        if (this.descFile.dirty) {
          return this.descFile.write("text/plain", function(r) {
            if (r.error) {
              handle.error(__("Fail to save file {0}: {1}", me.descFile.path, r.error));
            }
            me.markAsClean;
            return handle.notify(__("section saved"));
          });
        }
      }
    }

    size() {
      return this.files.length;
    }

  };

  BookletFile = class BookletFile extends BookletEntry {
    constructor(section) {
      super();
      this.section = section;
      this.section.addFile(this);
      this.path = `${this.section.path}/${this.section.size()}.md`;
      this.descFile = this.path.asFileHandler();
    }

    getTitle() {
      return console.log("hello");
    }

    save(handle) {
      var i, len, me, ref, v;
      ref = this.sections;
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        v.save(this.descFile);
      }
      me = this;
      if (this.dirty) {
        if (this.descFile.dirty) {
          return this.descFile.write("text/plain", function(r) {
            if (r.error) {
              handle.error(__("Fail to save file {0}: {1}", me.descFile.path, r.error));
            }
            me.markAsClean;
            return handle.notify(__("Book saved"));
          });
        }
      }
    }

    toc() {
      return {
        target: this,
        name: this.titleFromFile(this.handle),
        type: 'file'
      };
    }

  };

}).call(this);
