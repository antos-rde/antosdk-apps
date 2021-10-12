class AntunnelService extends OS.application.BaseService
    constructor: (args) ->
        super "AntunnelService", args
        @text = __("Tunnel")
        @iconclass = "fa fa-close"
        @is_connect = false
        @nodes = [
            {text: __("Connect"), id: 1},
            {text: __("Disconnect"), id: 2},
            {text: __("Enter uri"), id: 3},
            {text: __("Exit"), id: 4}
        ]
        @onchildselect = (e) => @action e
    
    init: () ->
        # @start() if @systemsetting.system.tunnel_uri
        @watch 1500, () =>
            new_status = false
            new_status = true if Antunnel.tunnel isnt undefined
            
            return unless new_status isnt @is_connect
            @is_connect = new_status
            @iconclass = "fa fa-circle"
            @iconclass = "fa fa-close" unless @is_connect
            @update()
        OS.onexit "cleanupAntunnel", () =>
            return new Promise (resolve, reject) =>
                Antunnel.tunnel.close() if Antunnel.tunnel
                @quit()
                resolve(true)
        
    
    action: (e) ->
        ask = () =>
            @_gui.openDialog("PromptDialog", {
                title: __("Tunnel uri"),
                label: __("Please enter tunnel uri"),
                value: "wss://localhost/tunnel"
            })
            .then (uri) =>
                return unless uri and uri isnt ""
                @systemsetting.system.tunnel_uri = uri
                @start()
                
        switch e.data.item.data.id
            when 1
                return if @is_connect
                if @systemsetting.system.tunnel_uri
                    @start()
                else
                    ask()
            when 2
                Antunnel.tunnel.close() if Antunnel.tunnel
            when 3
                Antunnel.tunnel.close() if Antunnel.tunnel
                ask()
            when 4
                Antunnel.tunnel.close() if Antunnel.tunnel
                @quit()
    
    start: () ->
        return unless @systemsetting.system.tunnel_uri
        return if Antunnel.tunnel
        Antunnel.init(@systemsetting.system.tunnel_uri).then (t) =>
            @notify __("Tunnel now connected to the server at: {0}", @systemsetting.system.tunnel_uri)
        .catch (e) =>
            Antunnel.tunnel.close() if Antunnel.tunnel
            @error __("Unable to connect to the tunnel: {0}", e.toString()), e

    awake: () ->
        

this.OS.register "AntunnelService", AntunnelService