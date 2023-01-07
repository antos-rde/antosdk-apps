class ConnectionDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "ConnectionDialog", ConnectionDialog.scheme
        
    
    main: () ->
        super.main()
        @find("bbp").data = [
            { text: "16 bits", value: 16, selected: true },
            { text: "32 bits", value: 32 }
        ]
        @find("jq").value = 40
        @find("bt-ok").onbtclick = (e) =>
            return unless @handle
            data =
                wvnc: (@find "txtWVNC").value
                server: (@find "txtServer").value
                bbp: (@find "bbp").selectedItem.data.value,
                quality:(@find "jq").value
            @handle data
            @quit()
        
        @find("bt-cancel").onbtclick = (e) =>
            @quit()

ConnectionDialog.scheme = """
<afx-app-window width='350' height='320'>
    <afx-vbox padding="5">
        <afx-input label="__(WVNC Websocket)" data-height="50" data-id="txtWVNC" value="wss://app.iohub.dev/wbs/wvnc"></afx-input>
        <afx-input label="__(VNC Server)" data-height="50" data-id="txtServer" value="192.168.1.27:5900"></afx-input>
        <div data-height="5"></div>
        <afx-label text="__(Bits per pixel)" data-height="30" class="header" ></afx-label>
        <afx-list-view dropdown = "true" data-id ="bbp" data-height="35" ></afx-list-view>
        <div data-height="5"></div>
        <afx-label text="__(JPEG quality)" data-height="30" class="header" ></afx-label>
        <afx-slider data-id ="jq" data-height="30" ></afx-slider>
        <div></div>
        <afx-hbox data-height = '35'>
            <div  style=' text-align:right;'>
                <afx-button data-id = "bt-ok" text = "__(Connect)"></afx-button>
                <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>

"""

class CredentialDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "CredentialDialog", CredentialDialog.scheme
    
    main: () ->
        @find("bt-ok").onbtclick = () =>
            return @quit() unless @handle
            data =
                username: (@find "txtUser").value
                password: (@find "txtPass").value
            @handle data
            @quit()
        @find("bt-cancel").onbtclick = () =>
            @quit()

CredentialDialog.scheme = """
<afx-app-window width='350' height='170'>
    <afx-vbox padding="5">
        <afx-input label="__(Username)" data-height="55" data-id="txtUser"></afx-input>
        <afx-input label="__(Password)" data-height="55" type="password" data-id="txtPass"></afx-input>
        <div></div>
        <afx-hbox data-height = '35'>
            <div  style=' text-align:right;'>
                <afx-button data-id = "bt-ok" text = "__(Ok)"></afx-button>
                <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
            </div>
        </afx-hbox>
    </afx-vbox>
</afx-app-window>
"""

class RemoteDesktop extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "RemoteDesktop", args
        
    main: () ->
        @canvas = @find "screen"
        @container = @find "container"
        @zoom = @find "zoom"
        @btreset = @find "btreset"
        @zoom.max = 200
        @zoom.value = 100
        @zoom.onvaluechange = (e) => @setScale()
        @switch = @find "capture_mouse"
        @switch.onswchange = (e) =>
            @client.mouseCapture = @switch.swon
        @btreset.onbtclick = (e) =>
            w = $(@container).width()
            h = $(@container).height()
            sx = w / @client.resolution.w
            sy = h / @client.resolution.h
            if sx > sy
                @zoom.value = sy*100
            else
                @zoom.value = sx*100
            @setScale()
        @client = new WVNC { 
            element: @canvas
        }
        @bindKey "CTRL-SHIFT-V", (e) =>
            @pasteText()
        #@client.onerror = (m) =>
        #    @error m.toString()
        #    @showConnectionDialog()
        @client.ondisconnect = () =>
            @showConnectionDialog()
        @client.onresize = ()=>
            @setScale()
        @client.onpassword = ()=>
            return new Promise (r,e)=>
                @openDialog "PromptDialog", {
                    title: __("VNC password"), 
                    label: __("VNC password"),
                    value: "password",
                    type: "password"
                }
                .then (d) ->
                    r(d) 
        @client.oncopy = (text) =>
            @_api.setClipboard text

        @client.oncredential = () =>
            return new Promise (r,e) =>
                @openDialog new CredentialDialog, { title: __("User credential") }
                .then (d) ->
                    r(d.username, d.password)
        # @on "resize", (e)=> @setScale()
        @on "focus", (e) => $(@canvas).focus()
        @client.init().then () => 
            @showConnectionDialog()
    
    pasteText: () ->
        return unless @client
        cb = (text) =>
            return unless text and text isnt ""
            @client.sendTextAsClipboard  text
            
        @_api.getClipboard()
            .then (text) =>
                cb(text)
            .catch (e) =>
                @error __("Unable to paste"), e
                #ask for user to enter the text manually
                @openDialog("TextDialog", { title: "Paste text"})
                    .then (text) =>
                        cb(text)
                    .catch (err) => @error err.toString(), err

    setScale: () ->
        console.log "scale changed"
        return unless @client and @client.resolution
        @client.setScale @zoom.value / 100.0
        @container.scrollLeft = 0
        @container.scrollTop = 0
    
    menu: () ->
        
        [
            {
                text: "__(Connection)",
                nodes: [
                    { text: "__(New Connection)", dataid: "#{@name}-new", },
                    { text: "__(Disconnect)", dataid: "#{@name}-close" }
                ],
                onchildselect: (e) =>
                    @client.disconnect(false) if @client
            }
        ]
    
    showConnectionDialog: () ->
        return unless @client
        @openDialog new ConnectionDialog, { title: __("Connection")}
        .then (d) =>
            @client.ws = d.wvnc
            @client.connect d.server, d
    
    cleanup: () ->
        @client.disconnect(true) if @client
        @client = undefined

this.OS.register "RemoteDesktop", RemoteDesktop