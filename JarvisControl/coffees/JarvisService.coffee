class JarvisService extends OS.application.BaseService
    constructor: (args) ->
        super "JarvisService", args
        @text = __("Jarvis({0}%)", 0.toString())
        @iconclass = "fa fa-android"
        
        @nodes = [
            {text: __("Status"), id: 1},
            {text: __("Exit"), id: 2}
        ]
        @onchildselect = (e) => @action e
    
    init: () ->
        checklib = () =>
            if not Antunnel.tunnel
                @error __("The Antunnel service is not started, please start it first")
                @_gui.pushService("Antunnel/AntunnelService")
                .catch (e) =>
                    @error e.toString(), e
                @quit()
            else
                @tunnel = Antunnel.tunnel
                @sub = new Antunnel.Subscriber("notification")
                @sub.onopen = () =>
                    #@sub.send Antunnel.Msg.DATA, new TextEncoder("utf-8").encode("Hello")
                    console.log("Subscribed to notification channel")
                
                @sub.onerror = (e) =>
                    @error __("Error: {0}", new TextDecoder("utf-8").decode(e.data)), e
                    #@sub = undefined
        
                @sub.onmessage =  (e) =>
                    obj = JSON.parse(new TextDecoder("utf-8").decode(e.data)) if e.data
                    # update the battery
                    @text = __("Jarvis({0}%)", Math.round(obj.battery_percent).toString())
                    @update()
                
                @sub.onclose = () =>
                    @sub = undefined
                    @notify __("Unsubscribed to the notification service")
                    @quit()
                Antunnel.tunnel.subscribe @sub
        
        if not window.Antunnel
            console.log "require Antunnel"
            @_api.requires("pkg://Antunnel/main.js").then () =>
                checklib()
            .catch (e) =>
                @error __("Unable to load Antunnel: {0}",e.toString()), e
                @quit()
        else
            checklib()
        
    
    action: (e) ->
        switch e.data.item.data.id
            when 1
                @_gui.launch "JarvisControl", []
            when 2
                @quit()

    awake: () ->
    
    cleanup: () ->
        @sub.close() if @sub
        

this.OS.register "JarvisService", JarvisService