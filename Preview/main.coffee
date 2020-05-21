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
        @currfile = undefined
        @currfile = @args[0].path.asFileHandle() if @args and @args.length > 0
        @view = @find "view"
        @status = @find "status"
        @zoom = @find "zoom"
        @btnext = @find "btnext"
        @btprev = @find "btprev"
        @btreset = @find "btreset"
        @txtpage = @find "txtpage"
        
        @zoom.set "onchange", (e) => @setViewScale e.data
        
        @btreset.set "onbtclick", (e) =>
                @zoom.set "value", 100
                @setViewScale 100
        
        @btnext.set "onbtclick", (e) =>
            val = parseInt $(@txtpage).val()
            return if isNaN val
            $(@txtpage).val val + 1
            @gotoPage()
        @btprev.set "onbtclick", (e) =>
            val = parseInt $(@txtpage).val()
            return if isNaN val
            $(@txtpage).val val - 1
            @gotoPage()
        
        $(@txtpage).keyup (e) =>
            return unless e.which is 13
            return unless @pdf
            @gotoPage()
        
        PDFJS.workerSrc = "#{@path()}/pdf.worker.js".asFileHandle().getlink()
        @pdf = undefined
        @img = undefined
        
        @bindKey "ALT-O", () => @actionFile "#{@name}-Open"
        @bindKey "CTRL-X", () => @actionFile "#{@name}-Close"
        @zoom.set "max", 200
        @zoom.set "value", 100
        @open @currfile

    
    open: (file) ->
        return unless file
        @currfile = file unless @currfile is file
        file.onready().then () =>
            file.info.size = (file.info.size / 1024).toFixed(2)
            @renderFile()
        .catch (err) =>
            @error __("File not found {0}", file.path), err
    
    
    gotoPage: () ->
        return unless @pdf
        val = parseInt $(@txtpage).val()
        return if  isNaN(val)
        return if val <= 0 or val > @pdf.numPages
        ($ @view).empty()
        @renderPDFPages val, (@zoom.get("value") / 100), false
            .catch (e) => @error __("Unable to render page {0}", val), e
    
    renderFile: () ->
        mime = @currfile.info.mime
        return unless mime
        @pdf = undefined
        @img = undefined
        ($ @view).empty()
        @zoom.set "value", 100
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
        if mime.match /^[^\/]+\/.*pdf.*/g
            return unless @pdf
            ($ @view).empty()
            @load @renderPDFPages 1, scale
            .catch (e) => @error __("Unable to set view scale"), e
                
        else if mime.match /image\/.*svg.*/g
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

    renderPDFPages: (n, scale, recursive) ->
        new Promise (resolve, reject) =>
            status = "#{@currfile.info.name} (#{@currfile.info.size} Kb)"
            return resolve() if n > @pdf.numPages
            @pdf.getPage(n).then (page) =>
                viewport = page.getViewport scale
                div = ($ "<div/>")
                        .attr("id", "page-" + (page.pageIndex + 1))
                        .attr("scale", scale)
                        .addClass "pdf-page"
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
                page._canvas = canvas
                @setStatus "#{status} - page #{n}/#{@pdf.numPages} loaded"
                if recursive
                    @renderPDFPages n + 1, scale, recursive
                        .then () -> resolve()
                        .catch (e) -> reject e
                else
                    resolve()
            .catch (e) -> reject e

    renderPDF: () ->
        @load new Promise (resolve, reject) =>
            @currfile.read("binary").then (d) =>
                ($ @view).removeClass()
                PDFJS.getDocument { data: d }
                .then (pdf) =>
                    @pdf = pdf
                    @renderPDFPages 1, 1, false
                        .then () =>
                            $(@txtpage).val("1")
                            resolve()
                        .catch (e) -> reject e
                .catch (e) -> reject e
            .catch (e) -> reject e
        .catch (e) => @error __("Unable to view file: {0}", @currfile.path), e

    renderSVG: () ->
        ($ @view).attr("class", "image")
        @currfile.read().then (d) =>
            @view.innerHTML = d
            $($(@view).children()[0])
                .css "width", "100%"
                .css "height", "100%"
        .catch (e) => @error __("Unable to read file: {0}", @currfile.path), e

    renderImage: () ->
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
                @setStatus "#{@currfile.info.name} (#{@currfile.info.size} Kb) - #{img.width}x#{img.height}"
            
            blob = new Blob [d], { type: @currfile.info.mime }
            img.src = URL.createObjectURL blob
        .catch (e) => @error __("Unable to read file: {0}", @currfile.path), e

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
