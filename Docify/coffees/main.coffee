class Docify extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "Docify", args
    
    main: () ->
        
        @catview = @find "catview"
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
                                .catch (e) => @error __("Unable to insert category: {0}", e.toString())
                        .catch (e) => @error e.toString()
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
                                    @error __("Unable delete category: {0}", e.toString())
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
                                .catch (e) => @error __("Unable to update category: {0}", e.toString())
                        .catch (e) => @error e.toString()
            }
        ]
        
        @find("bt-add-doc").onbtclick = (e) =>
            @openDialog new DocDialog
        
        @initialize()
    
    cat_refresh: () ->
        @exec("fetch", "categories")
            .then (d) =>
                v.text = v.name for v in d.result
                @catview.data = d.result
            .catch (err) => @error __("Unable to fetch categories: {0}", err.toString())
    
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
                @error __("Unable to init database: {0}", e.toString())
    
    menu: () ->
        [
            {
                text: "__(View)",
                nodes: [
                    { text: "__(Owners)", id:"owners", shortcut: "A-O"},
                    { text: "__(Preview)", id:"preview", shortcut: "A-P"}
                ],
                onchildselect: (e) => @fileMenuHandle e.data.item.data.id
            }
        ]
    
    fileMenuHandle:(id) ->
        switch id
            when "owners"
                @openDialog new OwnerDialog(), { title: __("Owners")}
            when "preview"
                @openDialog new FilePreviewDialog()

this.OS.register "Docify", Docify