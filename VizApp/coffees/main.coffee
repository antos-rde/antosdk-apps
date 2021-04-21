# Copyright 2020 Xuan Sang LE <xsang.le AT gmail DOT com>

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
class VizApp extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "VizApp", args
        
    main: () ->
        
        @currfile = if @args and @args.length > 0 then @args[0].path.asFileHandle() else "Untitled".asFileHandle()
        @currfile.dirty = false
        @datarea = @find "datarea"
        @preview = @find "preview"
        @btctn = @find "btn-container"
        @previewSVG = undefined
        $(@preview).append @btctn
        @editor = ace.edit @datarea
        @editor.setOptions {
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            fontSize: "11pt"
        }
        @editor.getSession().setUseWrapMode true
        @editor.session.setMode "ace/mode/dot"
        @editor.setTheme "ace/theme/monokai"
        @editor.on "input", () =>
            if @editormux
                @editormux = false
                return false
            if not @currfile.dirty
                @currfile.dirty = true


        if not @currfile.basename
            @editormux = true
            @editor.setValue VizApp.dummydot
            @renderSVG false
    
        
        @editor.container.addEventListener "keydown", (e) =>
            @renderSVG true if e.keyCode is 13
        , true
        
        @bindKey "CTRL-R", () => @renderSVG false
        @bindKey "ALT-G", () => @export "SVG"
        @bindKey "ALT-P", () => @export "PNG"
        @bindKey "ALT-N", () => @actionFile "#{@name}-New"
        @bindKey "ALT-O", () => @actionFile "#{@name}-Open"
        @bindKey "CTRL-S", () => @actionFile "#{@name}-Save"
        @bindKey "ALT-W", () => @actionFile "#{@name}-Saveas"

        @on "hboxchange", () =>
            @editor.resize()
            @calibrate()
        @on "focus", () => @editor.focus()
        (@find "btn-zoomin").onbtclick = (e) =>
            @pan.zoomIn() if @pan
        (@find "btn-zoomout").onbtclick = (e) =>
            @pan.zoomOut() if @pan
        (@find "btn-reset").onbtclick = (e) =>
            @pan.resetZoom() if @pan
        
        @open @currfile
   
    menu: () ->
        
        menu = [{
                text: "__(File)",
                nodes: [
                    { text: "__(New)", dataid: "#{@name}-New", shortcut: "A-N" },
                    { text: "__(Open)", dataid: "#{@name}-Open", shortcut: "A-O" },
                    { text: "__(Save)", dataid: "#{@name}-Save", shortcut: "C-S" },
                    { text: "__(Save as)",dataid: "#{@name}-Saveas" , shortcut: "A-W" },
                    { text: "__(Render)", dataid: "#{@name}-Render", shortcut: "C-R" },
                    { 
                        text: "__(Export as)",
                        nodes: [
                            { text: "SVG", shortcut: "A-G" },
                            { text: "PNG", shortcut: "A-P" }
                        ],
                        onchildselect: (e) => @export e.data.item.data.text
                    },
                ],
                onchildselect: (e) => @actionFile e.data.item.data.dataid
            }]
        menu
    open: (file) ->
        return if file.path is "Untitled"
        
        file.dirty = false
        file.read().then (d) =>
            @currfile = file
            @editormux = true
            @currfile.dirty = false
            @editor.setValue d
            @scheme.apptitle = "#{@currfile.basename}"
            @renderSVG false
        .catch (e) => @error e.toString(), e
    save: (file) ->
        
        file.write "text/plain"
        .then (d) =>
            file.dirty = false
            file.text = file.basename
            @scheme.apptitle = "#{@currfile.basename}"
        .catch (e) => @error e.toString(), e

    actionFile: (e) ->
        
        saveas = () =>
            @openDialog "FileDialog",{title: __("Save as"), file: @currfile }
                .then (d) =>
                    @currfile.setPath "#{d.file.path}/#{d.name}"
                    @save @currfile
                .catch (e) => @error e.toString(), e
            
        switch e
            when "#{@name}-Open"
                @openDialog "FileDialog", { title: __("Open file")}
                    .then ( d, f ) =>
                        @open d.file.path.asFileHandle()
                    .catch (e) => @error e.toString(), e
                
            when "#{@name}-Save"
                @currfile.cache = @editor.getValue()
                return @save @currfile if @currfile.basename
                saveas()
            when "#{@name}-Saveas"
                @currfile.cache = @editor.getValue()
                saveas()
            when "#{@name}-Render"
                @renderSVG false
            when "#{@name}-New"
                @currfile = "Untitled".asFileHandle()
                @currfile.cache = ""
                @currfile.dirty = false
                @editormux = true
                @editor.setValue("")
    
    export: (t) ->
        @openDialog "FileDialog", {title: __("Export as"), file: @currfile }
        .then (d) =>
            fp = "#{d.file.path}/#{d.name}".asFileHandle()
            viz = new Viz()
            text = @editor.getValue()
            switch t
                when "SVG"
                    viz.renderSVGElement(text)
                        .then (svg) =>
                            serializer = new XMLSerializer()
                            fp.cache = serializer.serializeToString(svg)
                            fp.write "text/plain"
                                .then (r) =>
                                    @notify __("File exported to SVG")
                                .catch (e) => @error __("Cannot export to {0}: {1}", t, e.toString()), e
                        .catch (error) =>
                            @error error.toString(), error
                            
                when "PNG"
                    # toDataURL("image/png")
                    viz.renderImageElement(text)
                        .then (img) =>
                            xhr = new XMLHttpRequest()
                            xhr.responseType = 'blob'
                            
                            xhr.onload = () =>
                                blob = xhr.response
                                reader = new FileReader()
                            
                                reader.onload = () =>
                                    base64data = reader.result
                                    fp.cache = base64data
                                    fp.write "base64"
                                        .then (r) =>
                                            @notify __("File exported to PNG")
                                        .catch (e) => @error __("Cannot export to {0}: {1}", t, e.toString()), e
                                reader.readAsDataURL(blob)
                            
                            xhr.open('GET', img.src)
                            xhr.send()
                        .catch (error) =>
                            @error error.toString(), error
        
        .catch (e) => @error e.toString(), e
        
       
    renderSVG: (silent) ->
        
        id = Math.floor(Math.random() * 100000) + 1
        text = @editor.getValue()
        viz = new Viz()
        viz.renderSVGElement(text)
            .then (element) =>
                return if $(element).prop("tagName").toUpperCase() is "HTML"
                $(@previewSVG).remove() if @previewSVG
                @previewSVG = element
                $(@preview).append element
                @calibrate()
                @pan = svgPanZoom element, {
                    zoomEnabled: true,
                    controlIconsEnabled: false,
                    fit: true,
                    center: true,
                    minZoom: 0.1
                }
            .catch (error) =>
                @error error.toString(), error
            
    calibrate: () ->
        svg = ($ @preview).children("svg")[0]
        if svg
            prs = [$(@preview).width(), $(@preview).height()]
            $(svg).attr "width", prs[0] + "px"
            $(svg).attr "height", prs[1] + "px"

    cleanup: (evt) ->
        return unless @currfile
        return unless @currfile.dirty
        evt.preventDefault()
        @ask {title: __("Quit"), text: __("Quit without saving ?") }
            .then (d) =>
                if d
                    @currfile.dirty = false
                    @quit()

VizApp.dummydot = """
digraph D {
  A [shape=diamond]
  B [shape=box]
  C [shape=circle]
  A -> B [style=dashed, color=grey]
  A -> C [color="black:invis:black"]
  A -> D [penwidth=5, arrowhead=none]
}
"""
VizApp.dependencies = [
    "pkg://ACECore/core/ace.js",
    "pkg://ACECore/path.js"
]
this.OS.register "VizApp", VizApp
