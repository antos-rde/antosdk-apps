

class Msg
    constructor: () ->
        @header = {
            sid: 0,
            cid: 0,
            type: 0,
            size: 0
        }
        @data = undefined
    
    
    as_raw:() ->
        length = 11 + @header.size
        arr = new Uint8Array(length)
        arr.set(Msg.MAGIC_START, 0)
        arr[2] = @header.type
        bytes = Msg.bytes_of @header.cid
        arr.set(bytes,3)
        bytes = Msg.bytes_of @header.sid
        arr.set(bytes,5)
        bytes = Msg.bytes_of @header.size
        arr.set(bytes,7)
        if @data
            arr.set(@data, 9)
        arr.set(Msg.MAGIC_END, @header.size + 9)
        arr.buffer

Msg.decode = (raw) ->
    new Promise (resolve, reject) ->
        msg = new Msg()
        if(Msg.int_from(Msg.MAGIC_START, 0) != Msg.int_from(raw, 0))
            return reject("Unmatch message begin magic number")
        msg.header.type = raw[2]
        msg.header.cid = Msg.int_from(raw, 3)
        msg.header.sid = Msg.int_from(raw,5)
        msg.header.size = Msg.int_from(raw, 7)
        msg.data = raw.slice(9, 9+msg.header.size)
        if(Msg.int_from(Msg.MAGIC_END, 0) != Msg.int_from(raw, 9+msg.header.size))
            return reject("Unmatch message end magic number")
        resolve msg
    
    
Msg.bytes_of = (x) ->
    bytes=new Uint8Array(2)
    bytes[0]=x & (255)
    x=x>>8
    bytes[1]=x & (255)
    bytes

Msg.int_from = (bytes, offset) ->
    (bytes[offset] | (bytes[offset+1]<<8))

Msg.OK = 0
Msg.ERROR = 1
Msg.DATA = 6
Msg.CLOSE = 5
Msg.SUBSCRIBE = 2
Msg.UNSUBSCRIBE = 3
Msg.CTRL = 7
Msg.PING = 8
Msg.MAGIC_END = [0x44, 0x54]
Msg.MAGIC_START = [0x4e, 0x41 ]

class Subscriber
    constructor: (@channel) ->
        @id = undefined
        @channel_id = undefined
        @onmessage = undefined
        @onerror = undefined
        @onopen = undefined
        @onclose = undefined
        @tunnel = undefined
        @is_opened = false
    
    send: (type, arr) ->
        if not @tunnel
            @onerror "Tunnel is not opened" if @onerror
            return
        if not @is_opened
            @onerror "Channel is not opened yet" if @onerror
            return
            
        @tunnel.send @genmsg type, arr
    
    genmsg: (type, data) ->
        msg = new Msg()
        msg.header.sid = @id
        msg.header.cid = @channel_id
        msg.header.type = type
        msg.header.size = if data then data.length else 0
        msg.data = data
        msg
    
    close: (b) ->
        @is_opened = false
        return unless @tunnel
        @tunnel.unsubscribe @, b


class AntunnelApi
    constructor: (@uri) ->
        @socket = undefined
        @pending = {}
        @subscribers = {}
        @onclose = undefined
    
    ready: () ->
        return new Promise (resolve, reject) =>
            return reject() if not @uri
            return resolve() if @socket isnt undefined
            # connect to the socket
            console.log "Connect to #{@uri}"
            @socket = new WebSocket(@uri)
            @socket.binaryType = 'arraybuffer'
            @socket.onmessage = (evt) => @process evt
            @socket.onclose = (evt) =>
                @socket = undefined
                for k,v of @pending
                    v.tunnel = undefined
                    v.onclose() if v.onclose
                    
                for k,v of @subscribers
                    v.tunnel = undefined
                    v.is_opened = false
                    v.onclose() if v.onclose
                    
                @pending = {}
                @subscribe = {}
                @onclose() if @onclose()
            @socket.onerror = (evt) =>
                v.onerror(evt.toString()) for k,v of @pending when v.onerror
                v.onerror(evt.toString()) for k,v of @subscribers when v.onerror
            @socket.onopen = (e) => resolve()
    
    process: (evt) ->
        Msg.decode(new Uint8Array(evt.data)).then (msg) =>
            # find the correct subscriber of the data
            relay_msg = (m, a) =>
                sub = @pending[m.header.sid]
                if sub
                    sub[a] m if sub[a]
                    return
                sub = @subscribers[m.header.sid]
                if sub
                    sub[a] m if sub[a]
            switch msg.header.type
                when Msg.OK
                    # first look for the pending
                    sub = @pending[msg.header.sid]
                    if sub
                        delete @pending[msg.header.sid]
                        sub.id = Msg.int_from(msg.data,0)
                        sub.channel_id = msg.header.cid
                        @subscribers[sub.id] = sub
                        sub.is_opened = true
                        sub.onopen() if sub.onopen
                    else
                        relay_msg msg, "onmessage"
                
                when Msg.DATA
                    relay_msg msg, "onmessage"
                
                when Msg.ERROR
                    relay_msg msg, "onerror"
                   
                when Msg.UNSUBSCRIBE
                    sub = @subscribers[msg.header.sid]
                    return unless sub
                    sub.close(true)
                when Msg.PING
                    # do nothing
                else
                    console.error "Message of type #{msg.header.type} is unsupported", msg
                 
        .catch (e) =>
            v.onerror(e) for k,v of @pending when v.onerror
            v.onerror(e) for k,v of @subscribers when v.onerror
            console.log e
        
        
    subscribe: (sub) ->
        @ready().then ()=>
            # insert it to pending list
            sub.tunnel = @
            sub.id = Math.floor(Math.random()*1000) + 1
            while @subscribers[sub.id] or @pending[sub.id]
                sub.id = Math.floor(Math.random()*1000) + 1
            @pending[sub.id] = sub
            # send request to connect to a channel
            @send sub.genmsg Msg.SUBSCRIBE, (new TextEncoder()).encode(sub.channel)
        .catch (e) ->
            sub.onerror e.toString() if sub.onerror
        
    unsubscribe: (sub, b) ->
        @ready().then ()=>
            return unless @subscribers[sub.id]
            # insert it to pending list
            # send request to connect to a channel
            @send sub.genmsg Msg.UNSUBSCRIBE, undefined if not b
            sub.onclose() if sub.onclose
            delete @subscribers[sub.id]
            sub.tunnel = undefined
            sub.is_opened = false
            
        .catch (e) ->
            sub.onerror e.toString() if sub.onerror

    send: (msg) ->
        # return unless @subscribers[msg.header.sid]
        @socket.send msg.as_raw()
    
    close: () ->
        console.log "Close connection to #{@uri}"
        @socket.close() if @socket
        @onclose() if @onclose()
        
W = this
if not W.Antunnel
    W.Antunnel = {
        tunnel: undefined
        init: ((url) ->
            return new Promise (resolve, reject) ->
                return resolve(W.Antunnel.tunnel) if W.Antunnel.tunnel
                W.Antunnel.tunnel = new AntunnelApi(url)
                W.Antunnel.tunnel.onclose = () -> W.Antunnel.tunnel = undefined
                W.Antunnel.tunnel.ready().then () ->
                    resolve(W.Antunnel.tunnel)
                .catch (e) -> reject(e)),
        Subscriber: Subscriber,
        Msg: Msg
    }