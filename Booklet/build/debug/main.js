(function() {
  var Book, Booklet, BookletChapter, BookletEntry, BookletFile, BookletFolder, BookletSection;

  Booklet = class Booklet extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("Booklet", args);
    }

    main() {
      this.initEditor();
      return this.resizeContent();
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
      this.bindKey("ALT-O", function() {
        return me.actionFile(`${me.name}-Open`);
      });
      return this.createBook();
    }

    createBook() {
      var book, c1, c2, f1, f2, f3, f4, sec1, sec2, sec3;
      book = new Book("home://test");
      c1 = new BookletChapter(book, "Chapter one");
      c2 = new BookletChapter(book, "Chapter two");
      sec1 = new BookletSection(c1, "section 1 in c1");
      sec2 = new BookletSection(c1, "section 2 in c1");
      sec3 = new BookletSection(c2, "section 1 in c2");
      f1 = new BookletFile(sec1);
      f2 = new BookletFile(sec2);
      f3 = new BookletFile(sec3);
      f4 = new BookletFile(sec1);
      return console.log(book.toc());
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
      return console.log("Action file fired");
    }

  };

  /*
  me = @
  switch e
      when "#{@name}-Open"
          @openDialog "FileDiaLog", ( d, f ) ->
              me.open "#{d}/#{f}".asFileHandler()
          , __("Open file")

       when "#{@name}-New"
          @currfile = "Untitled".asFileHandler()
          @currfile.cache = ""
          @editor.value("")
  */
  Booklet.dependencies = ["mde/simplemde.min"];

  this.OS.register("Booklet", Booklet);

  BookletEntry = class BookletEntry {
    constructor(name1) {
      this.name = name1;
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

  };

  BookletFolder = class BookletFolder extends BookletEntry {
    constructor(name) {
      super(name);
    }

    save() {}

    remove() {}

    rename(newname) {}

  };

  Book = class Book extends BookletFolder {
    constructor(path, name) {
      super(name);
      this.path = path;
      this.chapters = [];
      this.metaFile = `${this.path}/meta.json`.asFileHandler();
    }

    addChapter(chap) {
      chap.book = this;
      return this.chapters.push(chap);
    }

    size() {
      return this.chapters.length;
    }

    toc() {
      var v;
      return {
        name: this.name,
        path: this.path,
        meta: this.metaFile.path,
        entries: (function() {
          var i, len, ref, results;
          ref = this.chapters;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            v = ref[i];
            results.push(v.toc());
          }
          return results;
        }).call(this)
      };
    }

  };

  BookletChapter = class BookletChapter extends BookletFolder {
    constructor(book1, name) {
      super(name);
      this.book = book1;
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
        name: this.name,
        path: this.path,
        meta: this.metaFile.path,
        description: this.descFile.path,
        entries: (function() {
          var i, len, ref, results;
          ref = this.sections;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            v = ref[i];
            results.push(v.toc());
          }
          return results;
        }).call(this)
      };
    }

  };

  BookletSection = class BookletSection extends BookletFolder {
    constructor(chapter, name) {
      super(name);
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
        name: this.name,
        path: this.path,
        description: this.descFile.path,
        entries: (function() {
          var i, len, ref, results;
          ref = this.files;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            v = ref[i];
            results.push(v.toc());
          }
          return results;
        }).call(this)
      };
    }

    size() {
      return this.files.length;
    }

  };

  BookletFile = class BookletFile extends BookletEntry {
    constructor(section) {
      super("");
      this.section = section;
      this.section.addFile(this);
      this.path = `${this.section.path}/${this.section.size()}.md`;
      this.handle = this.path.asFileHandler();
    }

    getTitle() {}

    toc() {
      return {
        name: this.name,
        path: this.path
      };
    }

  };

}).call(this);
