class OnlyOffice extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "OnlyOffice", args
    
    main: () ->
        placeholder = @find "editor-area"
        @editor = new DocsAPI.DocEditor(placeholder, {
            "document": {
                "fileType": "docx",
                "key": "Khirz6zTPdfd7",
                "title": "Example Document Title.docx",
                "url": "https://file-examples-com.github.io/uploads/2017/02/file-sample_100kB.doc"
            },
            "documentType": "word"
        });

    cleanup: () ->
        @editor.destroyEditor() if @editor
        @editor = undefined

OnlyOffice.dependencies = [
    "http://192.168.1.91/web-apps/apps/api/documents/api.js"
]

this.OS.register "OnlyOffice", OnlyOffice