class MediaPlayer extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "MediaPlayer", args
    
    main: () ->
        me = @
        @volsw = @find "play-vol"
        @volctl = @find "vol-control"
        @volsw.set "swon", true
        @volctl.set "onchange", (v) ->
            return unless (me.volsw.get "swon")
            Howler.volume (me.volctl.get "value")/100
        @volctl.set "value", 70
        @playlist = @find "playlist"
        @playtime = @find "play-time"
        @songname = @find "song-name"
        @totaltime = @find "total-time"
        @playpause = @find "play-pause"
        @progress = @find "play-slide"
        @playran = @find "play-random"
        @history = []
        @currsong = undefined
        @timer = undefined
        @animator = @find "animation"
        
        @volsw.set "onchange", (e) ->
            return Howler.volume 0 if not e.data
            Howler.volume (me.volctl.get "value")/100
        @playlist.set "buttons", [
            {
                text: "+",
                onbtclick: () ->
                    me.openDialog "FileDiaLog", (d,n,p,f) ->
                        return me.scanDir f if f.type is "dir"
                        f.text = f.filename
                        f.iconclass = "fa fa-music"
                        me.playlist.push f, true
                    , "__(Select MP3 file or a folder)"
                    , { mimes: ["dir", "audio/mpeg"] }
            },
            {
                text: "-",
                onbtclick: () ->
                    sel = me.playlist.get "selected"
                    return unless sel
                    me.stop() if sel is me.currsong
                    me.playlist.remove sel, true
            },
            {
                text: "",
                onbtclick: () ->
                    me.openDialog "PromptDialog", (link) ->
                        return unless link and link isnt ""
                        data = {
                            text: link,
                            path: link,
                            iconclass: "fa fa-link",
                            broadcast: true
                        }
                        me.playlist.push data, true
                    , "__(MP3 Radio broadcast)", { label:"Enter radio broadcast link" }
                , iconclass: "fa fa-link"
            },
            {
                text:"",
                iconclass: "fa fa-save",
                onbtclick: () ->
                    playlist = []
                    for v in me.playlist.get "items"
                        playlist.push {
                            text: v.text,
                            path: v.path,
                            iconclass: v.iconclass,
                            broadcast: if v.broadcast then v.broadcast else false
                        }
                    fp = "Untitled".asFileHandler()
                    me.openDialog "FileDiaLog", (d,n,p,f) ->
                        fp = "#{d}/#{n}".asFileHandler()
                        fp.cache = playlist
                        fp.write "object", (r) ->
                            return me.error __("Cannot save playlist: {0}", r.error) if r.error
                            me.notify __("Playlist saved")
                    , "__(Save Playlist)", { file: fp }
            },
            {
                text:"",
                iconclass: "fa fa-folder",
                onbtclick: () ->
                    me.openDialog "FileDiaLog", (d,n,p,f) ->
                        f.path.asFileHandler().read (d) ->
                            me.stop()
                            me.playlist.set "items", d
                        , "json"
                    , "__(Open Playlist)", { mimes: ["application/json"] }
            }
        ]
        @playlist.set "onlistdbclick", (e) ->
            return unless e
            e.data.index = e.idx
            me.play e.data
        @progress.set "onchange", (s) ->
            me.seek s
        @playpause.set "onchange", (e) ->
            me.togglePlayPause()
        (@find "play-prev").set "onbtclick", () ->
            me.prevSong()
        (@find "play-next").set "onbtclick", () ->
            me.nextSong()
        $(@animator).css("visibility", "hidden")
    scanDir: (f) ->
        me = @
        f.path.asFileHandler().read (d) ->
            return me.error __("Unable to read {0}", d.error) if d.error
            for v in d.result when v.mime.match /audio\/mpeg/
                v.iconclass = "fa fa-music"
                v.text = v.filename
                me.playlist.push v, true
    
    
    togglePlayPause: () ->
        return @playpause.set "swon",false  unless @currsong and @currsong.howl
        sound = @currsong.howl
        if sound.playing()
            sound.pause()
        else
            sound.play()
    
    nextSong: () ->
        idx = -1
        if (@playran.get "swon")
            idx = @randomSong()
        else
            len = (@playlist.get "items").length
            if len > 0
                idx = 0
                idx = @currsong.index + 1 if @currsong
                idx = 0 if idx >= len
        return if idx is -1
        @history.pop() if history.length >= 10
        @history.unshift @currsong.index if @currsong
        @playlist.set "selected", idx
        sel = @playlist.get "selected"
        sel.index = idx
        @play sel
    
    prevSong: () ->
        idx = -1
        if (@playran.get "swon")
            idx = @history.shift() if @history.length > 0
        else
            len = (@playlist.get "items").length
            if len > 0 
                idx = @currsong.index - 1 if @currsong
                idx = 0 if idx < 0
        return if idx is -1
        @playlist.set "selected", idx
        sel = @playlist.get "selected"
        sel.index = idx
        @play sel
    
    randomSong: () ->
        len = (@playlist.get "items").length
        return -1 unless len > 0
        return Math.floor(Math.random() * Math.floor(len))
    
    play: (file) ->
        me = @
        @stop()
        @currsong = file
        sound = file.howl
        if not sound
            sound = file.howl = new Howl {
                src: [ 
                    file.path.asFileHandler().getlink()
                ],
                preload:true,
                buffer: true,
                html5: true, # Force to HTML5 so that the audio can stream in (best for large files).
                format: ['mp3', 'aac'],
                onplay: () ->
                    $(me.animator).css("visibility", "visible")
                    #Display the duration.
                    me.playpause.set "swon", true
                    console.log "play"
                    me.songname.set "text", file.text
                    duration = Math.round(sound.duration())
                    if duration isnt Infinity
                        me.totaltime.set "text", me.formatDuration duration
                        me.progress.set "max", duration
                    else
                        me.totaltime.set "text", "--:--"
                        me.progress.set "max", 0
                    if not file.broadcast
                        func = () ->
                            if sound.playing()
                                seek = Math.round(sound.seek()) || 0
                                me.progress.set "value", seek
                                me.playtime.set "text", me.formatDuration seek
                                me.timer = setTimeout (() -> func()), 1000
                        func()
                    else
                        me.totaltime.set "text", "--:--"
                        me.progress.set "value", (me.progress.get "max")
                        func = () ->
                            if sound.playing()
                                seek = Math.round(sound.seek()) || 0
                                me.playtime.set "text", me.formatDuration seek
                                me.timer = setTimeout (() -> func()), 1000
                        func()
                onload: () ->
                    # Start the wave animation.
                    console.log "load"
                    $(me.animator).css("visibility", "hidden")
                    sound.play() if not file.broadcast
                    
                onend: () ->
                    # Stop the wave animation.
                    me.progress.set "value", 0
                    clearTimeout me.timer if me.timer
                    me.playpause.set "swon", false
                    $(me.animator).css("visibility", "hidden")
                    me.nextSong()
                onpause: ()->
                    # Stop the wave animation.
                    console.log "pause"
                    clearTimeout me.timer if me.timer
                    me.playpause.set "swon", false
                    $(me.animator).css("visibility", "hidden")
            
                onstop: () ->
                    me.progress.set "value", 0
                    clearTimeout me.timer if me.timer
                    me.playpause.set "swon", false
                    $(me.animator).css("visibility", "hidden")
                    console.log "stop"
            }
            sound.play() if file.broadcast
        else
            sound.play()
        $(@animator).css("visibility", "visible")
    stop: () ->
        if @currsong and @currsong.howl
            @currsong.howl.stop() if @currsong.howl.playing()
    
    seek: (v) ->
        return unless  @currsong and @currsong.howl and not @currsong.broadcast
        return unless (@progress.get "max") > 0
        sound = @currsong.howl
        sound.seek(v)
    
    formatDuration: (s) ->
        min = Math.floor(s/60)
        sec = s % 60
        min = if min < 10 then "0#{min}" else "#{min}"
        sec = if sec < 10 then "0#{sec}" else "#{sec}"
        "#{min}:#{sec}"
    
    cleanup: (evt) ->
        @stop()
# only one instance is allow
MediaPlayer.singleton = true
this.OS.register "MediaPlayer", MediaPlayer