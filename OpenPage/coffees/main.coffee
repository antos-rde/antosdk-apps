class OpenPage extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "OpenPage", args
    
    main: () ->
        # load session class
        #if not OpenPage.EditorSession
        #    require ["webodf/editor/EditorSession"], (ES) ->
        #        OpenPage.EditorSession = ES
        
        @eventSubscriptions = new core.EventSubscriptions()
        @initToolbox()
        @userid = "#{@systemsetting.user.username}@#{@pid}"
        #file = "home://welco@odt"
        #file = "#{@_api.handler.get}/home://welcome.odt"
        #@canvas.load file
        #odfContainer = new odf.OdfContainer file, (c) ->
        #    @canvas.setOdfContainer c, false
        @currentStyle = ""
        if @args and @args.length > 0 then @open @args[0].path else @newdoc()
        @resource =
            fonts: []
            formats: []
        @bindKey "ALT-N", () => @actionFile "#{@name}-New"
        @bindKey "ALT-O", () => @actionFile "#{@name}-Open"
        @bindKey "CTRL-S", () => @actionFile "#{@name}-Save"
        @bindKey "ALT-W", () => @actionFile "#{@name}-Saveas"
        
    
    menu: () ->
        
        menu = [{
                text: "__(File)",
                nodes: [
                    { text: "__(New)", dataid: "#{@name}-New", shortcut: "A-N" },
                    { text: "__(Open)", dataid: "#{@name}-Open", shortcut: "A-O" },
                    { text: "__(Save)", dataid: "#{@name}-Save", shortcut: "C-S" },
                    { text: "__(Save as)", dataid: "#{@name}-Saveas", shortcut: "A-W" }
                ],
                onchildselect: (e) => @actionFile e.data.item.data.dataid
            }]
        menu
    
    actionFile: (e) ->
        
        saveas = () =>
            @openDialog "FileDialog", { title: __("Save as"), file: @currfile }
            .then (f) =>
                d = f.file.path.asFileHandle()
                d = d.parent() if f.file.type is "file"
                @currfile.setPath "#{d.path}/#{f.name}"
                @save()
        switch e
            when "#{@name}-Open"
                @openDialog "FileDialog", { title: __("Open file"),  mimes: @meta().mimes }
                .then (f) =>
                    @open f.file.path
                    
            when "#{@name}-Save"
                #@currfile.cache = @editor.value()
                return @save() if @currfile.basename
                saveas()
            when "#{@name}-Saveas"
                saveas()
             when "#{@name}-New"
                @newdoc()
    
    
    newdoc: () ->
        blank = "#{@meta().path}/blank.odt"
        @open blank, true
        
    open: (p,b) ->
        
        @pathAsDataURL(p)
            .then (r) =>
                @closeDocument() if @editorSession
                @initCanvas()
                OdfContainer = new odf.OdfContainer r.data, (c) =>
                    @canvas.setOdfContainer c, false
                    return @currfile  = "Untitled".asFileHandle() if b
                    if @currfile then @currfile.setPath p else @currfile = p.asFileHandle()
                    @scheme.apptitle = @currfile.basename
                    @notify __("File {0} opened", p)
            .catch (e) =>
                @error __("Problem read file {0}", e.toString()), e 
    
    save: () ->
        
        return unless @editorSession
        container = @canvas.odfContainer()
        return @error __("No document container found") unless container
        container.createByteArray (ba) =>
            # create blob
            @currfile.cache = new Blob [ba], { type: "application/vnd.oasis.opendocument.text" }
            @currfile.write "application/vnd.oasis.opendocument.text"
                .then (r) =>
                    @notify __("File {0} saved", @currfile.basename)
                    @scheme.apptitle = @currfile.basename
                    @currfile.dirty = false
                    @editorFocus()
                .catch (e) =>
                     @error __("Cannot save file: {0}", e.toString()), e
        , (err) =>
            @error __("Cannot create byte array from container: {0}", err.toString() || ""), err
    
    initToolbox: () ->
        
        @basictool =
            undo: @find("btundo"),
            redo: @find("btredo"),
            bold: @find("btbold"),
            italic:@find("btitalic"),
            underline:@find("btunderline"),
            strike: @find("btstrike"),
            note: @find("btnote"),
            link: @find("btlink"),
            unlink: @find("btunlink"),
            image:@find("btimage"),
            ac: @find("btac"),
            al: @find("btal"),
            ar: @find("btar"),
            aj: @find("btaj"),
            indent: @find("btindent"),
            outdent: @find("btoutdent"),
            fonts: @find("font-list"),
            fontsize: @find("font-size"),
            styles: @find("format-list"),
            zoom: @find("slzoom")
            format: @find("btformat")
        
        fn = (name, el) =>
            if name is "fonts" or name is "styles"
               act = "onlistselect"
            else if name is "fontsize" or name is "zoom"
                act = "onvaluechange"
            else
                act = "onbtclick"
            el[act] = (e) =>
                return unless @directFormattingCtl
                return unless @[name]
                @[name](e)
                @editorFocus()
        for name, el of @basictool
           fn name, el
        
        (@find "btzoomfix").onbtclick = (e) => @zoom { data: 100 }
        @basictool.zoom.onvaluechanging = (e) =>
            zlb = @find "lbzoom"
            zlb.text = Math.floor(e.data) + "%"
        
    initCanvas: () ->
        el = @find "odfcanvas"
        
        el.setAttribute "translate", "no"
        el.classList.add "notranslate"
        @canvas = new odf.OdfCanvas(el)
        @documentChanged = (e) =>
            return if @currfile.dirty
            @currfile.dirty = true
            @scheme.apptitle = @currfile.basename + "*"
            #console.log e
        @metaChanged = (e) =>
            return if @currfile.dirty
            @currfile.dirty = true
            @scheme.apptitle = @currfile.basename + "*"
            #console.log e
        @textStylingChanged = (e) =>
            @updateToolbar e
        @paragrahStyleChanged = (e) =>
            return unless e.type is "style"
            items = @basictool.styles.data
            item = i for v, i in items when v.name is e.styleName
            return unless item isnt undefined
            @currentStyle = e.styleName
            @basictool.styles.selected = item
        
        @styleAdded = (e) =>
            return unless e.family is 'paragraph'
            items = @basictool.styles.data
            item = v for v in items when v.name is e.name
            return if item
            stylens = "urn:oasis:names:tc:opendocument:xmlns:style:1.0"
            el = @editorSession.getParagraphStyleElement e.name
            dtext = el.getAttributeNS stylens, 'display-name'
            @basictool.styles.push { text: dtext , name: e.name }, true
            #@resource.formats.push {text: dtext, name:e.name}
        
        @updateSlider = (v) =>
            value = Math.floor v*100
            @basictool.zoom.value = value
            zlb = @find "lbzoom"
            zlb.text = value + "%"
        @canvas.enableAnnotations true, true
        @canvas.addListener "statereadychange", ()=>
            @session = new ops.Session(@canvas)
            viewOptions =
                editInfoMarkersInitiallyVisible: false,
                caretAvatarsInitiallyVisible: false,
                caretBlinksOnRangeSelect: true
            
            @editorSession = new OpenPage.EditorSession(@session,@userid, {
                viewOptions: viewOptions,
                directTextStylingEnabled: true,
                directParagraphStylingEnabled: true,
                paragraphStyleSelectingEnabled: true,
                paragraphStyleEditingEnabled: true,
                imageEditingEnabled: true,
                hyperlinkEditingEnabled: true,
                annotationsEnabled: true,
                zoomingEnabled: true,
                reviewModeEnabled: false
            })
            @initFontList @editorSession.getDeclaredFonts()
            @initStyles @editorSession.getAvailableParagraphStyles()
            #fix annotation problem on canvas
            #console.log $("office:body").css "background-color", "red"
            # basic format
            @directFormattingCtl = @editorSession.sessionController.getDirectFormattingController()
            @directFormattingCtl.subscribe gui.DirectFormattingController.textStylingChanged, @textStylingChanged
            @directFormattingCtl.subscribe gui.DirectFormattingController.paragraphStylingChanged, @textStylingChanged
            @editorSession.subscribe OpenPage.EditorSession.signalParagraphChanged, @paragrahStyleChanged
            
            # hyper link controller
            @hyperlinkController = @editorSession.sessionController.getHyperlinkController()
            @eventSubscriptions.addFrameSubscription @editorSession, OpenPage.EditorSession.signalCursorMoved, ()=> @updateHyperlinkButtons()
            @eventSubscriptions.addFrameSubscription @editorSession, OpenPage.EditorSession.signalParagraphChanged, ()=> @updateHyperlinkButtons()
            @eventSubscriptions.addFrameSubscription @editorSession, OpenPage.EditorSession.signalParagraphStyleModified, ()=> @updateHyperlinkButtons()
            
            #annotation controller
            @annotationController = @editorSession.sessionController.getAnnotationController()
            
            #image controller
            @imageController = @editorSession.sessionController.getImageController()
            #imageController.subscribe(gui.ImageController.enabledChanged, enableButtons)
            
            #text controller
            @textController = @editorSession.sessionController.getTextController()
            
            # zoom controller
            @zoomHelper = @editorSession.getOdfCanvas().getZoomHelper()
            @zoomHelper.subscribe gui.ZoomHelper.signalZoomChanged, @updateSlider
            @updateSlider @zoomHelper.getZoomLevel()
            
            # format controller 
            @editorSession.subscribe OpenPage.EditorSession.signalCommonStyleCreated, @styleAdded
            
            @editorSession.sessionController.setUndoManager new gui.TrivialUndoManager()
            @editorSession.sessionController.getUndoManager().subscribe gui.UndoManager.signalDocumentModifiedChanged, @documentChanged
            @editorSession.sessionController.getMetadataController().subscribe gui.MetadataController.signalMetadataChanged, @metaChanged
            op = new ops.OpAddMember()
            op.init {
                memberid: @userid,
                setProperties:{
                    "fullName": @userid,
                    "color": "blue"
                }
            }
            @session.enqueue([op])
            @editorSession.sessionController.insertLocalCursor()
            @editorSession.sessionController.startEditing()
            @fontsize {data: @basictool.fontsize.value}
            #console.log @editorSession.getDeclaredFonts()
            #
    
    initFontList: (list) ->
        v.text = v.name for v in list
        @resource.fonts = []
        @resource.fonts.push { text: v.text, name: v.family } for v in list
        @basictool.fonts.data = list
    
    initStyles: (list) ->
        list.unshift {name:"", displayName: 'Default style' }
        v.text = v.displayName for v in list
        @resource.formats.push { text: v.text, name: v.name } for v in list
        @basictool.styles.data = list
    
    updateToolbar: (changes) ->
        # basic style
        (@basictool.bold.selected = changes.isBold) if changes.hasOwnProperty 'isBold'
        (@basictool.italic.selected = changes.isItalic) if changes.hasOwnProperty 'isItalic'
        (@basictool.underline.selected = changes.hasUnderline) if changes.hasOwnProperty 'hasUnderline'
        (@basictool.strike.selected = changes.hasStrikeThrough) if changes.hasOwnProperty 'hasStrikeThrough'
        if changes.hasOwnProperty "fontSize"
            size = changes.fontSize
            size = 12 if size is undefined
            if  @basictool.fontsize.value isnt size
                @basictool.fontsize.value = size
            
        @selectFont changes.fontName if changes.hasOwnProperty "fontName"
        #pharagraph style
        @basictool.al.selected = changes.isAlignedLeft if changes.hasOwnProperty "isAlignedLeft"
        @basictool.ar.selected = changes.isAlignedRight if changes.hasOwnProperty "isAlignedRight"
        @basictool.ac.selected = changes.isAlignedCenter if changes.hasOwnProperty "isAlignedCenter"
        @basictool.aj.selected = changes.isAlignedJustified if changes.hasOwnProperty "isAlignedJustified"
    
    updateHyperlinkButtons: (e) ->
        selectedLinks = @editorSession.getSelectedHyperlinks()
        @basictool.unlink.enable = selectedLinks.length > 0
    
    selectFont: (name) ->
        items = @basictool.fonts.data
        item = i for v, i in items when v.name is name
        return unless item isnt undefined
        @basictool.fonts.selected = item
    
    editorFocus: () ->
        @editorSession.sessionController.getEventManager().focus()
        
    bold: (e) ->
        #console.log @, e
        @directFormattingCtl.setBold (not @basictool.bold.selected)
    
    italic: (e) ->
        @directFormattingCtl.setItalic (not @basictool.italic.selected)
    
    underline: (e) ->
        @directFormattingCtl.setHasUnderline (not @basictool.underline.selected)
    
    strike: (e) ->
        @directFormattingCtl.setHasStrikethrough (not @basictool.strike.selected)
    
    fonts: (e) ->
        @directFormattingCtl.setFontName e.data.item.data.name
    
    fontsize: (e) ->
        # present the value change from enter infinity loop
        @directFormattingCtl.setFontSize e.data
    
    al: (e) ->
        @directFormattingCtl.alignParagraphLeft()
    
    ar: (e) ->
        @directFormattingCtl.alignParagraphRight()
    
    ac: (e) ->
        @directFormattingCtl.alignParagraphCenter()
    
    note: (e) ->
        @annotationController.addAnnotation()
    
    aj: (e) ->
        @directFormattingCtl.alignParagraphJustified()
    
    indent: (e) ->
        @directFormattingCtl.indent()
    
    outdent: (e) ->
        @directFormattingCtl.outdent()
    
    link: (e) ->
        # get the link first
        
        textSerializer = new odf.TextSerializer()
        selection = @editorSession.getSelectedRange()
        linksInSelection = @editorSession.getSelectedHyperlinks()
        linkTarget = if linksInSelection[0] then odf.OdfUtils.getHyperlinkTarget(linksInSelection[0]) else "http://"
        data =
            link: linkTarget,
            text: "",
            readonly: true,
            action: "new"
        if selection and selection.collapsed and linksInSelection.length == 1
            # selection is collapsed within a single link
            # text in this case is read only
            data.text = textSerializer.writeToString linksInSelection[0]
            data.action = "edit"
        else if selection and !selection.collapsed
            # user select part of link or a block of text
            # user convert a selection to a link
            data.text = textSerializer.writeToString selection.cloneContents()
        else
            data.readonly = false
        @openDialog new HyperLinkDialog(), {title: "__(Insert/edit link)", data: data}
        .then (d) =>
            selectionController = @editorSession.sessionController.getSelectionController()
            if d.readonly
                # edit the existing link
                if d.action is "edit"
                    selectedLinkRange = selection.cloneRange()
                    selectedLinkRange.selectNode(linksInSelection[0])
                    selectionController.selectRange(selectedLinkRange, true)
                @hyperlinkController.removeHyperlinks()
                @hyperlinkController.addHyperlink d.link
            else
                @hyperlinkController.addHyperlink d.link, d.text
                linksInSelection = @editorSession.getSelectedHyperlinks()
                selectedLinkRange = selection.cloneRange()
                selectedLinkRange.selectNode(linksInSelection[0])
                selectionController.selectRange(selectedLinkRange, true)
    
    unlink: (e) ->
        @hyperlinkController.removeHyperlinks()
    
    undo: (e) ->
        @editorSession.undo()
    
    redo: (e) ->
        @editorSession.redo()
    
    pathAsDataURL: (p) ->
        return new Promise (resolve, error) =>
            fp = p.asFileHandle()
            fp.read("binary").then (data) =>
                blob = new Blob [data], { type: fp.info.mime }
                reader = new FileReader()
                reader.onloadend = () =>
                    return error(@throwe __("Unable to load file {0}", p)) if reader.readyState isnt 2
                    resolve {data: reader.result, fp: fp }
                reader.readAsDataURL blob
            .catch (e) => error __e e
                
            ###
            if not isText
                
            else
                fp.read (data) =>
                    # convert to base64
                    b64 = btoa data
                    dataurl = "data:#{fp.info.mime};base64," + b64
                    resolve { reader: {result: dataurl}, fp:fp }
            ###
    
    image: (e) ->
        
        @openDialog "FileDialog", { title: __("Select image file"), mimes: ["image/.*"] }
        .then (f) =>
            p = f.file.path
            @pathAsDataURL(p)
                .then (r) =>
                    hiddenImage = new Image()
                    hiddenImage.style.position = "absolute"
                    hiddenImage.style.left = "-99999px"
                    document.body.appendChild hiddenImage
                    hiddenImage.onload =  () =>
                        content = r.data.substring(r.data.indexOf(",") + 1)
                        #insert image
                        @textController.removeCurrentSelection()
                        @imageController.insertImage r.fp.info.mime, content, hiddenImage.width, hiddenImage.height
                        document.body.removeChild hiddenImage
                    hiddenImage.src = r.data
                .catch (e) =>
                    @error __("Couldnt load image {0}", p), e
    
    styles: (e) ->
        return if e.data.item.data.name is @currentStyle
        @editorSession.setCurrentParagraphStyle e.data.item.data.name
    
    zoom: (e) ->
        #console.log "zooming", e
        return unless @zoomHelper
        @zoomHelper.setZoomLevel e.data/100.0
    
    format: (e) ->
        @openDialog new FormatDialog(), { title: __("Add/Modify paragraph format"), data: @resource }
        .then (d) =>
                return
    
    closeDocument: (f) ->
        # finish editing
        return unless @editorSession and @session
        
        @eventSubscriptions.unsubscribeAll()
        @editorSession.sessionController.endEditing()
        @editorSession.sessionController.removeLocalCursor()
        # remove user
        op = new ops.OpRemoveMember()
        op.init {
            memberid: @userid
        }
        @session.enqueue [op]
        # close the session
        @session.close (e) =>
            return @error __("Cannot close session {0}", e.toString()), e if e
            @editorSession.sessionController.getMetadataController().unsubscribe gui.MetadataController.signalMetadataChanged, @metaChanged
            @editorSession.sessionController.getUndoManager().unsubscribe gui.UndoManager.signalDocumentModifiedChanged, @documentChanged
            @directFormattingCtl.unsubscribe gui.DirectFormattingController.textStylingChanged, @textStylingChanged
            @directFormattingCtl.unsubscribe gui.DirectFormattingController.paragraphStylingChanged, @textStylingChanged
            @editorSession.unsubscribe OpenPage.EditorSession.signalParagraphChanged, @paragrahStyleChanged
            @zoomHelper.unsubscribe gui.ZoomHelper.signalZoomChanged, @updateSlider
            @editorSession.unsubscribe OpenPage.EditorSession.signalCommonStyleCreated, @styleAdded
            # destry editorSession
            @editorSession.destroy (e) =>
                return @error __("Cannot destroy editor session {0}", e.toString()), e if e
                @editorSession = undefined
                # destroy session
                @session.destroy (e) =>
                    return @error __("Cannot destroy document session {0}", e.toString()), e if e
                    core.Async.destroyAll [@canvas.destroy], (e) =>
                        return @error __("Cannot destroy canvas {0}", e.toString()), e if e
                        @notify "Document closed"
                        f() if f
                    @session = undefined
                    @annotationController = undefined
                    @directFormattingCtl = undefined
                    @textController = undefined
                    @imageController = undefined
                    @ZoomHelper = undefined
                    @metaChanged = undefined
                    @documentChanged = undefined
                    @textStylingChanged = undefined
                    @paragrahStyleChanged = undefined
                    @updateSlider = undefined
                    @styleAdded = undefined
                    @basictool.fonts.selected = -1
                    @basictool.styles.selected = -1
                    
                    #
            
    
    cleanup: (e) ->
        
        if @editorSession
            e.preventDefault()
            @closeDocument ()=>
                @quit()

this.OS.register "OpenPage", OpenPage