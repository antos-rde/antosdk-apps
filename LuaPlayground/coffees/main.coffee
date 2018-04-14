class LuaPlayground extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "LuaPlayground", args
        
    main: () ->
        me = @
        @datarea = @find "editorea"
        @output = @find "output"
        @.editor = ace.edit @datarea
        @.editor.setOptions {
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            fontSize: "10pt"
        }
        @editor.getSession().setUseWrapMode true
        @editor.session.setMode "ace/mode/lua"
        @editor.setTheme "ace/theme/monokai"
        @on "vboxchange", () ->
            me.editor.resize()
        
        @socket = null
    
    menu: () ->
        me = @
        menu = [{
                text: "__(Code)",
                child: [
                    { text: "__(Run)", dataid: "#{@name}-Run", shortcut: "C-R" }
                ],
                onmenuselect: (e) -> me.run()
            }]
        menu
    
    log: (t, m) ->
        return $(@output).empty() if t is "clean"
        p = ($ "<p>").attr("class", t.toLowerCase())[0]
        $(p).html "#{t}: #{m.__()}"
        ($ @output).append p
        ($ @output).scrollTop @output.scrollHeight
        
    run: () ->
        me = @
        value = @editor.getValue().trim()
        return unless value and value isnt ""
        proto = if window.location.protocol is "https:" then "wss://" else "ws://"
        @socket = new WebSocket proto + @_api.HOST + "/lua-api/os/apigateway?ws=1"
        @socket.onopen = () ->
            #send data to server
            me.socket.send( JSON.stringify { code: value } )

        @socket.onmessage =  (e) -> me.log "INFO", e.data if  e.data
        @socket.onclose = () ->
            me.socket = null
            console.log "socket closed"
            
    cleanup: (e)->
        @socket.close() if @socket
        
this.OS.dependencies = ["ace/ace"]
this.OS.register "LuaPlayground", LuaPlayground
