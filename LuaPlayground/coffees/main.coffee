class DataViewer
    constructor: (data) ->
        @target = data
        @el =  ($ "<canvas>").attr("class", "viewer")[0]
        @offset = 10
        @points = []
        @preprocess()
        @getBound()
        @prepare()
        @render()
    
    canvasPoint: (v) ->
        return new paper.Point(v[0] / @target.resolution + @base.x, - v[1] / @target.resolution + @base.y)
    
    preprocess: () ->
        @points = @target.data
    
    getBound: () ->
        peak_tl = { x:0, y:0}
        peak_rb = { x:0, y:0}
        start = null
        for v in @points
            x = v[0] / @target.resolution
            y = v[1] / @target.resolution
            peak_tl.x = x if x < peak_tl.x
            peak_tl.y = y if y < peak_tl.y
            peak_rb.x = x if x > peak_rb.x
            peak_rb.y = y if y > peak_rb.y
        
        @bound = [ peak_tl, peak_rb ]
        @base = {x: 0 - @bound[0].x+ @offset, y: @bound[1].y  + @offset}
        @width = peak_rb.x - peak_tl.x + 2*@offset
        @height = peak_rb.y - peak_tl.y + 2*@offset
    
    drawPoint: (v, color, size) ->
        # center
        new paper.Path.Circle {
            center: @canvasPoint(v),
            radius: size,
            fillColor: color
        }
    drawGrid: (size, color) ->
        wgridsize = @target.resolution*size
        # draw y line
        i = Math.ceil(@bound[0].x / size)
        while i*size < @bound[1].x
            start = new paper.Point(i*size + @base.x, -@bound[0].y + @base.y )
            end = new paper.Point(i*size + @base.x, -@bound[1].y + @base.y )
            path = new paper.Path()
            path.strokeColor = color
            path.moveTo start
            path.lineTo end
            i++
        
        # draw x line
        i = Math.ceil(@bound[0].y / size)
        while i*size < @bound[1].y
            start = new paper.Point(@bound[0].x  + @base.x,-i*size + @base.y )
            end = new paper.Point(@bound[1].x  + @base.x, -i*size + @base.y )
            path = new paper.Path()
            path.strokeColor = color
            path.moveTo start
            path.lineTo end
            i++
        
        # draw text
        text = new paper.PointText(@bound[0].x + @base.x, @base.y - @bound[1].y + @offset)
        text.justification = 'left'
        text.fillColor = '#494949'
        text.content = "Resolution: #{@target.resolution}, grid size: #{wgridsize} mm"
        
    drawAxis: (color) ->
         # x axis
        path = new paper.Path()
        path.strokeColor = color
        start = new paper.Point( @bound[0].x + @base.x, @base.y)
        end = new paper.Point( @bound[1].x + @base.x, @base.y)
        path.moveTo(start)
        path.lineTo(end)
        # y axis
        path = new paper.Path()
        path.strokeColor = color
        start = new paper.Point(@base.x, -@bound[0].y + @base.y)
        end = new paper.Point(@base.x, -@bound[1].y + @base.y)
        path.moveTo(start)
        path.lineTo(end)
        @drawPoint [0,0], color, 3
        
    prepare: () ->
        ctx = @el.getContext "2d"
        ctx.translate @base.x, @base.y
        ctx.canvas.width = @width
        ctx.canvas.height = @height
        paper.setup @el
        #tool = new paper.Tool()
        #hitOptions = {
        #    segments: true,
        #    stroke: true,
        #    fill: true,
        #    tolerance: 5
        #}
        #tool.onMouseMove = (event) ->
        #    hitResult = paper.project.hitTest event.point, hitOptions
        #    return unless hitResult
        #    console.log hitResult
       
    render:() ->
        # sub class responsibility

class PointCloudViewer extends DataViewer
    constructor: (data) ->
        super data
    
    p2c: (length, angle) ->
        rad = angle*Math.PI / 180
        return [length*Math.cos(rad), length*Math.sin(rad)]
    
    preprocess: () ->
        return @points = @target.data unless @target.coordinate is "polar"
        @point = []
        i = 0
        for v in @target.data
            @points.push @p2c v, @target.start + i*@target.angularResolution
            i = i+1
    
     # point clound render
    render: () ->
        @drawGrid 20, "#DBDBDB" # 20 px
        @drawAxis("#0A84FF")
        for v in @points
            if @target.coordinate is "polar"
                path = new paper.Path()
                path.strokeColor = '#c2a10e'
                start = @canvasPoint [0,0]
                end = @canvasPoint v
                path.moveTo start
                path.lineTo end
            @drawPoint v, "red", 3
        paper.view.draw()

    
    


class LuaPlayground extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "LuaPlayground", args
        
    main: () ->
        me = @
        @datarea = @find "editorea"
        @output = @find "output"
        @.editor = ace.edit @datarea
        @.editor.setOptions {
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            fontSize: "10pt"
        }
        @editor.getSession().setUseWrapMode true
        @editor.session.setMode "ace/mode/lua"
        @editor.setTheme "ace/theme/monokai"
        @on "vboxchange", () ->
            me.editor.resize()
        (@find "log-clear").set "onbtclick", (e) ->
            me.log "clean"
        @socket = null
        @bindKey "CTRL-R", () -> me.run()
    menu: () ->
        me = @
        menu = [{
                text: "__(Code)",
                child: [
                    { text: "__(Run)", dataid: "#{@name}-Run", shortcut: "C-R" }
                ],
                onmenuselect: (e) -> me.run()
            }]
        menu
    
    log: (t, m) ->
        return $(@output).empty() if t is "clean"
        p = ($ "<p>").attr("class", t.toLowerCase())[0]
        $(p).html "#{t}: #{m.__()}"
        ($ @output).append p
        ($ @output).scrollTop @output.scrollHeight
        
    run: () ->
        me = @
        value = @editor.getValue().trim()
        return unless value and value isnt ""
        proto = if window.location.protocol is "https:" then "wss://" else "ws://"
        @socket = new WebSocket proto + @_api.HOST + "/system/apigateway?ws=1"
        @socket.onopen = () ->
            #send data to server
            me.socket.send( JSON.stringify { code: value } )

        @socket.onmessage =  (e) ->
            return unless e.data
            try 
                obj = JSON.parse e.data
                me.log "INFO", e.data unless me.view obj
            catch err
                me.log "INFO", e.data
                console.log err
                
        @socket.onclose = () ->
            me.socket = null
            console.log "socket closed"
        
    view: (obj) ->
        return false unless obj and obj.type and  @[obj.type]
        el = @[obj.type](obj).el
        p = ($ "<p>").attr("class", "info")[0]
        $(p).append el
        ($ @output).append p
        ($ @output).scrollTop @output.scrollHeight
        return true
    
    pc: (data) ->
        return  new PointCloudViewer(data)
    
    cleanup: (e)->
        @socket.close() if @socket
        
LuaPlayground.dependencies = ["ace/ace"]
this.OS.register "LuaPlayground", LuaPlayground
