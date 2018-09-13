class OpenPage extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "OpenPage", args
    
    main: () ->
        # load session class
        if not OpenPage.EditorSession
            require ["webodf/editor/EditorSession"], (ES) ->
                OpenPage.EditorSession = ES
        @eventSubscriptions = new core.EventSubscriptions()
        @initToolbox()
        @initCanvas()
        @canvas.load "#{@_api.handler.get}/home://welcome.odt"
    
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
            fontsize: @find("font-size")
        fn = (name, el) ->
            if name is "fonts"
               act = "onlistselect"
            else if name is "fontsize"
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
        
    initCanvas: () ->
        el = @find "odfcanvas"
        me = @
        el.setAttribute "translate", "no"
        el.classList.add "notranslate"
        @userid = "localuser"
        @canvas = new odf.OdfCanvas(el)
        @documentChanged = (e) ->
            #console.log e
        @metaChanged = (e) ->
            #console.log e
        @textStylingChanged = (e) ->
            me.updateToolbar e
        #@canvas.enableAnnotations(true, true)
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
            # basic format
            me.directFormattingCtl = me.editorSession.sessionController.getDirectFormattingController()
            me.directFormattingCtl.subscribe gui.DirectFormattingController.textStylingChanged, me.textStylingChanged
            me.directFormattingCtl.subscribe gui.DirectFormattingController.paragraphStylingChanged, me.textStylingChanged
            # hyper link controller
            me.hyperlinkController = me.editorSession.sessionController.getHyperlinkController()
            me.eventSubscriptions.addFrameSubscription me.editorSession, OpenPage.EditorSession.signalCursorMoved, ()-> me.updateHyperlinkButtons()
            me.eventSubscriptions.addFrameSubscription me.editorSession, OpenPage.EditorSession.signalParagraphChanged, ()-> me.updateHyperlinkButtons()
            me.eventSubscriptions.addFrameSubscription me.editorSession, OpenPage.EditorSession.signalParagraphStyleModified, ()-> me.updateHyperlinkButtons()
            
            #image controller
            me.imageController = me.editorSession.sessionController.getImageController()
            #imageController.subscribe(gui.ImageController.enabledChanged, enableButtons)
            
            #text controller
            me.textController = me.editorSession.sessionController.getTextController()
            
            me.editorSession.sessionController.setUndoManager new gui.TrivialUndoManager()
            me.editorSession.sessionController.getUndoManager().subscribe gui.UndoManager.signalDocumentModifiedChanged, me.documentChanged
            me.editorSession.sessionController.getMetadataController().subscribe gui.MetadataController.signalMetadataChanged, me.metaChanged
            op = new ops.OpAddMember()
            op.init {
                memberid: me.userid,
                setProperties:{
                    "fullName": "Xuan Sang LE",
                    "color": "blue"
                }
            }
            me.session.enqueue([op])
            me.initFontList me.editorSession.getDeclaredFonts()
            me.editorSession.sessionController.insertLocalCursor()
            me.editorSession.sessionController.startEditing()
            #console.log me.editorSession.getDeclaredFonts()
            #
    
    initFontList: (list) ->
        v.text = v.name for v in list
        @basictool.fonts.set "items", list
    
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
    
    image: (e) ->
        me = @
        @openDialog "FileDiaLog", (d, n, p) ->
            fp = p.asFileHandler()
            fp.asFileHandler().read (data) ->
                blob = new Blob [data], { type: fp.info.mime }
                reader = new FileReader()
                reader.onloadend = () ->
                    return me.error __("Couldnt load image {0}", p) if reader.readyState isnt 2
                    # insert the image to document
                    hiddenImage = new Image()
                    hiddenImage.style.position = "absolute"
                    hiddenImage.style.left = "-99999px"
                    document.body.appendChild hiddenImage
                    hiddenImage.onload =  () ->
                        content = reader.result.substring(reader.result.indexOf(",") + 1)
                        #insert image
                        me.textController.removeCurrentSelection()
                        me.imageController.insertImage fp.info.mime, content, hiddenImage.width, hiddenImage.height
                        document.body.removeChild hiddenImage
                    hiddenImage.src = reader.result
                
                reader.readAsDataURL blob
            , "binary"
        , __("Select image file"), { mimes: ["image/.*"] }
    
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
                    me.directFormattingCtl = undefined
                    me.textController = undefined
                    me.imageController = undefined
                    #
            
    
    cleanup: (e) ->
        @closeDocument()

this.OS.register "OpenPage", OpenPage