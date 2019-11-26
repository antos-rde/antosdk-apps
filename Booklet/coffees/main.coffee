class Booklet extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "Booklet", args
    
    main: () ->
        me = @
        @tree = @find "toc-ui"
        @currentToc = undefined
        @tree.set "ontreeselect", (e) ->
            me.saveContext()
            me.currfile = e.target.descFile
            me.reloadEditor()
            me.currentToc  = e
        @initEditor()
        @resizeContent()
        @tree.contextmenuHandler = (e, m) ->
            menus = me.contextMenu()
            return unless menus
            m.set "items", menus
            m.set "onmenuselect", (evt) ->
                me[evt.item.data.dataid]()
            m.show e
    
    newChapter: () ->
        console.log @currentToc
    
    contextMenu: () ->
        return undefined unless @currentToc
        switch @currentToc.type
            when "book"
                return [
                    { text: __("New chapter"), dataid: "newChapter" },
                    { text: __("Delete book"), dataid: "deleteBook" }
                ]
            when "chapter"
                return [
                    { text: __("New section"), dataid: "newSection" },
                    { text: __("Delete chapter"), dataid: "deleteChapter" }
                ]
            when "section"
                return [
                    { text: __("New file"), dataid: "newFile" },
                    { text: __("Delete section"), dataid: "deleteSection" }
                ]
        return undefined
    
    initEditor: ()->
        markarea = @find "markarea"
        @container = @find "mycontainer"
        @previewOn = false
        @currfile = "Untitled".asFileHandler()
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
        
    reloadEditor: () ->
        @editor.value @currfile.cache
        @scheme.set "apptitle", "Booklet - #{@currfile.basename}"
    
    saveContext: () ->
        @currfile.cache = @editor.value()

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
                ],
                onmenuselect: (e) -> me.actionFile e.item.data.dataid
            }]
        menu
    
    actionFile: (e) ->
        me = @
        switch e
            when "#{@name}-Open"
                @openDialog "FileDiaLog", ( d, f ) ->
                    me.open "#{d}/#{f}".asFileHandler()
                , __("Open file"), { mimes: me.meta().mimes }
             when "#{@name}-New"
                @openDialog "FileDiaLog", ( d, f ) ->
                    me.newAt d
                , __("Open file"), { mimes: ['dir'] }
    
    open: (file) ->
        
    
    newAt: (folder) ->
        @book = new Book(folder)
        @displayToc()
    
    displayToc: () ->
        toc = @book.toc()
        console.log toc
        @tree.set "data", toc
    
Booklet.dependencies = [ "mde/simplemde.min" ]

this.OS.register "Booklet", Booklet