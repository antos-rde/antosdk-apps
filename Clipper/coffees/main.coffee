class Clipper extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "Clipper", args
    
    main: () ->
        @scene = @find("scene")
        @wrapper = @find("wrapper")
        @cropwin = @find("cropwin")
        @dirty = false
        @currfile = "Untitled".asFileHandle()
        $(@cropwin)
            .css "position", "absolute"
            .hide()
        @find("btnCptScreen").onbtclick = () =>
            @capture document.body, true
        
        @find("btnCptWindow").onbtclick = () =>
            # select a window
            wins = []
            for k, v of OS.PM.processes
                for process in v
                    if OS.application[process.name].type is 0
                        wins.push {
                            text: process.scheme.apptitle,
                            el: process.scheme,
                            icon: process.meta().icon,
                            iconclass: process.meta().iconclass
                        }
            @openDialog "SelectionDialog", {
                title: "Select a window",
                data: wins
            }
            .then (sel) =>
                return unless sel
                @capture sel.el
        
        btncrop = @find("btnCrop")
        
        @cropselect = (e) =>
            offset = $(@cropwin).offset()
            w = e.clientX - offset.left
            h = e.clientY - offset.top
            $(@cropwin)
                .css "width", "#{w}px"
                .css "height", "#{h}px"
                
        @cropup = (e) =>
            $(window).off "mousemove", @cropselect
            $(window).off "mouseup", @cropup
            
            @ask { text: __("Crop the selected zone ?") }
            .then (b) =>
                btncrop.enable = true
                btncrop.selected = false
                croff = $(@cropwin).offset()
                scenoff = $(@scene).offset()
                x = croff.left - scenoff.left
                y = croff.top - scenoff.top
                w = $(@cropwin).width()
                h = $(@cropwin).height()
                $(@cropwin).hide()
                $(@cropwin)
                    .css "width", "0px"
                    .css "height", "0px"
                return unless b
                ctx = @scene.getContext('2d')
                data = ctx.getImageData(x,y, w, h)
                @scene.width = w
                @scene.height = h
                ctx.putImageData(data, 0,0)
                @dirty = true
        
        @cropdown = (e) =>
            btncrop.enable = false
            offset = $(@scheme).offset()
            $(@cropwin)
                .css "left", "#{e.clientX - offset.left}px"
                .css "top", "#{e.clientY - offset.top}px"
                .show()
            $(window).off "mousedown", @cropdown
            $(window).mousemove @cropselect
            $(window).mouseup @cropup
            
        btncrop.onbtclick = () =>
            if btncrop.selected
                $(window).mousedown @cropdown
            else
                $(window).off "mousedown", @cropdown
        
        @bindKey "CTRL-S", () => @actionFile "#{@name}-Save"
        @bindKey "ALT-W", () => @actionFile "#{@name}-Saveas"

    capture: (el, windoff) ->
        @hide() if windoff
        html2canvas(el).then (canvas) =>
            @scene.height = canvas.height
            @scene.width = canvas.width
            @scene.getContext('2d').drawImage(canvas, 0, 0)
            @notify __("Screen captured")
            @show() if windoff
            @dirty = true
        .catch (e) => @error e.toString(), e
    
    menu: () ->
        menu = [{
                text: "__(File)",
                nodes: [
                    { text: "__(Save)", dataid: "#{@name}-Save", shortcut: "C-S" },
                    { text: "__(Save as)", dataid: "#{@name}-Saveas", shortcut: "A-W" }
                ],
                onchildselect: (e) => @actionFile e.data.item.data.dataid
            }]
        menu
    
    save: ()->
        @currfile.cache = @scene.toDataURL("image/png")
        @currfile.write "base64"
            .then (r) =>
                @notify __("File saved")
                @dirty = false
            .catch (e) => @error __("Cannot save to file: {0}", e.toString()), e
    
    actionFile: (e) ->
        saveas = () =>
            @openDialog("FileDialog", {
                title: __("Save as"),
                file: @currfile
            })
            .then (f) =>
                d = f.file.path.asFileHandle()
                d = d.parent() if f.file.type is "file"
                @currfile.setPath "#{d.path}/#{f.name}"
                @save @currfile

        switch e
            when "#{@name}-Save"
                return @save() if @currfile.basename
                saveas()
                
            when "#{@name}-Saveas"
                saveas()
    
    cleanup: (evt) ->
        return unless @dirty
        evt.preventDefault()
        @ask {
            title: __("Quit"),
            text: __("Quit without saving ?")
        }
        .then (d) =>
            if d
                @dirty = false
                @quit()


this.OS.register "Clipper", Clipper