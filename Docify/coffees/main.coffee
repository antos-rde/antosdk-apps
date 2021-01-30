class Docify extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "Docify", args
    
    main: () ->
        
        @setting.printer = "" unless @setting.printer
        
        @catview = @find "catview"
        @docview = @find "docview"
        @docpreview = @find "preview-canvas"
        @docgrid = @find "docgrid"
        @docgrid.header = [
            { text: "", width: 100 },
            { text: "" },
        ]
        @find("btdld").onbtclick = (e) =>
            item = @docview.selectedItem
            return unless item
            item.data.file.asFileHandle()
                .download()
                .catch (e) => @error __("Unable to download: {}", e.toString()), e
        @find("btopen").onbtclick = (e) =>
            item = @docview.selectedItem
            return unless item
            item.data.file.asFileHandle().meta()
                .then (m) =>
                    return @error m.error if m.error
                    @_gui.openWith m.result
                .catch (e) => @error e.toString(), e
        @find("btprint").onbtclick = (e) =>
            item = @docview.selectedItem
            return unless item
            @openDialog new PrintDialog(), {}
            .then (d) =>
                return unless d
                d.file = item.data.file
                @exec("printdoc", d)
                    .then (r) =>
                        return @error r.error if r.error
                        @notify r.result
                    .catch (e) => @error __("Unable to insert category: {0}", e.toString()), e
        @catview.buttons = [
            {
                 text: "",
                 iconclass: "fa fa-plus-circle",
                 onbtclick: (e) =>
                     @openDialog("PromptDialog", { title: __("Category"), label: __("Name")})
                        .then (d) =>
                            @exec("insert", { table: "categories", data: { name: d } })
                                .then (r) =>
                                    return @error r.error if r.error
                                    @cat_refresh()
                                .catch (e) => @error __("Unable to insert category: {0}", e.toString()), e
                        .catch (e) => @error e.toString(), e
            },
            {
                 text: "",
                 iconclass: "fa fa-minus-circle",
                 onbtclick: (e) =>
                    item = @catview.selectedItem
                    return unless item
                    @ask({ text:__("Do you realy want to delete: `{0}`", item.data.text)})
                        .then (d) =>
                            return unless d
                            @exec("delete", {table:"categories", id: parseInt(item.data.id)})
                                .then (d) =>
                                    return @error d.error if d.error
                                    @cat_refresh()
                                .catch (e) => 
                                    @error __("Unable delete category: {0}", e.toString()), e
            },
            {
                 text: "",
                 iconclass: "fa fa-pencil-square-o",
                 onbtclick: (e) =>
                    item = @catview.selectedItem
                    return unless item
                    @openDialog("PromptDialog", { title: __("Category"), label: __("Name"), value: item.data.name })
                        .then (d) =>
                            @exec("update", { table: "categories", data: { id: parseInt(item.data.id), name: d } })
                                .then (r) =>
                                    return @error r.error if r.error
                                    @cat_refresh()
                                .catch (e) => @error __("Unable to update category: {0}", e.toString()), e
                        .catch (e) => @error e.toString(), e
            }
        ]
        
        @docview.onlistselect = (e) =>
            @clear_preview()
            item = e.data.item
            return unless item
            @exec("get_doc", item.data.id)
                .then (d) =>
                    return @error d.error if d.error
                    @preview d.result.file, @docpreview
                    rows = []
                    d.result.size = (d.result.fileinfo.size / 1024.0).toFixed(2) + " Kb" if d.result.fileinfo
                    map = {
                        ctime: "Created on",
                        mtime: "Modified on",
                        note: "Note",
                        tags: "Tags",
                        name: "Title",
                        owner: "Owner",
                        edate: "Effective date",
                        file: "File",
                        size: "Size"
                    }
                    d.result.edate = "#{d.result.day}/#{d.result.month}/#{d.result.year}"
                    for key, value of d.result
                        field = map[key]
                        rows.push [{text: field}, {text: value}] if field
                    @docgrid.rows = rows
                .catch (e) => @error e.toString(), e
        
        @catview.onlistselect = (e) =>
            @clear_preview()
            item = e.data.item
            return unless item
            @update_doclist(item.data.id)
        
        @find("bt-add-doc").onbtclick = (e) =>
            catiem = @catview.selectedItem
            return @notify __("Please select a category") unless catiem
            
            @openDialog(new DocDialog())
                .then (data) =>
                    data.cid = parseInt(catiem.data.id)
                    @exec("insertdoc", data)
                        .then (d) =>
                            return @error d.error if d.error
                            @notify d.result if d.result
                            @update_doclist(catiem.data.id)
                            @clear_preview()
                        .catch (e) => @error e.toString(), e
        
        @find("bt-del-doc").onbtclick = (e) =>
            item = @docview.selectedItem
            return unless item
            @ask({ text: __("Do you really want to delete: `{0}`", item.data.name) })
                .then (d) =>
                    return unless d
                    @exec("deletedoc", {id: item.data.id, file: item.data.file})
                        .then (r) =>
                            return @error r.error if r.error
                            @notify r.result
                            @update_doclist(item.data.cid)
                            @clear_preview()
                        .catch (e) =>
                            @error e.toString(), e
        
        @find("bt-edit-doc").onbtclick = (e) =>
            item = @docview.selectedItem
            catiem = @catview.selectedItem
            return unless item
            @openDialog(new DocDialog(), item.data)
                .then (data) =>
                    data.cid = parseInt(catiem.data.id)
                    data.id = item.data.id
                    @exec("updatedoc", {
                        data:data,
                        rm: if not data.file.includes(item.data.file) then item.data.file else false
                    })
                        .then (d) =>
                            return @error d.error if d.error
                            @notify d.result if d.result
                            @update_doclist(catiem.data.id)
                            @clear_preview()
                        .catch (e) => @error e.toString(), e
        
        @initialize()
    
    update_doclist: (cid) ->
        @exec("select",{table: "docs", cond:"cid = #{cid} ORDER BY year DESC, month DESC, day DESC"})
            .then (d) =>
                return @error d.error if d.error
                v.text = v.name for v in d.result
                @docview.data = d.result
            .catch (e) =>
                @error e.toString(), e
    
    clear_preview: () ->
        @docpreview.getContext('2d').clearRect(0,0,@docpreview.width,@docpreview.height)
        @docgrid.rows = []
    
    preview: (path, canvas) ->
        @exec("preview", path)
            .then (d) =>
                return @error d.error if d.error
                file = d.result.asFileHandle()
                file.read("binary")
                    .then (d) =>
                        img = new Image()
                        #($ me.view).append img
                        img.onload = () =>
                            context = canvas.getContext '2d'
                            canvas.height = img.height
                            canvas.width = img.width
                            #console.log canvas.width, canvas.height
                            context.drawImage img, 0, 0
                        
                        blob = new Blob [d], { type: file.info.mime }
                        img.src = URL.createObjectURL blob
                        
                    .catch (e) => @error e.toString(), e
            .catch (e) =>
                @error e.toString(), e
    
    cat_refresh: () ->
        @docview.data = []
        @clear_preview()
        @exec("fetch", "categories")
            .then (d) =>
                v.text = v.name for v in d.result
                @catview.data = d.result
            .catch (err) => @error __("Unable to fetch categories: {0}", err.toString()), err
    
    initialize: () ->
        # Check if we have configured docpath
        if @setting.docpath
            # check data base
            @initdb()
        else
            # ask user to choose a docpath
            @openDialog "FileDialog", { title:__("Please select a doc path"), mimes: ['dir'] }
            .then (d) =>
                @setting.docpath = d.file.path
                @_api.setting()
                @initdb()
            .catch (msg) => @error msg.toString(), msg
    
    exec: (action, args) ->
        cmd  = 
            path: "#{@path()}/api.lua",
            parameters:
                action: action,
                docpath: @setting.docpath,
                args: args
        return @call(cmd)
    
    initdb: () ->
        return @error __("No configured docpath") unless @setting.docpath
        # fetch the categories from the database
        @exec("init")
            .then (d) =>
                return @error d.error if d.error
                @notify d.result
                # load categories
                @cat_refresh()
            .catch (e) =>
                @error __("Unable to init database: {0}", e.toString()), e
    
    menu: () ->
        [
            {
                text: "__(Options)",
                nodes: [
                    { text: "__(Owners)", id:"owners"},
                    { text: "__(Preview)", id:"preview"},
                    { text: "__(Change doc path)", id:"setdocp"},
                    { text: "__(Set default printer)", id:"setprinter"}
                ],
                onchildselect: (e) => @fileMenuHandle e.data.item.data.id
            }
        ]
    
    fileMenuHandle:(id) ->
        switch id
            when "owners"
                @openDialog new OwnerDialog(), { title: __("Owners")}
            when "preview"
                @openDialog(new FilePreviewDialog())
                    .then (d) =>
                        @notify d.path
            when "setdocp"
                @setting.docpath = undefined
                @initialize()
            when "setprinter"
                @openDialog "PromptDialog", {title: __("Default Printer"), label: __("Enter printer name")}
                .then (n) =>
                    @setting.printer = n

this.OS.register "Docify", Docify