class ImageEditor extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "ImageEditor", args
        @currfile = undefined
        @currfile = args[0].path.asFileHandle() if @args and @args.length > 0 and @args[0].path
    
    main: () ->
        @stage = @find("stage")
        @stage.id = @eid
        img_data = {
            path: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            name: 'Blank'
        }
        
        if @currfile
            img_data = {
                path: @currfile.getlink(),
                name: @currfile.filename
            }
            @scheme.apptitle = @currfile.path
        
        
        @editor = new tui.ImageEditor(@stage, {
            cssMaxWidth: 700, 
            cssMaxHeight: 500,
            usageStatistics: false,
            includeUI: {
            initMenu: 'filter',
            menuBarPosition: 'bottom',
            loadImage: img_data

            },
        })
        @on "resize", () =>
            @editor.ui.resizeEditor()
        @editor.ui.resizeEditor()
        
        @bindKey "ALT-O", () => @actionFile "open"
        @bindKey "CTRL-S", () => @actionFile "save"
        @bindKey "ALT-W", () => @actionFile "saveas"
    
    open: () ->
        return unless @currfile
        @editor.loadImageFromURL(@currfile.getlink(), @currfile.filename)
        .then (r) =>
            @scheme.apptitle = @currfile.path
            @editor.ui.resizeEditor {
                imageSize: {
                    oldWidth: r.oldWidth,
                    oldHeight: r.oldHeight,
                    newWidth: r.newWidth,
                    newHeight: r.newHeight
                },
            }
    
    save: () ->
        return unless @currfile
        @currfile.cache = @editor.toDataURL()
        @currfile.write "base64"
        .then (d) =>
                return @error __("Error saving file {0}: {1}", @currfile.basename, d.error) if d.error
                @notify __("File saved: {0}", @currfile.path)
            .catch (e) => @error __("Unable to save file: {0}", @currfile.path), e
    
    cleanup: () ->
        @editor.destroy() if @editor
    
    menu: () ->
        menu = [{
                text: "__(File)",
                nodes: [
                    { text: "__(Open)", dataid: "open", shortcut: "A-O" },
                    { text: "__(Save)", dataid: "save", shortcut: "C-S" },
                    { text: "__(Save as)", dataid: "saveas", shortcut: "A-W" }
                ],
                onchildselect: (e) => @actionFile e.data.item.data.dataid
            }]
        menu

    actionFile: (e) ->
        switch e
            when "open"
                @openDialog("FileDialog", {
                    title: __("Open file"),
                    mimes: ["image/.*"]
                })
                .then (f) =>
                    @currfile = f.file.path.asFileHandle()
                    @open()

            when "save"
                return @save()
                
            when "saveas"
                @openDialog("FileDialog", {
                    title: __("Save as"),
                    file: @currfile
                })
                .then (f) =>
                    d = f.file.path.asFileHandle()
                    d = d.parent() if f.file.type is "file"
                    @currfile = "#{d.path}/#{f.name}".asFileHandle()
                    @save()
                
ImageEditor.dependencies = [
    "pkg://libfabric/main.js",
    "pkg://ImageEditor/tui-image-ed-bundle.min.js"
]

this.OS.register "ImageEditor", ImageEditor