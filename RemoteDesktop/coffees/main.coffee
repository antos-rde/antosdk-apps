class ConnectionDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "ConnectionDialog", ConnectionDialog.scheme
        
    
    main: () ->
        super.main()
        @find("jq").value = 40
        @find("bt-ok").onbtclick = (e) =>
            return unless @handle
            data =
                wvnc: (@find "txtWVNC").value
                server: (@find "txtServer").value
                quality:(@find "jq").value
            @handle data
            @quit()
        
        @find("bt-cancel").onbtclick = (e) =>
            @quit()

ConnectionDialog.scheme = """
<afx-app-window width='350' height='220'>
    <afx-hbox>
        <div data-width="5"></div>
        <afx-vbox>
            <afx-label text="__(WVNC Websocket)" data-height="25" class="header" ></afx-label>
            <input data-height="25" data-id="txtWVNC" value="wss://app.iohub.dev/wbs/wvnc"></input>
            <afx-label text="__(VNC Server)" data-height="25" class="header" ></afx-label>
            <input data-height="25" data-id="txtServer" value="192.168.1.27:5900"></input>
            <div data-height="5"></div>
            <afx-label text="__(JPEG quality)" data-height="25" class="header" ></afx-label>
            <afx-slider data-id ="jq" data-height="25" ></afx-slider>
            <afx-hbox data-height = '30'>
                <div  style=' text-align:right;'>
                    <afx-button data-id = "bt-ok" text = "__(Connect)"></afx-button>
                    <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
                </div>
                <div data-width="5"></div>
            </afx-hbox>
        </afx-vbox>
        <div data-width="5"></div>
    </afx-hbox>
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
<afx-app-window width='350' height='150'>
    <afx-vbox>
        <afx-label text="__(Username)" data-height="25" class="header" ></afx-label>
        <input data-height="30" data-id="txtUser"></input>
        <afx-label text="__(Password)" data-height="25" class="header" ></afx-label>
        <input type="password" data-height="30" data-id="txtPass"></input>
        <afx-hbox data-height = '30'>
            <div  style=' text-align:right;'>
                <afx-button data-id = "bt-ok" text = "__(Ok)"></afx-button>
                <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
            </div>
            <div data-width="5"></div>
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
        @client = new WVNC { 
            element: @canvas
        }
        @client.onerror = (m) =>
            @error m
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
        
        @client.oncredential = () =>
            return new Promise (r,e) =>
                @openDialog new CredentialDialog, { title: __("User credential") }
                .then (d) ->
                    r(d.username, d.password)
        @on "resize", (e)=> @setScale()
        @on "focus", (e) => $(@canvas).focus()
        @client.init().then () => 
            @showConnectionDialog()
    
    setScale: () ->
        return unless @client and @client.resolution
        w = $(@container).width()
        h = $(@container).height()
        sx = w / @client.resolution.w
        sy = h / @client.resolution.h
        if sx > sy then @client.setScale sy else @client.setScale sx
    
    menu: () ->
        
        [
            {
                text: "__(Connection)",
                nodes: [
                    { text: "__(New Connection)", dataid: "#{@name}-new", },
                    { text: "__(Disconnect)", dataid: "#{@name}-close" }
                ],
                onchildselect: (e) => @actionConnection()
            }
        ]
    
    actionConnection: (e) ->
        @client.disconnect(false) if @client
        @showConnectionDialog()
    
    showConnectionDialog: () ->
        
        @openDialog new ConnectionDialog, { title: __("Connection")}
        .then (d) =>
            @client.ws = d.wvnc
            @client.connect d.server, d
    
    cleanup: () ->
        @client.disconnect(true) if @client

this.OS.register "RemoteDesktop", RemoteDesktop