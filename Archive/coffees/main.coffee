class Archive extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "Archive", args
        @currfile = "Untitled".asFileHandle()
        if @args and @args.length > 0 and @args[0].path
            @currfile = args[0].path.asFileHandle()
        
    main: () ->
        @btadd = @find "btaradd"
        @btdel = @find "btardel"
        @btxtract = @find "btarxtract"
        @filetree = @find "filetree"
        @zip = undefined
        @bindKey "ALT-N", () => @fileMenuHandle "new"
        @bindKey "ALT-O", () => @fileMenuHandle "open"
        @bindKey "CTRL-S", () => @fileMenuHandle "save"
        @bindKey "ALT-S", () => @fileMenuHandle "saveas"
        
        @btxtract.onbtclick = (e) =>
            item = @filetree.selectedItem
            return @notify __("Please select file/folder to extract") unless item
            treedata = item.data
            @openDialog "FileDialog", { title: __("Select a folder"), type: "dir" }
                .then (d) =>
                    @xtract(treedata, d.file.path)
                        .then () => @notify __("extract successful: {0}", treedata.path)
                        .catch (e) => @error e.toString(), e
                .catch (e) => @error e.toString(), e
        
        
        @btadd.onbtclick = (e) => @actionAdd()
        
        @btdel.onbtclick = (e) => @actionDel()
            
        @filetree.contextmenuHandle = (e, m) =>
            item = @filetree.selectedItem
            return unless item
            mdata = [
                { text: "__(Delete)", onmenuselect: () => @actionDel()},
                { text: "__(Info)", onmenuselect: () => @actionInfo()}
            ]
            if item.data.type is "dir"
                mdata.unshift { text: "__(Add)", onmenuselect: () => @actionAdd() }
                
                
            m.items = mdata
            m.show(e)
        
        @openar(@currfile)
    
    actionAdd: () ->
        item = @filetree.selectedItem
        return @notify __("Please select a destination folder") unless item and item.data.type is "dir"
        treedata = item.data
        @openDialog "FileDialog", { title: __("Select a file/folder") }
            .then (d) =>
               @addToZip d.file, "#{treedata.path}/#{d.file.path.asFileHandle().basename}"
                .then () =>
                    @currfile.dirty = true
                    @refreshTreeFile()
                .catch (e) => @error e.toString(), e
            .catch (e) => @error e.toString(), e
    
    actionDel: () ->
        item = @filetree.selectedItem
        return @notify __("Please select a destination folder") unless item
        treedata = item.data
        return @notify __("You cannot delete the root node") if treedata.root
        
        @ask {title: "__(Delete)", text: __("Do you really want to delete: {0}?", treedata.text) }
            .then (d) =>
                return unless d
                @zip.remove(treedata.path.trimBy("/"))
                @currfile.dirty = true
                @refreshTreeFile()
            .catch (e) => @error e.toString(), e
            
    actionInfo: () ->
        item = @filetree.selectedItem
        return @notify __("Please select a file/folder") unless item
        key = item.data.path.trimBy("/")
        key = "#{key}/" if item.data.type is "dir"
        meta = @zip.files[key]
        return @notify __("Cannot get entry meta data") unless meta
        @openDialog "InfoDialog", {
            title: "About: #{meta.name}",
            name: meta.name,
            date: meta.date,
            dir: meta.dir,
            dataBinary: meta._dataBinary,
            size: meta._data.uncompressedSize
        }
        
    openar: (file) ->
        @zip = undefined
        if file.filename is "Untitled"
            @zip = new JSZip()
            @currfile = file
            @refreshTreeFile()
        else
            # open the file and refresh filetree
            file.read("binary")
                .then (data) =>
                    JSZip.loadAsync(data)
                        .then (zip) =>
                            @zip = zip
                            @currfile = file
                            @refreshTreeFile()
                        .catch (e) =>
                            @error __("Wrong zip format: {0}", e.toString()), e
                .catch (e) =>
                    @error __("Unable to read archive: {0}", file.path), e
    
    refreshTreeFile: () ->
        return unless @zip
        treedata = {
            text: @currfile.filename.trimFromRight(".zip"),
            type: "dir"
            path: "",
            open: true,
            root: true,
            nodes: []
        }
        
        for k,v of @zip.files
            leaf = @putFileInTree k.split("/"), treedata
            if not v.dir
                leaf.type = "file"
                delete leaf.nodes
        @filetree.data = treedata
    
    putFileInTree: (patharr, treedata) ->
        names = (v.text for v in treedata.nodes)
        rep = patharr.shift()
        return treedata unless rep
        if names.includes rep
            @putFileInTree patharr, treedata.nodes[names.indexOf rep]
        else
            subtree = {
                text: rep,
                path: "#{treedata.path}/#{rep}",
                type: "dir",
                nodes: []
            }
            treedata.nodes.push subtree
            return @putFileInTree patharr, subtree
        
    
    xtract: (treedata, to) ->
        new Promise (resolve, reject) =>
            if treedata.type is "file"
                @zip.file(treedata.path.trimBy("/"))
                .async("uint8array")
                .then (data) =>
                    fp = "#{to}/#{treedata.text}".asFileHandle()
                    fp.cache = new Blob([data], { type: "octet/stream" })
                    fp.write()
                        .then () -> resolve()
                        .catch (e) -> reject __e e
                .catch (e) -> reject __e e
            else
                #make the dir before extract
                to.asFileHandle().mk treedata.text
                    .then () =>
                        nodes = (v for v in treedata.nodes)
                        @xtractall nodes, "#{to}/#{treedata.text}"
                            .then -> resolve()
                            .catch (e) -> reject __e e
                    .catch (e) -> reject __e e
    
    xtractall: (list, to) ->
        new Promise (resolve, reject) =>
            return resolve() if list.length is 0
            el = list.shift()
            @xtract el, to
                .then () =>
                    @xtractall list, to
                        .then () -> resolve()
                        .catch (e) -> reject __e e
                .catch (e) -> reject __e e
    
    addToZip: (file, to) ->
        new Promise (resolve, reject) =>
            if file.type is "dir"
                file.path.asFileHandle().read().then (data) =>
                    return reject __e @throwe data.error if data.error
                    @addFilesTozip data.result, to
                        .then () -> resolve()
                        .catch (e) => reject __e  e
            else
                file.path.asFileHandle()
                    .read("binary")
                    .then (data) =>
                        @zip.file(to.trimBy("/"), data, { binary: true })
                        resolve()
                    .catch (e) -> resolve __e e
    
    addFilesTozip: (list, to) ->
        new Promise (resolve, reject) =>
            return resolve() if list.length is 0
            el = list.shift()
            @addToZip el, "#{to}/#{el.path.asFileHandle().basename}"
                .then () =>
                    @addFilesTozip list, to
                        .then () -> resolve()
                        .catch (e) -> reject __e e
                .catch (e) -> reject __e e
    
    saveZipAs: () ->
        @openDialog("FileDialog", {
            title: __("Save as"),
            file: @currfile
        }).then (f) =>
            d = f.file.path.asFileHandle()
            d = d.parent() if f.file.type is "file"
            @currfile.setPath "#{d.path}/#{f.name}"
            @write()
    
    write: () ->
        return unless @zip and @currfile.path isnt "Untitled"
        @zip .generateAsync({ type: "base64" })
        .then (data) =>
            @currfile
                .setCache(
                    "data:application/zip;base64," + data
                )
                .write("base64")
                .then () =>
                    @currfile.dirty = false
                    @refreshTreeFile()
                    @notify __("zip file saved in {0}", @currfile.path)
                .catch (e) => @error __("Unable to save zip file: {0}", @currfile.path)
    
    fileMenuHandle:(id) ->
        switch id
            when "open"
                @openDialog "FileDialog", { title: __("Select a zip file"), mimes: ["application/zip"] }
                .then (d) =>
                    @openar(d.file.path.asFileHandle())
                .catch (e) => @error e.toString(), e
            when "save"
                return @write() if @currfile.path isnt "Untitled"
                @saveZipAs()
            
            when "saveas"
                @saveZipAs()
    
    menu: () ->
        [
            {
                text: "__(File)",
                nodes: [
                    { text: "__(New)", id:"new", shortcut: "A-N" },
                    { text: "__(Open)", id:"open", shortcut: "A-O"},
                    { text: "__(Save)", id:"save", shortcut: "C-S"},
                    { text: "__(Save as)", id:"saveas", shortcut: "A-S"}
                ],
                onchildselect: (e) => @fileMenuHandle e.data.item.data.id
            }
        ]

    cleanup: (e) ->
        return unless @currfile.dirty
        e.preventDefault()
        @ask { title: "__(Quit)", text: "__(Zip file has been modified. Quit without saving?)" }
        .then (d) =>
            return unless d
            @currfile.dirty = false
            @quit()
            
Archive.dependencies = [
    "os://scripts/jszip.min.js"
]

this.OS.register "Archive", Archive