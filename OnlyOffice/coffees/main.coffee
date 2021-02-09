class OnlyOffice extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "OnlyOffice", args
        @eid = "id#{Math.random().toString(36).replace(".","")}"
    
    main: () ->
        @currfile = undefined
        if @args and @args.length > 0
            @currfile =  @args[0].path.asFileHandle()
        placeholder = @find "editor-area"
        placeholder.id = @eid
        @open() if @currfile
    
    open: () ->
        return unless @currfile
        console.log @currfile
        @exec("token", {file: @currfile.path})
            .then (d) =>
                return @error d.error if d.error
                @access_token = d.result
                @currfile.onready()
                .then (meta) =>
                    #@scheme.apptitle = @currfile.path
                    @editor.destroyEditor() if @editor
                    @editor = new DocsAPI.DocEditor(@eid, {
                        events: {
                            onRequestCreateNew: () => @newDocument(),
                            onRequestSaveAs: (e) => console.log e
                        },
                        document: {
                            fileType: @currfile.ext,
                            key: meta.mtime.hash().toString(),
                            title: @currfile.path,
                            url: @currfile.getlink() + "?" + @access_token
                        },
                        documentType: @getDocType(@currfile.ext),
                        editorConfig: {
                            user: {
                                id: @systemsetting.user.id.toString(),
                                name: @systemsetting.user.username
                            },
                            customization: {
                                compactHeader: false,
                                #autosave: false,
                                #forcesave: true
                            },
                            callbackUrl: @uapi("save")
                        }
                    });
            .catch (e) =>
                @error e.toString(), e
    
    getDocType: (ext) ->
        return "word" if "doc,docx,epub,odt".split(",").includes(ext)
        return "cell" if "csv,ods,xls,xlsx".split(",").includes(ext)
        return "slide" if "odp,ppt,pptx".split(",").includes(ext)
        return "none"
    
    saveAs: (e) ->
        console.log e
    
    newDocument: () ->
        console.log("create document")
        @error __("Unable to create document")

    uapi: (action) ->
        return "#{@_api.REST}/system/apigateway?ws=0&path=#{@path()}/api.lua&action=#{action}&file=#{@currfile.path}&#{@access_token}"
        
    exec: (action, args) ->
        cmd  = 
            path: "#{@path()}/api.lua",
            parameters:
                action: action,
                args: args
        return @call(cmd)
    cleanup: () ->
        @editor.destroyEditor() if @editor
        @editor = undefined

OnlyOffice.dependencies = [
    "https://office.iohub.dev/web-apps/apps/api/documents/api.js"
]

this.OS.register "OnlyOffice", OnlyOffice
this.extensionParams = {
    url: "https://office.iohub.dev/web-apps/"
}