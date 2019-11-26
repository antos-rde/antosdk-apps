class Booklet extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "Booklet", args
    
    main: () ->
        @initEditor()
        @resizeContent()
    
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
        
        @createBook()
    
    createBook: () ->
        book = new Book("home://test", "mybook")
        c1 = new BookletChapter(book, "Chapter one")
        c2 = new BookletChapter(book, "Chapter two")
        sec1 = new BookletSection(c1, "section 1 in c1")
        sec2 = new BookletSection(c1, "section 2 in c1")
        sec3 = new BookletSection(c2, "section 1 in c2")
        f1 = new BookletFile(sec1)
        f2 = new BookletFile(sec2)
        f3 = new BookletFile(sec3)
        f4 = new BookletFile(sec1)
        
        console.log(book.toc())

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
        console.log "Action file fired"
        ###
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
        ###
Booklet.dependencies = [ "mde/simplemde.min" ]

this.OS.register "Booklet", Booklet