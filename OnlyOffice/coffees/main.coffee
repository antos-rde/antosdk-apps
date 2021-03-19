class OnlyOffice extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "OnlyOffice", args
        @eid = "id#{Math.random().toString(36).replace(".","")}"
    
    main: () ->
        @isActive = false
        @currfile = undefined
        @iframe = undefined
        if @args and @args.length > 0
            @currfile =  @args[0].path.asFileHandle()
        @placeholder = @find "editor-area"
        @placeholder.id = @eid
        
        @on "focus", (e) =>
            @isActive = true
            if @iframe
                el = $("#id_viewer_overlay", @iframe)
                el = $("#ws-canvas-graphic-overlay", @iframe) if el.length is 0
                el.trigger("click") if el.length > 0
                
        @on "blur", (e) => @isActive = false
        
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
    
    editorReady: () ->
        @iframe = $('iframe[name="frameEditor"]', @scheme).contents()[0]
        return unless @iframe
        $(@iframe).on "mousedown, mouseup, click", (e) =>
            return if @isActive
            @trigger "focus"
    
    open: () ->
        return unless @currfile
        @iframe = undefined
        @history = undefined
        @exec("token", {file: @currfile.path})
            .then (d) =>
                return @error d.error if d.error
                @access_token = d.result.sid
                @currfile.onready()
                .then (meta) =>
                    #key = "#{@systemsetting.user.username}:#{@currfile.path}:#{meta.mtime}"
                    #key = key.hash().toString()
                    @scheme.apptitle = @currfile.path
                    $(@placeholder).empty()
                    @editor.destroyEditor() if @editor
                    @editor = new DocsAPI.DocEditor(@eid, {
                        events: {
                            onAppReady: (e) => @editorReady(e),
                            onRequestCreateNew: () => @newDocument(),
                            onRequestSaveAs: (e) => @saveAs(e),
                            onRequestHistory: () => @loadHistory(),
                            onRequestHistoryData: (e) => @loadHistoryData(e),
                            onRequestHistoryClose: (e) => @closeHistory(e),
                            onRequestRestore: (e) => @restoreVersion(e)
                        },
                        document: {
                            fileType: @currfile.ext,
                            key: d.result.key,
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
    
    restoreVersion: (e) ->
        return if e.data.version is @history.version
        @exec("restore", { version: e.data.version, file: @currfile.path })
            .then (d) =>
                @error d.error if d.error
                @notify d.result if d.result
                @loadHistory()
            .catch (e) =>
                @error e.toString(),e
                @loadHistory()
    
    closeHistory: (e) ->
        @open()
    
    loadHistoryData: (e) ->
        fn = (h,v) =>
            return h if h.version is v
            return fn h.previous, v if h.previous
            return undefined
        data = fn @history, e.data
        @editor.setHistoryData({ error:__("No data found").__()}) unless data
        path = "home://.office/#{@history.hash}"
        hdata = {
            changesUrl: "#{path}/#{data.key}.zip".asFileHandle().getlink()+ "?" + @access_token,
            key: data.key,
            url: "#{path}/#{data.key}".asFileHandle().getlink()+ "?" + @access_token,
            version: data.version
        }
        if data.previous
            hdata.previous = {
                key: data.previous.key,
                url: "#{path}/#{data.previous.key}".asFileHandle().getlink()+ "?" + @access_token
            }
        hdata.url = @currfile.getlink()+ "?" + @access_token if data.version is @history.version
        # console.log(hdata)
        @editor.setHistoryData {hdata}
    
    loadHistory: () ->
        @history = undefined
        @exec("history", { file: @currfile.path })
            .then (d) =>
                return @editor.refreshHistory({error: d.error}) if d.error
                @history = d.result
                history = {}
                history.currentVersion = d.result.version
                history.history = []
                fn = (list, obj) =>
                    list.push {
                        changes: obj.changes,
                        created: obj.create,
                        key: obj.key,
                        user: obj.user,
                        version: obj.version
                    }
                    return unless obj.previous
                    fn list, obj.previous
                
                fn history.history, d.result
                console.log history
                @editor.refreshHistory(history)
            
            .catch (e) =>
                @editor.refreshHistory({ error: e.toString()})
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
                return if @getDocType(file.asFileHandle().ext) is "none"
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
# dirty hack that allow subdomain iframes access each other
# FIXME: may be the domain should be defined by ATOS API
document.domain = "iohub.dev" if document.domain is "os.iohub.dev"
