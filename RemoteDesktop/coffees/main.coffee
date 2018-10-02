class ConnectionDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "ConnectionDialog", {
            tags: [
                { tag: "afx-label", att: 'text="__(VNC server)" data-height="23" class="header"' },
                { tag: "input", att: 'data-height="30"' },
                { tag: "afx-label", att: 'text="__(Bits per pixel)" data-height="23" class="header"' },
                { tag: "afx-list-view", att: 'dropdown="true" data-height="30"' },
                { tag: "afx-label", att: 'text="__(Compression)" data-height="23" class="header"' },
                { tag: "afx-list-view", att: 'dropdown="true" data-height="30"' },
                { tag: "afx-label", att: 'text="__(JPEG quality)" data-height="23" class="header"' },
                { tag: "afx-slider", att: 'max="100" data-height="30"' },
                { tag: "div", att: ' data-height="5"' }
            ],
            width: 350,
            height: 280, 
            resizable: false,
            buttons: [
                { 
                    label: "__(Connect)",
                    onclick: (d) ->
                        return unless d.handler
                        data =
                            server: (d.find "content1").value
                            bbp: ((d.find "content3").get "selected").value,
                            flag: ((d.find "content5").get "selected").value,
                            quality:((d.find "content7").get "value")
                        d.handler data
                        d.quit()
                },
                { label: "__(Cancel)", onclick: (d) -> d.quit() }
            ],
            filldata: (d) -> 
                (d.find "content1").value = "/opt/www/vnc.conf"
                (d.find "content3").set "items", [
                    { text: "16 bits", value: 16 }, 
                    { text: "32 bits", value: 32, selected:true}]
                (d.find "content5").set "items", [
                    {text: "No compression", value:0}, 
                    {text: "JPEG", value:1},
                    {text: "zLib", value:2},
                    {text: "JPEG & zLib", value:3, selected:true}
                ]
                (d.find "content7").set "value", 40
        }

class CredentialDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "ConnectionDialog", {
            tags: [
                { tag: "afx-label", att: 'text="__(User name)" data-height="23" class="header"' },
                { tag: "input", att: 'data-height="30"' },
                { tag: "afx-label", att: 'text="__(Password)" data-height="23" class="header"' },
                { tag: "input", att: 'data-height="30" type="password"' },
                { tag: "div", att: ' data-height="5"' }
            ],
            width: 350,
            height: 150, 
            resizable: false,
            buttons: [
                { 
                    label: "__(Ok)",
                    onclick: (d) ->
                        return d.quit() unless d.handler
                        data =
                            username: (d.find "content1").value
                            password: (d.find "content3").value
                        d.handler data
                        d.quit()
                },
                { label: "__(Cancel)", onclick: (d) -> d.quit() }
            ],
            filldata: (d) -> 
                (d.find "content1").value = "demo"
                (d.find "content3").value = "demo"
        }

class RemoteDesktop extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "RemoteDesktop", args
        
    main: () ->
        me = @
        @canvas = @find "screen"
        @container = @find "container"
        @client = new WVNC { 
            element: me.canvas,
            ws: 'wss://lxsang.me/wvnc',
            worker: "#{me._api.handler.get}/#{me.meta().path}/decoder.js"   
        }
        @client.onerror = (m) ->
            me.error m
            me.showConnectionDialog()
        @client.onresize = ()->
            me.setScale()
        @client.onpassword = ()->
            return new Promise (r,e)->
                me.openDialog "PromptDialog", (d) ->
                    r(d) 
                , __("VNC password"), { label: __("VNC password"), value: "demopass", type: "password" }
        
        @client.oncredential = () ->
            return new Promise (r,e) ->
                me.openDialog new CredentialDialog, (d) ->
                    r(d.username, d.password)
                , __("User credential")
        @on "resize", (e)-> me.setScale()
        @on "focus", (e) -> $(me.canvas).focus()
        @client.init().then () -> 
            me.showConnectionDialog()
    
    setScale: () ->
        return unless @client and @client.resolution
        w = $(@container).width()
        h = $(@container).height()
        sx = w / @client.resolution.w
        sy = h / @client.resolution.h
        if sx > sy then @client.setScale sy else @client.setScale sx
    
    menu: () ->
        me = @
        [
            {
                text: "__(Connection)",
                child: [
                    { text: "__(New Connection)", dataid: "#{@name}-new", },
                    { text: "__(Disconnect)", dataid: "#{@name}-close" }
                ],
                onmenuselect: (e) -> me.actionConnection()
            }
        ]
    
    actionConnection: (e) ->
        @client.disconnect() if @client
        @showConnectionDialog()
    
    showConnectionDialog: () ->
        me = @
        @openDialog new ConnectionDialog, (d) ->
            me.client.connect d.server, d
        , __("Connection")
    
    cleanup: () ->
        @client.disconnect() if @client
this.OS.register "RemoteDesktop", RemoteDesktop