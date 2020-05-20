class About extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "About", args
        
    main: () ->
        me = @
        @container = @find "container"
        path = "os://README.md"
        path.asFileHandle()
            .read()
            .then (txt) ->
                converter = new showdown.Converter()
                ($ me.container).html converter.makeHtml txt
            .catch () =>
                @notify __("Unable to read: {0}", path)
        
        @find("btnclose").set "onbtclick", () =>
            @quit()

About.singleton = true
About.dependencies = [ "os://scripts/showdown.min.js" ]
this.OS.register "About", About