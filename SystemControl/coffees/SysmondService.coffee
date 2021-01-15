class SysmondService extends OS.application.BaseService
    constructor: (args) ->
        super "SysmondService", args
        @text = __("{0}%", 0.toString())
        @iconclass = "fa fa-android"
        @app = undefined
        #@nodes = [
        #    {text: __("Status"), id: 1},
        #    {text: __("Shutdown"), id: 3},
        #    {text: __("Reboot"), id: 4},
        #    {text: __("Exit service"), id: 2}
        #]
        @onmenuselect = (e) => @openApp()
    
    setting: () ->
        return @systemsetting.applications["SystemControl"]
    
    init: () ->
        checklib = () =>
            if not Antunnel.tunnel
                @error __("The Antunnel service is not started, please start it first")
                @_gui.pushService("Antunnel/AntunnelService")
                .catch (e) =>
                    @error e.toString(), e
                @quit()
            else
                return unless @setting().topic
                @tunnel = Antunnel.tunnel
                @sub = new Antunnel.Subscriber(@setting().topic)
                @sub.onopen = () =>
                    #@sub.send Antunnel.Msg.DATA, new TextEncoder("utf-8").encode("Hello")
                    console.log("Subscribed to notification channel")
                
                @sub.onerror = (e) =>
                    @error __("Error: {0}", new TextDecoder("utf-8").decode(e.data)), e
                    #@sub = undefined
        
                @sub.onmessage =  (e) =>
                    obj = JSON.parse(new TextDecoder("utf-8").decode(e.data)) if e.data
                    # update the battery
                    @text = __("{0}%", Math.round(obj.battery_percent).toString())
                    @app.feed obj if @app
                    @update()
                
                @sub.onclose = () =>
                    @sub = undefined
                    @notify __("Unsubscribed to the notification service")
                    @quit()
                Antunnel.tunnel.subscribe @sub
        
        if not @setting().topic
            console.log "Open dialog"
            @_gui.openDialog("PromptDialog", { 
                title: __("Enter topic name"),
                label: __("Please enter topic name")
            })
            .then (v) =>
                @setting().topic = v
                checklib()
        else
            checklib()
        
    
    openApp: () ->
        return if @app
        @_gui.launch "SystemControl", []
    
    
    execute: (cmd) ->
        #return unless @tunnel
        #sub = new Antunnel.Subscriber("jarvis_control")
        #sub.onopen = () =>
        #    console.log("Subscribed to jarvis_control channel. Send the command")
        #    sub.send Antunnel.Msg.DATA, new TextEncoder("utf-8").encode(cmd)
        #    sub.close()
        
        #sub.onerror = (e) =>
        #    @error __("Error: {0}", new TextDecoder("utf-8").decode(e.data)), e
            #@sub = undefined
        
        #sub.onclose = () =>
        #    @notify __("Unsubscribed to the jarvis_control service")
        #@tunnel.subscribe sub

    awake: () ->
    
    cleanup: () ->
        @sub.close() if @sub
        

this.OS.register "SysmondService", SysmondService