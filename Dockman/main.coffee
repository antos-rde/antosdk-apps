class Dockman extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "Dockman", args
    
    main: () ->
        @setting.hosts = [] unless @setting.hosts
        @treeview = @find "obj-view"
        @currenthost = undefined
        @tabbar = @find "host-tab-bar"
        @tabbar.ontabselect = (e) =>
            @currenthost = e.data.item.data
            @loadHost()
            
        @tabbar.ontabclose = (e) =>
            id = @setting.hosts.indexOf e.data.item.data
            return false unless id >= 0
            selid = @tabbar.selected
           
            if selid is id
                nid = id + 1
                nid = id - 1 if id >= @setting.hosts.length - 1
                @tabbar.selected = nid
            
            @setting.hosts.splice id, 1
            return true
        
        @find("add").onbtclick = (e) =>
            @openDialog("MultiInputDialog", {
                title: "__(Add new Docker host)",
                model: {
                    text: "__(Name)",
                    url: "__(Host url)"
                },
                allow_empty: false
            })
            .then (d) =>
                @addTab d, true
        
        @imglist = @find "img-list"
        @imglist.onlistselect = (e) =>
            @loadContainer e.data.item.data.text, false
            tdata = { text: e.data.item.data.text, nodes: @getTreeData e.data.item.data }
            @treeview.data = tdata
            @treeview.expandAll()
        
        @ctnlist = @find "container-list"
        @ctnlist.onlistselect = (e) =>
            tdata = { text: e.data.item.data.text, nodes: @getTreeData e.data.item.data }
            @treeview.data = tdata
            @treeview.expandAll()
            @imglist.selected = -1
        
        @imglist.buttons = [
            {
                text: "",
                iconclass: "fa  fa-arrow-down",
                onbtclick: () =>
                    sel = @imglist.selectedItem
                    image = ""
                    image = sel.data.text if sel
                    @openDialog "PromptDialog", {
                        title: __("Pull image"),
                        label: __("Pull image:"),
                        value: image
                    }
                    .then (img) =>
                        return if img is ""
                        @exec("pull_image", {
                            host: @currenthost.url,
                            image: img
                        })
                        .then (r) =>
                            return @error r.error if r.error
                            @openDialog "TextDialog", {
                                title:__("Command output"),
                                disable: true,
                                value: atob(r.result)
                            }
                            .then (_d_) =>
                                @loadHost()
            },
            {
                text: "",
                iconclass: "fa  fa-refresh",
                onbtclick: () =>
                    @loadHost()
            },
            {
                text: "",
                iconclass: "fa  fa-minus",
                onbtclick: () =>
                    sel = @imglist.selectedItem
                    return unless sel
                    @ask({ title: __("Comfirm delete"), text: __("Are you sure?")})
                    .then (r) =>
                        return unless r
                        @exec("rm_image", {
                            host: @currenthost.url,
                            id: sel.data.ID
                        })
                        .then (r) =>
                            return @error r.error if r.error
                            @openDialog "TextDialog", {
                                title:__("Command output"),
                                disable: true,
                                value: r.result
                            }
                            .then (_d_) =>
                                @loadHost()
            }
        ]
        
        @ctnlist.buttons = [
            {
                text: "",
                iconclass: "fa  fa-play",
                onbtclick: () =>
                    sel = @ctnlist.selectedItem
                    return unless sel and sel.data
                    data = sel.data
                    return if data.Detail.State.Running
                    @exec("run_container", {
                        host: @currenthost.url,
                        id: data.ID
                    })
                    .then (r) =>
                        return @error r.error if r.error
                        @notify __("Container {0} started", data.ID)
                        @loadContainer(data.Image, true)
            },
            {
                text: "",
                iconclass: "fa  fa-stop",
                onbtclick: () => 
                    sel = @ctnlist.selectedItem
                    return unless sel and sel.data
                    data = sel.data
                    return unless data.Detail.State.Running
                    @exec("stop_container", {
                        host: @currenthost.url,
                        id: data.ID
                    })
                    .then (r) =>
                        return @error r.error if r.error
                        @notify __("Container {0} stopped", data.ID)
                        @loadContainer(data.Image, true)
            },
            {
                text: "",
                iconclass: "fa  fa-refresh",
                onbtclick: () =>
                    data = @ctnlist.data[0]
                    if not data
                        sel = @imglist.selectedItem
                        return unless sel
                        image = sel.data.text
                    else
                        image = data.Image
                    @loadContainer(image, true)
            },
            {
                text: "",
                iconclass: "fa  fa-plus",
                onbtclick: () =>
                    if not @ctnlist.data[0]
                        return unless @imglist.selectedItem
                        image = @imglist.selectedItem.data.text
                    else
                        image = @ctnlist.data[0].Image
                    console.log image
                    @openDialog "KeyValueDialog", {
                        title: __("Container parameters"),
                        data: {
                            p: "8080:80",
                            restart: "always",
                            name: "Container_Name",
                            memory: "200m",
                            cpus: "1",
                            hostname: "Container_HostNamed"
                        }
                    }
                    .then (d) =>
                        @exec("create_container", {
                            host: @currenthost.url,
                            image: image,
                            parameters: d
                        })
                        .then (r) =>
                            return @error r.error if r.error
                            @openDialog "TextDialog", {
                                title:__("Command output"),
                                disable: true,
                                value: r.result
                            }
                            .then (_d_) =>
                                @loadContainer(image,true)
            },
            {
                text: "",
                iconclass: "fa  fa-minus",
                onbtclick: () =>
                    sel = @ctnlist.selectedItem
                    return unless sel and sel.data
                    data = sel.data
                    @ask({ title: __("Comfirm delete"), text: __("Are you sure?")})
                    .then (r) =>
                        return unless r
                        @exec("rm_container", {
                            host: @currenthost.url,
                            id: data.ID
                        })
                        .then (r) =>
                            return @error r.error if r.error
                            @notify __("Container {0} removed", data.ID)
                            @loadContainer(data.Image, true)
            }
        ]
        
        @tabbar.push v for v in @setting.hosts
        @tabbar.selected = @setting.hosts.length - 1
    
    addTab: (data, refresh) ->
        id = @setting.hosts.length
        @setting.hosts.push data
        @tabbar.push data
        return unless refresh
        @tabbar.selected = id
    
    exec: (action, args) ->
        cmd  = 
            path: "#{@path()}/api.lua",
            parameters:
                action: action,
                args: args
        return @call(cmd)
    
    loadHost: () ->
        return unless @currenthost
        @resetView()
        @exec("list_image", {
                host: @currenthost.url
        })
            .then (d) =>
                return @notify d.error if d.error
                @imglist.data = d.result
            .catch (e) =>
                @error e.toString(), e
    
    loadContainer: (data, cleanup) ->
        @exec("list_container", {
            host:@currenthost.url,
            image: data
        })
            .then (d) =>
                return @notify d.error if d.error
                if cleanup
                    @treeview.data = {}
                    @ctnlist.data = []
                @ctnlist.data = d.result
            .catch (e) =>
                @error e.toString(), e
    
    getTreeData: (data) ->
        type = typeof data
        nodes = []
        switch type
            when "object"
                for key, value of data
                    if key isnt "selected" and key isnt "domel"
                        if typeof value isnt "object"
                            nodes.push { text: "#{key}: #{value}" }
                        else
                            nodes.push { text: key, nodes: @getTreeData(value) }
                return nodes
            else
                return []
    
    resetView: () ->
        @imglist.data = []
        @ctnlist.data = []
        @treeview.data = {}

this.OS.register "Dockman", Dockman