class RemoteCamera extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "RemoteCamera", args
    
    main: () ->
        
        @decoder = new Worker("pkg://RemoteCamera/decoder.js".asFileHandle().getlink())
        
        @decoder.onmessage = (e) =>
            @paint e.data
            
        @decoder.postMessage {cmd:0x0 ,data: "pkg://libjpeg/jpg.js".asFileHandle().getlink()}
        
        @mute = false
        @player = @find "player"
        
        @qctl = @find "qctl"
        
        @fpsctl = @find "fpsctl"
        
        
        
        @cam_setting = {
            w: 640,
            h: 480,
            fps: 10,
            quality: 60
        }
        
        fps = []
        for i in [5..30] by 5
            fps.push {
                text: "#{i}",
                value: i
            }
        @fpsctl.data = fps
        @fpsctl.selected = @cam_setting.fps/5 -1
        
        @fpsctl.onlistselect = (e) =>
            return if @mute
            @cam_setting.fps = e.data.item.data.value
            @setCameraSetting()
        
        @qctl.value = @cam_setting.quality
        
        
        @resoctl = @find "resoctl"
        
        @resoctl.data = [
            {
                text: __("320x240"),
                mode: "qvga"
            },
            {
                text: __("480×320"),
                mode: "hvga"
            },
            {
                text: __("640x480"),
                selected: true,
                mode: "vga"
            },
            {
                text: __("800x600"),
                mode: "svga"
            },
            {
                text: __("1024x760"),
                mode: "hd"
            }
        ]
        @resoctl.onlistselect = (e) =>
            return if @mute
            switch e.data.item.data.mode
                when "qvga"
                    @cam_setting.w = 320
                    @cam_setting.h = 240
                when "vga"
                    @cam_setting.w = 640
                    @cam_setting.h = 480
                when "svga"
                    @cam_setting.w = 800
                    @cam_setting.h = 600
                when "hd"
                    @cam_setting.w = 1024
                    @cam_setting.h = 768
                when "hvga"
                    @cam_setting.w = 480
                    @cam_setting.h = 320
            @setCameraSetting()
        
        @qctl.onvaluechange = (e) =>
            return if @mute
            @cam_setting.quality = e.data
            @setCameraSetting()
        
        return @notify __("Antunnel service is not available") unless Antunnel.tunnel
        if not @setting.channel
            @requestChannel()
        else
            @openSession()
    
    requestChannel: () ->
        @openDialog "PromptDialog", {
            title: __("Enter camera channel"),
            label: __("Please enter camera channel name")
        }
        .then (v) =>
            @setting.channel = v
            return @openSession() unless @sub
            @sub.onclose = (e) =>
                @openSession()
            @sub.close()
    
    paint: (msg) ->
        # console.log msg
        data = new Uint8Array msg.pixels
        ctx = @player.getContext "2d", { alpha: false }
        @player.width = msg.w
        @player.height = msg.h
        imgData = ctx.createImageData  msg.w, msg.h
        imgData.data.set data
        ctx.putImageData imgData, 0, 0
    
    menu: () ->
        {
            text: "__(Option)",
            nodes: [
                { text: "__(Camera channel)" }
            ],
            onchildselect: (e) => @requestChannel()
        }
    
    openSession: () ->
        return unless Antunnel
        return unless @setting.channel
        @tunnel = Antunnel.tunnel
        @sub = new Antunnel.Subscriber(@setting.channel)
        @sub.onopen = () =>
            console.log("Subscribed to camera channel")
        
        @sub.onerror = (e) =>
            @error __("Error: {0}", new TextDecoder("utf-8").decode(e.data)), e
            #@sub = undefined
        @sub.onctrl = (e) =>
            @cam_setting.w = Antunnel.Msg.int_from(e.data,0)
            @cam_setting.h = Antunnel.Msg.int_from(e.data,2)
            @cam_setting.fps = e.data[4]
            @cam_setting.quality = e.data[5]
            @mute = true
            @qctl.value = @cam_setting.quality
            res = "#{@cam_setting.w}x#{@cam_setting.h}"
            switch res
                when "320x240"
                    @resoctl.selected = 0
                when "480x320"
                    @resoctl.selected = 1
                when "640x480"
                    @resoctl.selected = 2
                when "800x600"
                    @resoctl.selected = 3
                when "1024x768"
                    @resoctl.selected = 4
            @fpsctl.selected = @cam_setting.fps/5 -1
            @mute = false
            
        @sub.onmessage =  (e) =>
            return unless @decoder
            msg = {
                cmd: 0x1,
                data: e.data.buffer
            }
            @decoder.postMessage msg, [msg.data]
            
        @sub.onclose = () =>
            @sub = undefined
            @notify __("Unsubscribed to the camera service")
            return @quit()
        Antunnel.tunnel.subscribe @sub
    
    cleanup: () ->
        @sub.close() if @sub
        @decoder.terminate() if @decoder
    
    setCameraSetting: () ->
        return unless @sub
        arr = new Uint8Array(6)
        arr.set Antunnel.Msg.bytes_of(@cam_setting.w), 0
        arr.set Antunnel.Msg.bytes_of(@cam_setting.h), 2
        arr[4] = @cam_setting.fps
        arr[5] = @cam_setting.quality
        @sub.send Antunnel.Msg.CTRL, arr

RemoteCamera.singleton = true

this.OS.register "RemoteCamera", RemoteCamera