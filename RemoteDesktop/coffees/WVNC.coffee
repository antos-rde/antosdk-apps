class WVNC
    constructor: (args) ->
        @socket = undefined
        @ws = undefined
        @canvas = undefined
        worker = "pkg://RemoteDesktop/decoder_asm.js".asFileHandle().getlink()
        @scale = 1.0
        @ws = args.ws if args.ws
        @canvas = args.element
        @canvas = document.getElementById @canvas if typeof @canvas is 'string'
        @decoder = new Worker worker
        @enableEvent = false
        @pingto = false
        me = @
        @mouseMask = 0
        @decoder.onmessage = (e) ->
            me.process e.data
    init: () ->
        me = @
        return new Promise (r, e) ->
            return e('Canvas is not set') if not me.canvas
            # fix keyboard event problem
            $(me.canvas).attr 'tabindex', '1'
            $(me.canvas).on "focus", () => 
                me.resetModifierKeys()
            me.initInputEvent()
            r()

    initInputEvent: () ->
        me = @
        return unless @canvas
        getMousePos = (e) ->
            rect = me.canvas.getBoundingClientRect()
            pos=
                x:  Math.floor((e.clientX - rect.left) / me.scale)
                y: Math.floor((e.clientY - rect.top) / me.scale)
            return pos

        sendMouseLocation = (e) ->
            return unless me.enableEvent
            p = getMousePos e
            me.sendPointEvent p.x, p.y, me.mouseMask

        return unless me.canvas
        me.canvas.oncontextmenu = (e) ->
            e.preventDefault()
            return false

        me.canvas.onmousemove = (e) ->
            sendMouseLocation e

        me.canvas.onmousedown = (e) ->
            state = 1 << e.button
            me.mouseMask = me.mouseMask | state
            sendMouseLocation e
            #e.preventDefault()

        me.canvas.onmouseup = (e) ->
            state = 1 << e.button
            me.mouseMask = me.mouseMask & (~state)
            sendMouseLocation e
            #e.preventDefault()

        me.canvas.onkeydown = me.canvas.onkeyup = (e) ->
            # get the key code
            keycode = e.keyCode
            #console.log e
            switch keycode
                when 8  then code = 0xFF08 #back space
                when 9  then code =  0xFF09 # tab ? 0xff89
                when 13 then code = 0xFF0D # return
                when 27 then code = 0xFF1B # esc
                when 46 then code = 0xFFFF # delete to verify
                when 38 then code = 0xFF52 # up
                when 40 then code = 0xFF54 # down
                when 37 then code = 0xFF51 # left
                when 39 then code = 0xFF53 # right
                when 91 then code = 0xFFE7 # meta left
                when 93 then code = 0xFFE8 # meta right
                when 16 then code = 0xFFE1 # shift left
                when 17 then code = 0xFFE3 # ctrl left
                when 18 then code = 0xFFE9 # alt left
                when 20 then code = 0xFFE5 # capslock
                when 113 then code = 0xFFBF # f2
                when 112 then code = 0xFFBE # f1
                when 114 then code = 0xFFC0 # f3
                when 115 then code = 0xFFC1 # f4
                when 116 then code = 0xFFC2 # f5
                when 117 then code = 0xFFC3 # f6
                when 118 then code = 0xFFC4 # f7
                when 119 then code = 0xFFC5 # f8
                when 120 then code = 0xFFC6 # f9
                when 121 then code =  0xFFC7 # f10
                when 122 then code = 0xFFC8 # f11
                when 123 then code = 0xFFC9 # f12
                else
                    code = e.key.charCodeAt(0) #if not e.ctrlKey and not e.altKey
            #if ((keycode > 47 and keycode < 58) or (keycode > 64 and keycode < 91)  or (keycode > 95 and keycode < 112)  or (keycode > 185 and keycode < 193) or (keycode > 218 && keycode < 223))
            #    code = e.key.charCodeAt(0)
            #else 
            #    code = keycode
            e.preventDefault()
            return unless code
            if e.type is "keydown"
                me.sendKeyEvent code, 1
            else if e.type is "keyup"
                me.sendKeyEvent code, 0

        # mouse wheel event
        @canvas.addEventListener 'wheel', (e) ->
            return unless me.enableEvent
            #if (e.deltaY < 0) # up
            p = getMousePos e
            e.preventDefault()
            if e.deltaY < 0
                me.sendPointEvent p.x, p.y, 8
                me.sendPointEvent p.x, p.y, 0
                return
            me.sendPointEvent p.x, p.y, 16
            me.sendPointEvent p.x, p.y, 0
        # paste event
        @canvas.onpaste = (e) ->
            return unless me.enableEvent
            pastedText = undefined
            if window.clipboardData and window.clipboardData.getData  #IE
                pastedText = window.clipboardData.getData 'Text'
            else if e.clipboardData and e.clipboardData.getData
                pastedText = e.clipboardData.getData 'text/plain'
            return false unless pastedText
            e.preventDefault()
            me.sendTextAsClipboard pastedText
        # global event
        fn = (e) =>
            @disconnect(true)
            
        window.addEventListener "unload", fn
        window.addEventListener "beforeunload", fn

    initCanvas: (w, h , d) ->
        me = @
        @canvas.width = w
        @canvas.height = h
        @resolution =
            w: w,
            h: h,
        @decoder.postMessage @resolution
        #me.canvas.style.cursor = "none"
        @setScale @scale

    process: (msg) ->
        if not @socket
            @socket.send(@buildCommand 0x04, 1)
            return
        data = new Uint8Array msg.pixels
        ctx = @canvas.getContext "2d", { alpha: false }
        imgData = ctx.createImageData  msg.w, msg.h
        imgData.data.set data
        ctx.putImageData imgData,msg.x, msg.y
        # tell the server that we are ready
        @socket.send(@buildCommand 0x04, 1)
        

    setScale: (n) ->
        @scale = n
        return unless @canvas
        @canvas.style.transformOrigin = '0 0'
        @canvas.style.transform = 'scale(' + n + ')'

    connect: (url, args) ->
        me = @
        @disconnect(false)
        return unless @ws
        @socket = new WebSocket @ws
        @socket.binaryType = "arraybuffer"
        @socket.onopen = () ->
            console.log "socket opened"
            me.initConnection(url, args)

        @socket.onmessage =  (e) ->
            me.consume e
        @socket.onerror = (e) =>
            me.onerror("Websocket error")
            
        @socket.onclose = () ->
            me.socket = null
            me.canvas.style.cursor = "auto"
            me.canvas.getContext('2d').clearRect 0,0, me.resolution.w, me.resolution.h if me.canvas and me.resolution
            clearTimeout(me.pingto) if me.pingto
            me.pingto = undefined
            me.ondisconnect()
            console.log "socket closed"

    disconnect: (close_worker) ->
        @socket.close() if @socket
        @socket = undefined
        @decoder.terminate() if close_worker
        @enableEvent = false

    initConnection: (vncserver, params) ->
        #vncserver = "192.168.1.20:5901"
        data = new Uint8Array vncserver.length + 2
        data[0] = 16 # bbp
        data[1] = 50 # jpeg quality
        if params
            data[0] = params.bbp if params.bbp
            data[1] = params.quality if params.quality
        ## rate in milisecond

        data.set (new TextEncoder()).encode(vncserver), 2
        @socket.send(@buildCommand 0x01, data)

    resetModifierKeys: () ->
        return unless @socket
        return unless @enableEvent
        @sendKeyEvent 0xFFE7, 0 # meta left
        @sendKeyEvent 0xFFE8, 0 # meta right
        @sendKeyEvent 0xFFE1, 0 # shift left
        @sendKeyEvent 0xFFE3, 0 # ctrl left
        @sendKeyEvent 0xFFE9, 0 # alt left

    sendPointEvent: (x, y, mask) ->
        return unless @socket
        return unless @enableEvent
        data = new Uint8Array 5
        data[0] = x & 0xFF
        data[1] = x >> 8
        data[2] = y & 0xFF
        data[3] = y >> 8
        data[4] = mask
        @socket.send( @buildCommand 0x05, data )

    sendKeyEvent: (code, v) ->
        # console.log code, v
        return unless @socket
        return unless @enableEvent
        data = new Uint8Array 3
        data[0] = code & 0xFF
        data[1] = (code >> 8) & 0xFF
        data[2] = v
        @socket.send( @buildCommand 0x06, data )
    
    sendPing: () ->
        return unless @socket
        @socket.send( @buildCommand 0x08, 'PING WVNC' )

    buildCommand: (hex, o) ->
        data = undefined
        switch typeof o
            when 'string'
                data = (new TextEncoder()).encode(o)
            when 'number'
                data = new Uint8Array [o]
            else
                data = o
        cmd = new Uint8Array data.length + 3
        cmd[0] = hex
        cmd[2] = data.length >> 8
        cmd[1] = data.length & 0x0F
        cmd.set data, 3
        #console.log "the command is", cmd.buffer
        return cmd.buffer

    oncopy: (text) ->
        console.log "Get clipboard text: " + text

    onpassword: () ->
        return new Promise (resolve, reject) ->
            reject("onpassword is not implemented")

    sendTextAsClipboard: (text) ->
        return unless @socket
        @socket.send (@buildCommand 0x07, text)
        # send ctrl-v to paste
        charcode = 'v'.charCodeAt 0
        @sendKeyEvent 0xFFE3, 1 # CTRL down
        @sendKeyEvent charcode, 1 # v down
        @sendKeyEvent charcode, 0 # v up
        @sendKeyEvent 0xFFE3, 0 # CTRL up

    oncredential: () ->
        return new Promise (resolve, reject) ->
            reject("oncredential is not implemented")

    onerror: (m) ->
         console.log "Error", m

    onresize: () ->
        console.log "resize"
    
    ondisconnect: () ->
        console.log "disconnect"
        
    consume: (e) ->
        data = new Uint8Array e.data
        cmd = data[0]
        me = @
        switch  cmd
            when 0xFE #error
                data = data.subarray 1, data.length - 1
                dec = new TextDecoder("utf-8")
                @onerror dec.decode(data)
            when 0x81
                console.log "Request for password"
                @enableEvent = false
                @onpassword().then (pass) ->
                    me.socket.send (me.buildCommand 0x02, pass)
                    me.enableEvent = true
            when 0x82
                console.log "Request for login"
                @enableEvent = false
                @oncredential().then (user, pass) ->
                    arr = new Uint8Array user.length + pass.length + 1
                    arr.set (new TextEncoder()).encode(user), 0
                    arr.set ['\0'], user.length
                    arr.set (new TextEncoder()).encode(pass), user.length + 1
                    me.socket.send(me.buildCommand 0x03, arr)
                    me.enableEvent = true
            when 0x83
                w = data[1] | (data[2]<<8)
                h = data[3] | (data[4]<<8)
                @initCanvas w, h
                # status command for ack
                @socket.send(@buildCommand 0x04, 1)
                @enableEvent = true
                # @resetModifierKeys()
                @onresize()
                return if @pingto
                fn = () =>
                    @sendPing()
                    @pingto = setTimeout(fn, 5000)
                @pingto = setTimeout(fn, 5000)
            when 0x84
                # send data to web assembly for decoding
                @decoder.postMessage data.buffer, [data.buffer]
            when 0x85
                # clipboard data from server
                data = data.subarray 1
                dec = new TextDecoder "utf-8"
                @oncopy dec.decode data
                @socket.send(@buildCommand 0x04, 1)
            else
                console.log cmd

window.WVNC = WVNC