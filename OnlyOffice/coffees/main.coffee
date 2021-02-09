class OnlyOffice extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "OnlyOffice", args
        @eid = "id#{Math.random().toString(36).replace(".","")}"
    
    main: () ->
        @currfile = undefined
        if @args and @args.length > 0
            @currfile =  @args[0].path.asFileHandle()
        @placeholder = @find "editor-area"
        @placeholder.id = @eid
        
        @find("btn-open-file").onbtclick = (e) =>
            @openFile()
        
        @find("btn-new-doc").onbtclick = (e) =>
            @create("word")
        
        @find("btn-new-cell").onbtclick = (e) =>
            @create("sheet")
        
        @find("btn-new-slide").onbtclick = (e) =>
            @create("slide")
            
        @open() if @currfile
    
    
    create: (type) ->
        ext = undefined
        ext = "docx" if type is "word"
        ext = "xlsx" if type is "sheet"
        ext = "pptx" if type is "slide"
        return @error __("Unkown file type") unless ext
        @openDialog "FileDialog", {
            title: __("Save file as"),
            type: "dir",
            file: "home://Untitled.#{ext}".asFileHandle()
        }
        .then (d) =>
            file = "#{d.file.path}/#{d.name}".asFileHandle()
            # copy file to destination
            model = "#{@path()}/templates/model.#{ext}".asFileHandle()
            model
                .read("binary")
                .then (d) =>
                    blob = new Blob([d], {
                        type: model.info.mime,
                    })
                    file.cache = blob
                    file
                        .write(model.info.mime)
                        .then (r) =>
                            file.cache = undefined
                            @currfile = file
                            @open()
                        .catch (e) =>
                            @error e.toString(), e
                .catch (err) =>
                    @error err.toString(), err
    
    openFile: () ->
        @openDialog "FileDialog", {
            title: __("Open file"),
            type: "file",
            mimes: @meta().mimes
        }
        .then (f, name) =>
            @currfile = f.file.path.asFileHandle()
            @open()
    
    open: () ->
        return unless @currfile
        @exec("token", {file: @currfile.path})
            .then (d) =>
                return @error d.error if d.error
                @access_token = d.result
                @currfile.onready()
                .then (meta) =>
                    @scheme.apptitle = @currfile.path
                    $(@placeholder).empty()
                    @editor.destroyEditor() if @editor
                    @editor = new DocsAPI.DocEditor(@eid, {
                        events: {
                            onRequestCreateNew: () => @newDocument(),
                            onRequestSaveAs: (e) => @saveAs(e)
                        },
                        document: {
                            fileType: @currfile.ext,
                            key: meta.mtime.hash().toString(),
                            title: @currfile.filename,
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
        return unless e.data.url
        rfile = e.data.url.asFileHandle()
        @openDialog "FileDialog", {
            title: __("Save file as"),
            type: "dir",
            file: "home://#{e.data.title}".asFileHandle()
        }
        .then (d) =>
            file = "#{d.file.path}/#{d.name}"
            # copy file to destination
            @exec("duplicate", {
                remote: e.data.url,
                as: file
            }).then (r) =>
                return @error r.error if r.error
                @currfile = file.asFileHandle()
                @open()
            .catch (e) =>
                @error e.toString(), e
    
    newDocument: () ->
        @openDialog "SelectionDialog", {
            title: __("Create new"),
            data:[
                {
                    text: __("Open a file"),
                    iconclass: "fa fa-folder-open",
                    type: "open"
                },
                {
                    text: __("Document"),
                    iconclass: "fa  fa-file-word-o",
                    type: "word"
                },
                {
                    text: __("Spreadsheet"),
                    iconclass: "fa  fa-file-excel-o",
                    type: "sheet"
                },
                {
                    text: __("Presentation"),
                    iconclass: "fa  fa-file-powerpoint-o",
                    type: "slide"
                },
            ]
        }
        .then (d) =>
            switch d.type
                when "open"
                    @openFile()
                else
                    @create(d.type)

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