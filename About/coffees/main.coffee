class About extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "About", args
        
    main: () ->
        me = @
        @container = @find "container"
        "os://README.md".asFileHandler().read (txt) ->
            converter = new showdown.Converter()
            ($ me.container).html converter.makeHtml txt

About.singleton = true
About.dependencies = [ "showdown.min" ]
this.OS.register "About", About