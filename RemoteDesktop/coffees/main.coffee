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
                (d.find "content1").value = "176.180.44.70:9999"
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

class RemoteDesktop extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "RemoteDesktop", args
        
    main: () ->
        me = @
        @canvas = @find "screen"
        @client = new WVNC {
            element: me.canvas,
            ws: 'wss://localhost:9192/wvnc',
            worker: "#{me._api.handler.get}/#{me.meta().path}/decoder.js"   
        }
        @client.onpassword = ()->
            return new Promise (r,e)->
                r("demopass")
        @client.init().then () ->
            me.showConnectionDialog()
    
    showConnectionDialog: () ->
        me = @
        @openDialog new ConnectionDialog, (d) ->
            me.client.connect d.server, d
        , __("Connection")
this.OS.register "RemoteDesktop", RemoteDesktop