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

class Preview extends this.OS.GUI.BaseApplication
    constructor: (args) ->
        super "Preview", args
    
    main: () ->
        @currfile = @args[0].path.asFileHandle() if @args and @args.length > 0
        @view = @find "view"
        @status = @find "status"
        PDFJS.workerSrc = "#{@path()}/pdf.worker.js".asFileHandle().getlink()
        
        @bindKey "ALT-O", () => @actionFile "#{@name}-Open"
        @bindKey "CTRL-X", () => @actionFile "#{@name}-Close"
        
        @open @currfile

    
    open: (file) ->
        return unless file
        @currfile = file unless @currfile is file
        file.onready().then () =>
            file.info.size = (file.info.size / 1024).toFixed(2)
            @renderFile file
        .catch (err) =>
            @error __("File not found {0}", file.path), err
    
    renderFile: (file) ->
        mime = file.info.mime
        return unless mime
        ($ @view).empty()
        if mime.match /^[^\/]+\/.*pdf.*/g
            @renderPDF file
        else if mime.match /image\/.*svg.*/g
            @renderSVG file
        else if mime.match /image\/.*/g
            @renderImage file
        else
            @notify __("Mime type {0} is not supported", file.info.mime)

    setStatus: (t) ->
        ($ @status).html t

    renderPDF: (file) ->
        status = "#{file.info.name} (#{file.info.size} Kb)"
        q = @_api.mid()
        file.read("binary").then (d) =>
            @_api.loading q, "RENDERING"
            ($ @view).removeClass()
            PDFJS.getDocument { data: d }
            .then (pdf) =>
                fn = (p) =>
                    if p > pdf.numPages
                        @setStatus "#{status} - loaded"
                        return @_api.loaded q, "OK"
                    pdf.getPage(p).then (page) =>
                        scale = 1.5
                        viewport = page.getViewport scale
                        div = ($ "<div/>").attr("id", "page-" + (page.pageIndex + 1))
                        ($ @view).append div
                        canvas = ($ "<canvas>")[0]
                        div.append canvas
                        context = canvas.getContext '2d'
                        canvas.height = viewport.height
                        canvas.width = viewport.width
                        renderContext =
                            canvasContext: context
                            viewport: viewport
                        page.render renderContext
                        @setStatus "#{status} - #{p}/#{pdf.numPages} loaded"
                        fn(p+1)
                fn(1)
            .catch (err) =>
                @error __("Cannot render the PDF file")
                @_api.loaded q, "FAIL"
        .catch (e) =>
                @_api.loaded q, "FAIL"
                @error __("Unable to read file: {}", file.path), e

    renderSVG: (file) ->
        ($ @view).attr("class", "image")
        file.read().then (d) =>
            @view.innerHTML = d
            $($(@view).children()[0])
                .css "width", "100%"
                .css "height", "100%"
        .catch (e) => @error __("Unable to read file: {}", file.path), e

    renderImage: (file) ->
        ($ @view).attr("class", "image")

        file.read("binary").then (d) =>
            img = new Image()
            canvas = ($ "<canvas/>")[0]
            ($ @view).append canvas

            #($ me.view).append img
            img.onload = () =>
                context = canvas.getContext '2d'
                canvas.height = img.height
                canvas.width = img.width
                #console.log canvas.width, canvas.height
                context.drawImage img, 0, 0
                @setStatus "#{file.info.name} (#{file.info.size} Kb) - #{img.width}x#{img.height}"
            
            blob = new Blob [d], { type: file.info.mime }
            img.src = URL.createObjectURL blob
        .catch (e) => @error __("Unable to read file: {}", file.path), e

    menu: () ->
        menu = [{
                text: "__(File)",
                child: [
                    { text: "__(Open)", dataid: "#{@name}-Open", shortcut: "A-O" },
                    { text: "__(Close)", dataid: "#{@name}-Close", shortcut: "C-X" },
                ],
                onchildselect: (e) => @actionFile e.data.item.get("data").dataid
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
