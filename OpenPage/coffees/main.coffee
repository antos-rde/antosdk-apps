class OpenPage extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "OpenPage", args
    
    main: () ->
        # load session class
        #if not OpenPage.EditorSession
        #    require ["webodf/editor/EditorSession"], (ES) ->
        #        OpenPage.EditorSession = ES
        me =@
        @eventSubscriptions = new core.EventSubscriptions()
        @initToolbox()
        @userid = "#{@systemsetting.user.username}@#{@pid}"
        #file = "home://welcome.odt"
        #file = "#{@_api.handler.get}/home://welcome.odt"
        #@canvas.load file
        #odfContainer = new odf.OdfContainer file, (c) ->
        #    me.canvas.setOdfContainer c, false
        @currentStyle = ""
        if @args and @args.length > 0 then @open @args[0] else @newdoc()
        @resource =
            fonts: []
            formats: []
        @bindKey "ALT-N", () -> me.actionFile "#{me.name}-New"
        @bindKey "ALT-O", () -> me.actionFile "#{me.name}-Open"
        @bindKey "CTRL-S", () -> me.actionFile "#{me.name}-Save"
        @bindKey "ALT-W", () -> me.actionFile "#{me.name}-Saveas"
        
    
    menu: () ->
        me = @
        menu = [{
                text: "__(File)",
                child: [
                    { text: "__(New)", dataid: "#{@name}-New", shortcut: "A-N" },
                    { text: "__(Open)", dataid: "#{@name}-Open", shortcut: "A-O" },
                    { text: "__(Save)", dataid: "#{@name}-Save", shortcut: "C-S" },
                    { text: "__(Save as)", dataid: "#{@name}-Saveas", shortcut: "A-W" }
                ],
                onmenuselect: (e) -> me.actionFile e.item.data.dataid
            }]
        menu
    
    actionFile: (e) ->
        me = @
        saveas = () ->
            me.openDialog "FileDiaLog", (d, n, p) ->
                me.currfile.setPath "#{d}#{n}"
                me.save()
            , __("Save as"), { file: me.currfile }
        switch e
            when "#{@name}-Open"
                @openDialog "FileDiaLog", ( d, f , p) ->
                    me.open p
                , __("Open file"), { mimes: me.meta().mimes }
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
        me = @
        
        @pathAsDataURL(p)
            .then (r) ->
                me.closeDocument() if me.editorSession
                me.initCanvas()
                OdfContainer = new odf.OdfContainer r.reader.result, (c) ->
                    me.canvas.setOdfContainer c, false
                    return me.currfile  = "Untitled".asFileHandler() if b
                    me.currfile.setPath p
                    me.scheme.set "apptitle", me.currfile.basename
                    me.notify __("File {0} opened", p)
            .catch (e) ->
                me.error __("Problem read file {0}", e) 
    
    save: () ->
        me = @
        return unless @editorSession
        container = @canvas.odfContainer()
        return @error __("No document container found") unless container
        container.createByteArray (ba) ->
            # create blob
            me.currfile.cache = new Blob [ba], { type: "application/vnd.oasis.opendocument.text" }
            me.currfile.write "application/vnd.oasis.opendocument.text", (r) ->
                return me.error __("Cannot save file: {0}", r.error) if r.error
                me.notify __("File {0} saved", me.currfile.basename)
                me.scheme.set "apptitle", me.currfile.basename
                me.currfile.dirty = false
        , (err) ->
            @error __("Cannot create byte array from container: {0}", err|| "")
    
    initToolbox: () ->
        me = @
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
        
        fn = (name, el) ->
            if name is "fonts" or name is "styles"
               act = "onlistselect"
            else if name is "fontsize" or name is "zoom"
                act = "onchange"
            else
                act = "onbtclick"
            el.set act, (e) ->
                return unless me.directFormattingCtl
                return unless me[name]
                me[name](e)
                me.editorFocus()
        for name, el of @basictool
           fn name, el
        
        (@find "btzoomfix").set "onbtclick", (e) -> me.zoom 100
        @basictool.zoom.set "onchanging", (e) ->
            zlb = me.find "lbzoom"
            zlb.set "text", Math.floor(e) + "%"
        
    initCanvas: () ->
        el = @find "odfcanvas"
        me = @
        el.setAttribute "translate", "no"
        el.classList.add "notranslate"
        @canvas = new odf.OdfCanvas(el)
        @documentChanged = (e) ->
            return if me.currfile.dirty
            me.currfile.dirty = true
            me.scheme.set "apptitle", me.currfile.basename + "*"
            #console.log e
        @metaChanged = (e) ->
            return if me.currfile.dirty
            me.currfile.dirty = true
            me.scheme.set "apptitle", me.currfile.basename + "*"
            #console.log e
        @textStylingChanged = (e) ->
            me.updateToolbar e
        @paragrahStyleChanged = (e) ->
            return unless e.type is "style"
            items = me.basictool.styles.get "items"
            item = i for v, i in items when v.name is e.styleName
            me.currentStyle = e.styleName
            me.basictool.styles.set "selected", item
        
        @styleAdded = (e) ->
            return unless e.family is 'paragraph'
            items = me.basictool.styles.get "items"
            item = v for v in items when v.name is e.name
            return if item
            stylens = "urn:oasis:names:tc:opendocument:xmlns:style:1.0"
            el = me.editorSession.getParagraphStyleElement e.name
            dtext = el.getAttributeNS stylens, 'display-name'
            me.basictool.styles.push { text: dtext , name: e.name }, true
            #me.resource.formats.push {text: dtext, name:e.name}
        
        @updateSlider = (v) ->
            value = Math.floor v*100
            me.basictool.zoom.set "value", value
            zlb = me.find "lbzoom"
            zlb.set "text", value+"%"
        #me.canvas.enableAnnotations true, true
        @canvas.addListener "statereadychange", ()->
            me.session = new ops.Session(me.canvas)
            viewOptions =
                editInfoMarkersInitiallyVisible: false,
                caretAvatarsInitiallyVisible: false,
                caretBlinksOnRangeSelect: true
            
            me.editorSession = new OpenPage.EditorSession(me.session,me.userid, {
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
            me.initFontList me.editorSession.getDeclaredFonts()
            me.initStyles me.editorSession.getAvailableParagraphStyles()
            #fix annotation problem on canvas
            #console.log $("office:body").css "background-color", "red"
            # basic format
            me.directFormattingCtl = me.editorSession.sessionController.getDirectFormattingController()
            me.directFormattingCtl.subscribe gui.DirectFormattingController.textStylingChanged, me.textStylingChanged
            me.directFormattingCtl.subscribe gui.DirectFormattingController.paragraphStylingChanged, me.textStylingChanged
            me.editorSession.subscribe OpenPage.EditorSession.signalParagraphChanged, me.paragrahStyleChanged
            
            # hyper link controller
            me.hyperlinkController = me.editorSession.sessionController.getHyperlinkController()
            me.eventSubscriptions.addFrameSubscription me.editorSession, OpenPage.EditorSession.signalCursorMoved, ()-> me.updateHyperlinkButtons()
            me.eventSubscriptions.addFrameSubscription me.editorSession, OpenPage.EditorSession.signalParagraphChanged, ()-> me.updateHyperlinkButtons()
            me.eventSubscriptions.addFrameSubscription me.editorSession, OpenPage.EditorSession.signalParagraphStyleModified, ()-> me.updateHyperlinkButtons()
            
            #annotation controller
            me.annotationController = me.editorSession.sessionController.getAnnotationController()
            
            #image controller
            me.imageController = me.editorSession.sessionController.getImageController()
            #imageController.subscribe(gui.ImageController.enabledChanged, enableButtons)
            
            #text controller
            me.textController = me.editorSession.sessionController.getTextController()
            
            # zoom controller
            me.zoomHelper = me.editorSession.getOdfCanvas().getZoomHelper()
            me.zoomHelper.subscribe gui.ZoomHelper.signalZoomChanged, me.updateSlider
            me.updateSlider me.zoomHelper.getZoomLevel()
            
            # format controller 
            me.editorSession.subscribe OpenPage.EditorSession.signalCommonStyleCreated, me.styleAdded
            
            me.editorSession.sessionController.setUndoManager new gui.TrivialUndoManager()
            me.editorSession.sessionController.getUndoManager().subscribe gui.UndoManager.signalDocumentModifiedChanged, me.documentChanged
            me.editorSession.sessionController.getMetadataController().subscribe gui.MetadataController.signalMetadataChanged, me.metaChanged
            op = new ops.OpAddMember()
            op.init {
                memberid: me.userid,
                setProperties:{
                    "fullName": me.userid,
                    "color": "blue"
                }
            }
            me.session.enqueue([op])
            me.editorSession.sessionController.insertLocalCursor()
            me.editorSession.sessionController.startEditing()
            #console.log me.editorSession.getDeclaredFonts()
            #
    
    initFontList: (list) ->
        v.text = v.name for v in list
        @resource.fonts.push { text: v.text, name: v.family } for v in list
        @basictool.fonts.set "items", list
    
    initStyles: (list) ->
        list.unshift {name:"", displayName: 'Default style' }
        v.text = v.displayName for v in list
        @resource.formats.push { text: v.text, name: v.name } for v in list
        @basictool.styles.set "items", list
    
    updateToolbar: (changes) ->
        # basic style
        (@basictool.bold.set "selected", changes.isBold) if changes.hasOwnProperty 'isBold'
        (@basictool.italic.set "selected", changes.isItalic) if changes.hasOwnProperty 'isItalic'
        (@basictool.underline.set "selected", changes.hasUnderline) if changes.hasOwnProperty 'hasUnderline'
        (@basictool.strike.set "selected", changes.hasStrikeThrough) if changes.hasOwnProperty 'hasStrikeThrough'
        (@basictool.fontsize.set "value", changes.fontSize) if changes.hasOwnProperty "fontSize"
        @selectFont changes.fontName if changes.hasOwnProperty "fontName"
        #pharagraph style
        @basictool.al.set "selected", changes.isAlignedLeft if changes.hasOwnProperty "isAlignedLeft"
        @basictool.ar.set "selected", changes.isAlignedRight if changes.hasOwnProperty "isAlignedRight"
        @basictool.ac.set "selected", changes.isAlignedCenter if changes.hasOwnProperty "isAlignedCenter"
        @basictool.aj.set "selected", changes.isAlignedJustified if changes.hasOwnProperty "isAlignedJustified"
    
    updateHyperlinkButtons: (e) ->
        selectedLinks = @editorSession.getSelectedHyperlinks()
        @basictool.unlink.set "enable", selectedLinks.length > 0
    
    selectFont: (name) ->
        items = @basictool.fonts.get "items"
        item = i for v, i in items when v.name is name
        @basictool.fonts.set "selected", item
    
    editorFocus: () ->
        @editorSession.sessionController.getEventManager().focus()
        
    bold: (e) ->
        #console.log @, e
        @directFormattingCtl.setBold (not @basictool.bold.get "selected")
    
    italic: (e) ->
        @directFormattingCtl.setItalic (not @basictool.italic.get "selected")
    
    underline: (e) ->
        @directFormattingCtl.setHasUnderline (not @basictool.underline.get "selected")
    
    strike: (e) ->
        @directFormattingCtl.setHasStrikethrough (not @basictool.strike.get "selected")
    
    fonts: (e) ->
        @directFormattingCtl.setFontName e.data.name
    
    fontsize: (e) ->
        @directFormattingCtl.setFontSize e
    
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
        me = @
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
        @openDialog new HyperLinkDialog(), (d) ->
            selectionController = me.editorSession.sessionController.getSelectionController()
            if d.readonly
                # edit the existing link
                if d.action is "edit"
                    selectedLinkRange = selection.cloneRange()
                    selectedLinkRange.selectNode(linksInSelection[0])
                    selectionController.selectRange(selectedLinkRange, true)
                me.hyperlinkController.removeHyperlinks()
                me.hyperlinkController.addHyperlink d.link
            else
                me.hyperlinkController.addHyperlink d.link, d.text
                linksInSelection = me.editorSession.getSelectedHyperlinks()
                selectedLinkRange = selection.cloneRange()
                selectedLinkRange.selectNode(linksInSelection[0])
                selectionController.selectRange(selectedLinkRange, true)
        , "__(Insert/edit link)", data
    
    unlink: (e) ->
        @hyperlinkController.removeHyperlinks()
    
    undo: (e) ->
        @editorSession.undo()
    
    redo: (e) ->
        @editorSession.redo()
    
    pathAsDataURL: (p) ->
        return new Promise (resolve, error) ->
            fp = p.asFileHandler()
            fp.read (data) ->
                blob = new Blob [data], { type: fp.info.mime }
                reader = new FileReader()
                reader.onloadend = () ->
                    return error(p) if reader.readyState isnt 2
                    resolve {reader: reader, fp: fp }
                reader.readAsDataURL blob
            , "binary"
        
    
    image: (e) ->
        me = @
        @openDialog "FileDiaLog", (d, n, p) ->
            me.pathAsDataURL(p)
                .then (r) ->
                    hiddenImage = new Image()
                    hiddenImage.style.position = "absolute"
                    hiddenImage.style.left = "-99999px"
                    document.body.appendChild hiddenImage
                    hiddenImage.onload =  () ->
                        content = r.reader.result.substring(r.reader.result.indexOf(",") + 1)
                        #insert image
                        me.textController.removeCurrentSelection()
                        me.imageController.insertImage r.fp.info.mime, content, hiddenImage.width, hiddenImage.height
                        document.body.removeChild hiddenImage
                    hiddenImage.src = r.reader.result
                .catch () ->
                    me.error __("Couldnt load image {0}", p)
        , __("Select image file"), { mimes: ["image/.*"] }
    
    styles: (e) ->
        return if e.data.name is @currentStyle
        @editorSession.setCurrentParagraphStyle e.data.name
    
    zoom: (e) ->
        #console.log "zooming", e
        return unless @zoomHelper
        @zoomHelper.setZoomLevel e/100.0
    
    format: (e) ->
        @openDialog new FormatDialog(), (d) ->
                return
        , __("Add/Modify paragraph format"), @resource
    
    closeDocument: () ->
        # finish editing
        return unless @editorSession and @session
        me = @
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
        @session.close (e) ->
            return me.error __("Cannot close session {0}", e) if e
            me.editorSession.sessionController.getMetadataController().unsubscribe gui.MetadataController.signalMetadataChanged, me.metaChanged
            me.editorSession.sessionController.getUndoManager().unsubscribe gui.UndoManager.signalDocumentModifiedChanged, me.documentChanged
            me.directFormattingCtl.unsubscribe gui.DirectFormattingController.textStylingChanged, me.textStylingChanged
            me.directFormattingCtl.unsubscribe gui.DirectFormattingController.paragraphStylingChanged, me.textStylingChanged
            me.editorSession.unsubscribe OpenPage.EditorSession.signalParagraphChanged, me.paragrahStyleChanged
            me.zoomHelper.unsubscribe gui.ZoomHelper.signalZoomChanged, me.updateSlider
            me.editorSession.unsubscribe OpenPage.EditorSession.signalCommonStyleCreated, me.styleAdded
            # destry editorSession
            me.editorSession.destroy (e) ->
                return me.error __("Cannot destroy editor session {0}", e) if e
                me.editorSession = undefined
                # destroy session
                me.session.destroy (e) ->
                    return me.error __("Cannot destroy document session {0}", e) if e
                    core.Async.destroyAll [me.canvas.destroy], (e) ->
                        return me.error __("Cannot destroy canvas {0}", e) if e
                        me.notify "Document closed"
                    me.session = undefined
                    me.annotationController = undefined
                    me.directFormattingCtl = undefined
                    me.textController = undefined
                    me.imageController = undefined
                    me.ZoomHelper = undefined
                    me.metaChanged = undefined
                    me.documentChanged = undefined
                    me.textStylingChanged = undefined
                    me.paragrahStyleChanged = undefined
                    me.updateSlider = undefined
                    me.styleAdded = undefined
                    me.basictool.fonts.set "selected", -1
                    me.basictool.styles.set "selected", -1
                    #
            
    
    cleanup: (e) ->
        @closeDocument()

this.OS.register "OpenPage", OpenPage