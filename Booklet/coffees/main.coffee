class Booklet extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "Booklet", args
    
    main: () ->
        
        @tree = @find "toc-ui"
        @currentToc = undefined
        @dirty = false
        @emux = false
        @on "treeselect", (evt) =>
            e = evt.data.item.data
            return @reloadEditor() if (@currentToc is e) or (e is undefined) or (e.treepath is 0)
            e.treepath = e.path
            @load(e).then ()=>
                @open e
            .catch (msg) =>
                e.loaded = true
                @open e
                @error __("Error when loading '{0}': {1}", e.text, msg.toString()), msg
        
        @tree.ondragndrop = (e) =>
            @dndhandle(e)
        
        @initEditor()
        @resizeContent()
        @tree.contextmenuHandle = (e, m) =>
            menus = @contextMenu()
            return unless menus
            m.items = menus
            m.onmenuselect = (evt) =>
                @[evt.data.item.data.dataid]()
            m.show e
        @editor.codemirror.on "change", () =>
            return if @emux
            return unless @currentToc
            @currentToc.descFile.dirty = true
            @dirty = true
    
    newChapter: () ->
        return @error __("No book selected") unless @currentToc and @currentToc.type is "Book"
        ch = new BookletChapter(@book)
        @displayToc()
        ch.treepath = ch.path
    
    newSection: () ->
        return @error __("No chapter selected") unless @currentToc and @currentToc.type is "Chapter"
        sec = new BookletSection(@currentToc)
        @displayToc()
        sec.treepath = sec.path
    
    newFile: () ->
        return @error __("No section selected") unless @currentToc and @currentToc.type is "Section"
        file = new BookletFile(@currentToc)
        @displayToc()
        file.treepath = file.path
    
    delete: () ->
        
        return @error __("No entrie select") unless @currentToc
        fn = () =>
            @currentToc = undefined
            @displayToc()
            @reloadEditor()
        @currentToc.remove().then () =>
            @notify __("Entrie deleted")
            fn()
        .catch (e) =>
            @error e.toString(), e
            fn()
    
    goUp: () ->
        return unless @currentToc and @currentToc.type isnt "Book"
        @currentToc.parent.up @currentToc
        @displayToc()
    
    goDown: () ->
        return unless @currentToc and @currentToc.type isnt "Book"
        @currentToc.parent.down @currentToc
        @displayToc()
    
    load: (entry) ->
        
        return new Promise (r, e) =>
            return r() if entry.loaded
            entry.descFile.meta().then (d) =>
                entry.descFile.read().then (data) =>
                    entry.descFile.cache = data
                    entry.loaded = true
                    entry.descFile.dirty = false
                    r()
                .catch (msg) -> e __e msg
            .catch (msg) -> e __e msg
                    
    
    dndhandle: (e) ->
        return unless e and e.data
        from = e.data.from[0].data
        to = e.data.to.data
        return unless from and to
        return if from.type is "Book" or from.type is "Chapter"
        return if from.parent is to.parent or from.parent is to
        if to.type is from.type
            to = to.parent
        
        if to.type is from.parent.type
            from.parent.removeChild(from).then () =>
                to.add from
                @displayToc()
    
    upload: () ->
        return unless @currentToc and @currentToc.type isnt "File"
        @currentToc.path.asFileHandle().upload()
        .then () =>
            @notify __("File uploaded")
        .catch (e) =>
            @error __("Unable to upload file {0}", e.toString()), e
    
    contextMenu: () ->
        return undefined unless @currentToc
        switch @currentToc.type
            when "Book"
                return [
                    { text: __("New chapter"), dataid: "newChapter" },
                    { text: __("Delete book"), dataid: "delete" },
                    { text: __("Upload media"), dataid: "upload" }
                ]
            when "Chapter"
                return [
                    { text: __("New section"), dataid: "newSection" },
                    { text: __("Delete chapter"), dataid: "delete" },
                    { text: __("Go up"), dataid: "goUp" },
                    { text: __("Go down"), dataid: "goDown" },
                    { text: __("Upload media"), dataid: "upload" }
                ]
            when "Section"
                return [
                    { text: __("New file"), dataid: "newFile" },
                    { text: __("Delete section"), dataid: "delete" },
                    { text: __("Go up"), dataid: "goUp" },
                    { text: __("Go down"), dataid: "goDown" },
                    { text: __("Upload media"), dataid: "upload" }
                ]
            when "File"
                return [
                    { text: __("Delete file"), dataid: "delete" },
                    { text: __("Go up"), dataid: "goUp" },
                    { text: __("Go down"), dataid: "goDown" }
                ]
        return undefined
    
    shareFile: (mimes,f) ->
        
        @openDialog "FileDialog", { title: __("Select a file"), mimes: mimes }
        .then (d) =>
            d.file.path.asFileHandle().publish().then (r) ->
                f r.result
            .catch (msg) =>
                return @error __("Cannot export file for embedding to text"), msg
        .catch (msg) =>
                return @error msg.toString(), msg
                
    initEditor: ()->
        markarea = @find "markarea"
        @container = @find "mycontainer"
        @previewOn = false
        @editormux = false
        
        @editor = new EasyMDE
            element: markarea
            autoDownloadFontAwesome: false
            autofocus: true
            tabSize: 4
            indentWithTabs: true
            toolbar: [
                "bold", "italic", "heading", "|", "quote", "code",
                "unordered-list", "ordered-list", "|", "link",
                "image", "table", "horizontal-rule",
                {
                    name: "shared image",
                    className: "fa fa-share-square",
                    action: (e) =>
                        @shareFile ["image/.*"], (path) =>
                            doc = @editor.codemirror.getDoc()
                            doc.replaceSelection "![](#{@_api.handler.shared}/#{path})"
                },
                {
                    name: "local image",
                    className: "fa fa-file-image-o",
                    action: (e) =>
                        return unless @book
                        @openDialog "FileDialog", {
                            title: __("Select image file"),
                            mimes: ["image/.*"],
                            root: @book.path
                        }
                        .then (d) =>
                            path = d.file.path.replace @book.path, ""
                            doc = @editor.codemirror.getDoc()
                            #selectedText =  @editor.codemirror.getSelection() 
                            doc.replaceSelection "[[@book:image:#{path}]]"
                        .catch (e) =>
                            @error e.toString(), e
                },
                {
                    name:"Youtube",
                    className: "fa fa-youtube",
                    action: (e) =>
                        doc = @editor.codemirror.getDoc()
                        selectedText =  @editor.codemirror.getSelection() || ""
                        doc.replaceSelection "[[youtube:#{selectedText}]]"
                },
                {
                    name: "3d object",
                    className: "fa fa-cube",
                    action: (e) =>
                        return unless @book
                        @openDialog "FileDialog", {
                            title: __("Select 3d model"),
                            mimes: ["text/wavefront-obj", "model/gltf-binary"],
                            root: @book.path
                        }
                        .then (d) =>
                            path = d.file.path.replace @book.path, ""
                            doc = @editor.codemirror.getDoc()
                            doc.replaceSelection "[[@book:3dmodel:#{path}]]"
                        .catch (e) =>
                            @error e.toString(), e
                },
                "|",
                {
                    name: __("Preview"),
                    className: "fa fa-eye no-disable",
                    action: (e) =>
                        EasyMDE.togglePreview e
                        #/console.log @select ".editor-preview editor-preview-active"
                        renderMathInElement @find "mycontainer"
                        @renderLocalElement()
                }
            ],
            previewRender: (plainText, preview) =>
                if @book
                    plainText = plainText.replace /\[\[@book:image:([^\]]*)\]\]/g, (a, b) =>
                        return "![](#{@_api.handle.get}/#{@book.path}/#{b})"
                html = @editor.markdown plainText
                
                preview.innerHTML = html
        
        @on "resize", (e) => @resizeContent()
        @bindKey "ALT-N", () => @actionFile "#{@name}-New"
        @bindKey "ALT-O", () => @actionFile "#{@name}-Open"
        @bindKey "CTRL-S", () => @actionFile "#{@name}-Save"
        
    reloadEditor: () ->
        if @currentToc is undefined
            @editor.value ""
            return @scheme.apptitle = @name
        @editor.value @currentToc.descFile.cache || ""
        @scheme.apptitle = "Booklet - #{@currentToc.descFile.path}"
    
    saveContext: () ->
        return unless @currentToc
        @currentToc.descFile.cache = @editor.value()

    resizeContent: () ->
        children = ($ ".EasyMDEContainer", @container).children()
        titlebar = (($ @scheme).find ".afx-window-top")[0]
        toolbar = children[0]
        statusbar = children[3]
        cheight = ($ @scheme).height() - ($ titlebar).height() - ($ toolbar).height() - ($ statusbar).height() - 40
        ($ children[1]).css("height", cheight + "px")


    menu: () ->
        
        menu = [{
                text: "__(File)",
                nodes: [
                    { text: "__(New booklet)", dataid: "#{@name}-New", shortcut: "A-N" },
                    { text: "__(Open a booklet)", dataid: "#{@name}-Open", shortcut: "A-O" }
                    { text: "__(Save a booklet)", dataid: "#{@name}-Save", shortcut: "C-S" }
                ],
                onchildselect: (e) => @actionFile e.data.item.data.dataid
            }]
        menu
    
    actionFile: (e) ->
        
        switch e
            when "#{@name}-Open"
                @checkForDirty () =>
                    @openDialog "FileDialog", { title:__("Open book"), mimes: ['dir'] }
                    .then (d) =>
                        @book = new BookletBook(d.file.path)
                        @book.read(d.file.path).then () =>
                            @book.treepath = @book.path
                            @tree.selectedItem = undefined
                            @displayToc()
                            @notify __("Book loaded")
                        .catch (msg) =>
                            @error __("Cannot load book: {0}", msg.toString()), msg
                    .catch (msg) => @error msg.toString(), msg
                   
             when "#{@name}-New"
                @openDialog "FileDialog", { title: __("New book at"), mimes: ['dir'], file: { basename: __("BookName") }}
                .then (d) =>
                    @newAt "#{d.file.path}/#{d.name}"
                .catch (msg) => @error msg.toString(), msg
            when "#{@name}-Save"
                return unless @book
                @saveContext() if @currentToc
                @displayToc()
                @book.save().then () =>
                    @dirty = false
                    @notify __("Book saved")
                .catch (e) =>
                    @error __("Can't save the book : {0}", e.toString()), e
    
    checkForDirty: (f) ->
        return f() unless @dirty
        @ask {title: __("Continue ?"), text: __("Book is unsaved, you want to continue ?") }
        .then (d) =>
            # console.log d
            if d
                f()
        
    
    open: (toc) ->
        @emux = true
        @saveContext()
        @currentToc  = toc
        @reloadEditor()
        @displayToc()
        @emux = false

    
    newAt: (folder) ->
        @tree.selectedItem = undefined
        @book = new BookletBook(folder)
        @book.treepath = @book.path
        @currentToc = undefined
        @reloadEditor()
        @displayToc()
    
    displayToc: () ->
        @book.toc()
        @tree.data = @book
        @tree.expandAll()
    
    cleanup: (evt) ->
        return unless @dirty
        evt.preventDefault()
        @checkForDirty () =>
            @dirty = false
            @quit()
    
    renderLocalElement: () ->
        
    
Booklet.dependencies = [
    "pkg://SimpleMDE/main.js",
    "pkg://SimpleMDE/main.css",
    "pkg://Katex/main.js",
    "pkg://Katex/main.css"
]

this.OS.register "Booklet", Booklet