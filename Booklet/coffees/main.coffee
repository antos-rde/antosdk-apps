class Booklet extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "Booklet", args
    
    main: () ->
        me = @
        @tree = @find "toc-ui"
        @currentToc = undefined
        @dirty = false
        @emux = false
        @on "treeselect", (e) ->
            return me.reloadEditor() if (me.currentToc is e) or (e is undefined) or (e.treepath is 0)
            e.treepath = e.path
            me.load(e).then ()->
                me.open e
            .catch (msg) ->
                e.loaded = true
                me.open e
                me.error __("Error when loading '{0}': {1}", e.name, msg)
        
        @initEditor()
        @resizeContent()
        @tree.contextmenuHandler = (e, m) ->
            menus = me.contextMenu()
            return unless menus
            m.set "items", menus
            m.set "onmenuselect", (evt) ->
                me[evt.item.data.dataid]()
            m.show e
        @editor.codemirror.on "change", () ->
            return if me.emux
            return unless me.currentToc
            me.currentToc.descFile.dirty = true
            me.dirty = true
    
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
        me = @
        return @error __("No entrie select") unless @currentToc
        fn = () ->
            me.currentToc = undefined
            me.displayToc()
            me.reloadEditor()
        @currentToc.remove().then () ->
            me.notify __("Entrie deleted")
            fn()
        .catch (e) ->
            me.error e
            fn()
    
    load: (entry) ->
        me = @
        return new Promise (r, e) ->
            return r() if entry.loaded
            entry.descFile.meta (d) ->
                return e d.error if d.error
                entry.descFile.read (data) ->
                    entry.descFile.cache = data
                    entry.loaded = true
                    entry.descFile.dirty = false
                    r()
    
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
        me = @
        me.openDialog "FileDiaLog", (d, n, p) ->
            p.asFileHandler().publish (r) ->
                return me.error __("Cannot export file for embedding to text") if r.error
                f r.result
        , __("Select a file"), { mimes: mimes }
    
    initEditor: ()->
        markarea = @find "markarea"
        @container = @find "mycontainer"
        @previewOn = false
        @editormux = false
        me = @
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
                    action: (e) ->
                        me.shareFile ["image/.*"], (path) ->
                            doc = me.editor.codemirror.getDoc()
                            doc.replaceSelection "![](#{me._api.handler.shared}/#{path})"
                },
                {
                    name:"Youtube",
                    className: "fa fa-youtube",
                    action: (e) ->
                        doc = me.editor.codemirror.getDoc()
                        doc.replaceSelection "[[youtube:]]"
                },
                {
                    name: "3d object",
                    className: "fa fa-file-image-o",
                    action: (e) ->
                        me.shareFile ["text/wavefront-obj"], (path) ->
                            doc = me.editor.codemirror.getDoc()
                            doc.replaceSelection "[[3DModel:#{me._api.handler.shared}/#{path}]]"
                },
                "|",
                {
                    name: __("Preview"),
                    className: "fa fa-eye no-disable",
                    action: (e) ->
                        SimpleMDE.togglePreview e
                        #/console.log me.select ".editor-preview editor-preview-active"
                        renderMathInElement me.find "mycontainer"
                }
            ]
        @on "hboxchange", (e) -> me.resizeContent()
        @bindKey "ALT-N", () -> me.actionFile "#{me.name}-New"
        @bindKey "ALT-O", () -> me.actionFile "#{me.name}-Open"
        @bindKey "CTRL-S", () -> me.actionFile "#{me.name}-Save"
        
    reloadEditor: () ->
        if @currentToc is undefined
            @editor.value ""
            return @scheme.set "apptitle", @name
        @editor.value @currentToc.descFile.cache || ""
        @scheme.set "apptitle", "Booklet - #{@currentToc.descFile.path}"
    
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
        me = @
        menu = [{
                text: "__(File)",
                child: [
                    { text: "__(New booklet)", dataid: "#{@name}-New", shortcut: "A-N" },
                    { text: "__(Open a booklet)", dataid: "#{@name}-Open", shortcut: "A-O" }
                    { text: "__(Save a booklet)", dataid: "#{@name}-Save", shortcut: "C-S" }
                ],
                onmenuselect: (e) -> me.actionFile e.item.data.dataid
            }]
        menu
    
    actionFile: (e) ->
        me = @
        switch e
            when "#{@name}-Open"
                @checkForDirty () ->
                    me.openDialog "FileDiaLog", ( d, f ) ->
                        me.book = new BookletBook(d)
                        me.book.read(d).then () ->
                            me.book.treepath = me.book.path
                            me.tree.set "selectedItem", undefined
                            me.displayToc()
                            me.notify __("Book loaded")
                        .catch (msg) ->
                            me.error __("Cannot load book: {0}", msg)
                    , __("Open file"), { mimes: ['dir'] }
             when "#{@name}-New"
                @openDialog "FileDiaLog", ( d, f ) ->
                    me.newAt "#{d}/#{f}"
                , __("Open file"), { mimes: ['dir'], file: { basename: __("BookName") }}
            when "#{@name}-Save"
                return unless me.book
                me.saveContext() if me.currentToc
                me.displayToc()
                me.book.save().then () ->
                    me.dirty = false
                    me.notify __("Book saved")
                .catch (e) ->
                    me.error __("Can't save the book : {0}", e)
    
    checkForDirty: (f) ->
        return f() unless @dirty
        @_gui.openDialog "YesNoDialog", (d) ->
            # console.log d
            if d
                f()
        , __("Continue ?"), { text: __("Book is unsaved, you want to continue ?") }
    
    open: (toc) ->
        me = @
        me.emux = true
        me.saveContext()
        me.currentToc  = toc
        me.reloadEditor()
        me.displayToc()
        me.emux = false
    
    openBook: (metaFile) ->
        
    
    newAt: (folder) ->
        @tree.set "selectedItem", false
        @book = new BookletBook(folder)
        @book.treepath = @book.path
        @currentToc = undefined
        @reloadEditor()
        @displayToc()
    
    displayToc: () ->
        @book.toc()
        @tree.set "data", @book
    
    cleanup: (evt) ->
        return unless @dirty
        me = @
        evt.preventDefault()
        @checkForDirty () ->
            me.dirty = false
            me.quit()
    
Booklet.dependencies = [ "mde/simplemde.min" ]

this.OS.register "Booklet", Booklet