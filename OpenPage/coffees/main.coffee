class OpenPage extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "OpenPage", args
    
    main: () ->
        el = @find "odfcanvas"
        me = @
        el.setAttribute "translate", "no"
        el.classList.add "notranslate"
        @eventNotifier = new core.EventNotifier [
            "unknown-error",
            "documentModifiedChanged",
            "metadataChanged"
        ]
        userid = "localuser"
        require ["webodf/editor/EditorSession"], (ES) ->
            OpenPage.EditorSession = ES
        @canvas = new odf.OdfCanvas(el)
        #@canvas.enableAnnotations(true, true)
        @canvas.addListener "statereadychange", ()->
            me.session = new ops.Session(me.canvas)
            viewOptions =
                editInfoMarkersInitiallyVisible: false,
                caretAvatarsInitiallyVisible: false,
                caretBlinksOnRangeSelect: true
            
            me.editorSession = new OpenPage.EditorSession(me.session,userid, {
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
            me.editorSession.sessionController.setUndoManager new gui.TrivialUndoManager()
            me.editorSession.sessionController.getUndoManager().subscribe gui.UndoManager.signalDocumentModifiedChanged, (mod) ->
                me.eventNotifier.emit "documentModifiedChanged", mod
            me.editorSession.sessionController.getMetadataController().subscribe gui.MetadataController.signalMetadataChanged, (changes) ->
                me.eventNotifier.emit "metadataChanged", changes
            op = new ops.OpAddMember()
            op.init {
                memberid: userid,
                setProperties:{
                    "fullName": "Xuan Sang LE",
                    "color": "blue"
                }
            }
            me.session.enqueue([op])
            me.editorSession.sessionController.insertLocalCursor()
            me.editorSession.sessionController.startEditing()
            me.editorSession.sessionController.getEventManager().focus()
        @canvas.load "#{@_api.handler.get}/home://Downloads/welcome.odt"
        @eventNotifier.subscribe "documentModifiedChanged", (d) ->
            console.log "document is modified"
        
this.OS.register "OpenPage", OpenPage