(function() {
  var OnlyOffice;

  OnlyOffice = class OnlyOffice extends this.OS.application.BaseApplication {
    constructor(args) {
      super("OnlyOffice", args);
    }

    main() {
      var placeholder;
      placeholder = this.find("editor-area");
      return this.editor = new DocsAPI.DocEditor(placeholder, {
        "document": {
          "fileType": "docx",
          "key": "Khirz6zTPdfd7",
          "title": "Example Document Title.docx",
          "url": "https://file-examples-com.github.io/uploads/2017/02/file-sample_100kB.doc"
        },
        "documentType": "word"
      });
    }

    cleanup() {
      if (this.editor) {
        this.editor.destroyEditor();
      }
      return this.editor = void 0;
    }

  };

  OnlyOffice.dependencies = ["http://192.168.1.91/web-apps/apps/api/documents/api.js"];

  this.OS.register("OnlyOffice", OnlyOffice);

}).call(this);
