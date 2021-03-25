class About extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "About", args
        
    main: () ->
        me = @
        @container = @find "container"
        path = "https://raw.githubusercontent.com/lxsang/antos/master/README.md"
        path.asFileHandle()
            .read()
            .then (txt) ->
                converter = new showdown.Converter()
                ($ me.container).html converter.makeHtml txt
            .catch () =>
                @notify __("Unable to read: {0}", path)
        
        @find("btnclose").onbtclick = () =>
            @quit()

About.singleton = true
About.dependencies = [ "os://scripts/showdown.min.js" ]
this.OS.register "About", About