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
                    
    
    contextMenu: () ->
        return undefined unless @currentToc
        switch @currentToc.type
            when "Book"
                return [
                    { text: __("New chapter"), dataid: "newChapter" },
                    { text: __("Delete book"), dataid: "delete" }
                ]
            when "Chapter"
                return [
                    { text: __("New section"), dataid: "newSection" },
                    { text: __("Delete chapter"), dataid: "delete" }
                ]
            when "Section"
                return [
                    { text: __("New file"), dataid: "newFile" },
                    { text: __("Delete section"), dataid: "delete" }
                ]
            when "File"
                return [
                    { text: __("Delete file"), dataid: "delete" }
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
        
        @editor = new SimpleMDE
            element: markarea
            autofocus: true
            tabSize: 4
            indentWithTabs: true
            toolbar: [
                "bold", "italic", "heading", "|", "quote", "code",
                "unordered-list", "ordered-list", "|", "link",
                "image", "table", "horizontal-rule",
                {
                    name: "image",
                    className: "fa fa-file-image-o",
                    action: (e) =>
                        @shareFile ["image/.*"], (path) =>
                            doc = @editor.codemirror.getDoc()
                            doc.replaceSelection "![](#{@_api.handler.shared}/#{path})"
                },
                {
                    name:"Youtube",
                    className: "fa fa-youtube",
                    action: (e) =>
                        doc = @editor.codemirror.getDoc()
                        doc.replaceSelection "[[youtube:]]"
                },
                {
                    name: "3d object",
                    className: "fa fa-file-image-o",
                    action: (e) =>
                        @shareFile ["text/wavefront-obj"], (path) =>
                            doc = @editor.codemirror.getDoc()
                            doc.replaceSelection "[[3DModel:#{@_api.handler.shared}/#{path}]]"
                },
                "|",
                {
                    name: __("Preview"),
                    className: "fa fa-eye no-disable",
                    action: (e) ->
                        SimpleMDE.togglePreview e
                        #/console.log @select ".editor-preview editor-preview-active"
                        renderMathInElement @find "mycontainer"
                }
            ]
        @on "hboxchange", (e) => @resizeContent()
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
        children = ($ @container).children()
        titlebar = (($ @scheme).find ".afx-window-top")[0]
        toolbar = children[1]
        statusbar = children[4]
        cheight = ($ @scheme).height() - ($ titlebar).height() - ($ toolbar).height() - ($ statusbar).height() - 40
        ($ children[2]).css("height", cheight + "px")


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
                    @openDialog "FileDialog", { title:__("Open file"), mimes: ['dir'] }
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
                @openDialog "FileDialog", { title: __("Open file"), mimes: ['dir'], file: { basename: __("BookName") }}
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
    
Booklet.dependencies = [
    "os://scripts/mde/simplemde.min.js",
     "os://scripts/mde/simplemde.min.css" 
]

this.OS.register "Booklet", Booklet