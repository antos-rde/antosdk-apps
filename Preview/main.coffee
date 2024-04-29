# Copyright 2017-2018 Xuan Sang LE <xsang.le AT gmail DOT com>

# AnTOS Web desktop is is licensed under the GNU General Public
# License v3.0, see the LICENCE file for more information

# This program is free software: you can redistribute it and/or
# modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation, either version 3 of 
# the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# General Public License for more details.

# You should have received a copy of the GNU General Public License
#along with this program. If not, see https://www.gnu.org/licenses/.

class Preview extends this.OS.application.BaseApplication
    constructor: (args) ->
        super "Preview", args
    
    main: () ->
        @currfile = undefined
        @currfile = @args[0].path.asFileHandle() if @args and @args.length > 0
        @view = @find "view"
        @status = @find "status"
        @zoom = @find "zoom"
        @btreset = @find "btreset"
        
        @zoom.onvaluechange = (e) => @setViewScale e.data
        
        @btreset.onbtclick = (e) =>
                @zoom.value = 100
                @setViewScale 100
    
        @img = undefined
        
        @bindKey "ALT-O", () => @actionFile "#{@name}-Open"
        @bindKey "CTRL-X", () => @actionFile "#{@name}-Close"
        @zoom.max = 200
        @zoom.value = 100
        @open @currfile

    
    open: (file) ->
        return unless file
        @currfile = file unless @currfile is file
        file.onready().then () =>
            file.info.size = (file.info.size / 1024).toFixed(2)
            @renderFile()
        .catch (err) =>
            @error __("File not found {0}", file.path), err
    
    
    renderFile: () ->
        mime = @currfile.info.mime
        return unless mime
        @img = undefined
        ($ @view).empty()
        @zoom.value = 100
        @scheme.apptitle = @currfile.info.name
        if mime.match /^[^\/]+\/.*pdf.*/g
            @renderPDF()
        else if mime.match /image\/.*svg.*/g
            @renderSVG()
        else if mime.match /image\/.*/g
            @renderImage()
        else
            @notify __("Mime type {0} is not supported", file.info.mime)

    setStatus: (t) ->
        ($ @status).html t

    setViewScale: (value) ->
        return unless @currfile
        mime = @currfile.info.mime
        scale = (value / 100)
        if mime.match /image\/.*svg.*/g
            $($(@view).children()[0])
                .css "width", "#{Math.round(value)}%"
                .css "height", "#{Math.round(value)}%"
            
        else if mime.match /image\/.*/g
            return unless @img
            canvas = $(@view).children()[0]
            context = canvas.getContext '2d'
            w = @img.width * scale
            h = @img.height * scale
            canvas.height = h
            canvas.width = w
            context.clearRect(0, 0, canvas.width, canvas.height)
            context.scale scale, scale
            context.drawImage @img, 0, 0

    

    renderPDF: () ->
        $(@find("statcontainer")).hide()
        @trigger "resize"
        ($ @view).attr("class", "pdf")
        frame = ($ "<iframe/>")
                    .css "width", "100%"
                    .css "height", "100%"
        ($ @view).append frame[0]
        frame[0].src = "pkg://libpdfjs/web/viewer.html".asFileHandle().getlink() + "?file=" + @currfile.getlink()

    renderSVG: () ->
        $(@find("statcontainer")).show()
        @trigger "resize"
        ($ @view).attr("class", "image")
        @currfile.read().then (d) =>
            @view.innerHTML = d
            $($(@view).children()[0])
                .css "width", "100%"
                .css "height", "100%"
        .catch (e) => @error __("Unable to read file: {0}", @currfile.path), e

    renderImage: () ->
        $(@find("statcontainer")).show()
        @trigger "resize"
        ($ @view).attr("class", "image")

        @currfile.read("binary").then (d) =>
            img = new Image()
            canvas = ($ "<canvas/>")[0]
            ($ @view).append canvas

            #($ me.view).append img
            img.onload = () =>
                context = canvas.getContext '2d'
                canvas.height = img.height
                canvas.width = img.width
                @img = img
                #console.log canvas.width, canvas.height
                context.drawImage img, 0, 0
                @setStatus "#{@currfile.info.size} Kb - #{img.width}x#{img.height}"
            
            blob = new Blob [d], { type: @currfile.info.mime }
            img.src = URL.createObjectURL blob
        .catch (e) => @error __("Unable to read file: {0}", @currfile.path), e

    menu: () ->
        menu = [{
                text: "__(File)",
                nodes: [
                    { text: "__(Open)", dataid: "#{@name}-Open", shortcut: "A-O" },
                    { text: "__(Close)", dataid: "#{@name}-Close", shortcut: "C-X" },
                ],
                onchildselect: (e) => @actionFile e.data.item.data.dataid
            }]
        menu
    
    actionFile: (e) ->
        switch e
            when "#{@name}-Open"
                @openDialog("FileDialog", {
                    title: __("Open file"),
                    mimes: @meta().mimes
                }).then ( d ) =>
                    @open d.file.path.asFileHandle()
                
             when "#{@name}-Close"
                @quit()

this.OS.register "Preview", Preview
