class Booklet extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "Booklet", args
    
    main: () ->
        me = @
        @tree = @find "toc-ui"
        @currentToc = undefined
        @emux = false
        @on "treeselect", (e) ->
            return me.reloadEditor() if (me.currentToc is e) or (e is undefined) or (e.treepath is 0)
            me.open e
        
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
    
    newChapter: () ->
        return @error __("No book selected") unless @currentToc and @currentToc.type is "book"
        ch = new BookletChapter(@book)
        @displayToc()
        ch.treepath = ch.path
    
    newSection: () ->
        return @error __("No chapter selected") unless @currentToc and @currentToc.type is "chapter"
        sec = new BookletSection(@currentToc)
        @displayToc()
        sec.treepath = sec.path
    
    newFile: () ->
        return @error __("No section selected") unless @currentToc and @currentToc.type is "section"
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
    
    contextMenu: () ->
        return undefined unless @currentToc
        switch @currentToc.type
            when "book"
                return [
                    { text: __("New chapter"), dataid: "newChapter" },
                    { text: __("Delete book"), dataid: "delete" }
                ]
            when "chapter"
                return [
                    { text: __("New section"), dataid: "newSection" },
                    { text: __("Delete chapter"), dataid: "delete" }
                ]
            when "section"
                return [
                    { text: __("New file"), dataid: "newFile" },
                    { text: __("Delete section"), dataid: "delete" }
                ]
            when "file"
                return [
                    { text: __("Delete file"), dataid: "delete" }
                ]
        return undefined
    
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
                "image", "table", "horizontal-rule", "|",
                {
                    name: "preview",
                    className: "fa fa-eye no-disable",
                    action: (e) ->
                        me.previewOn = !me.previewOn
                        SimpleMDE.togglePreview e
                        #if(self.previewOn) toggle the highlight
                        #{
                        #    var container = self._scheme.find(self,"Text")
                        #                        .$element.getElementsByClassName("editor-preview");
                        #    if(container.length == 0) return;
                        #    var codes = container[0].getElementsByTagName('pre');
                        #    codes.forEach(function(el){
                        #        hljs.highlightBlock(el);
                        #    });
                        #    //console.log(code);
                        #}
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
                @openDialog "FileDiaLog", ( d, f ) ->
                    console.log "#{d}/#{f}".asFileHandler()
                , __("Open file"), { mimes: me.meta().mimes }
             when "#{@name}-New"
                @openDialog "FileDiaLog", ( d, f ) ->
                    me.newAt "#{d}/#{f}"
                , __("Open file"), { mimes: ['dir'], file: { basename: __("BookName") }}
            when "#{@name}-Save"
                return unless me.book
                me.saveContext() if me.currentToc
                me.displayToc()
                me.book.save().then () ->
                    me.notify __("Book saved")
                .catch (e) ->
                    me.error __("Can't save the book : {0}", e)
    
    open: (toc) ->
        @emux = true
        @saveContext()
        @currentToc  = toc
        @reloadEditor()
        @displayToc()
        @emux = false
    
    openBook: (metaFile) ->
        
    
    newAt: (folder) ->
        @tree.set "selectedItem", false
        @book = new Book(folder)
        @book.treepath = @book.path
        @currentToc = undefined
        @reloadEditor()
        @displayToc()
    
    displayToc: () ->
        @book.toc()
        @tree.set "data", @book
    
Booklet.dependencies = [ "mde/simplemde.min" ]

this.OS.register "Booklet", Booklet