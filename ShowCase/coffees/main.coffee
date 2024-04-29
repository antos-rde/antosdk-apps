Ant = this
class ShowCase extends this.OS.application.BaseApplication
    constructor: (args) ->
        super "ShowCase", args
    
    main: () ->
        
        bt = @find 'bttest'
        
        @observable.on "btclick", (e) =>
            @notify "button clicked"
        
        @bindKey("CTRL-SHIFT-P", (e) => @notify("CTRL-SHIFT-P shortcut executed"))
        
        list = @find 'list'

        list.data = [
            { text: "some thing with avery long text" },
            { text: "some thing 1", closable: true },
            { text: "some thing 2", iconclass: "fa fa-camera-retro fa-lg" },
            { text: "some thing 3" },
            { text: "some thing 4" },
            { text: "some thing 5" }
        ]
        
        list.onlistselect = (e) => @notify(e.data.items)

        sw = @find 'switch'
        sw.onswchange = (e) =>
            @notify e.data
        
        spin = @find 'spin'
        spin.onvaluechange = (e) =>
            @notify e.data

        menu = @find 'menu'
        menu.nodes = @menu()

        list.contextmenuHandle = (e, m) =>
            m.items = @menu()
            m.show e
        
        grid = @find 'grid'
        grid.oncelldbclick = (e) =>
            @notify  "on dbclick", e
        grid.onrowselect = (e) =>
            @notify  "on rowselect"
        
        grid.header = [{ text: "header1", width: 80 }, { text: "header2" }, { text: "header3" }]
        grid.rows = [
            [{ text: "text 1" }, { text: "text 2" }, { text: "text 3" }],
            [{ text: "text 4" }, { text: "text 5" }, { text: "text 6" }],
            [{ text: "text 7" }, { text: "text 8" }, { text: "text 9" }],
            [{ text: "text 10" }, { text: "this is a long text" }, { text: "text 11" }]
        ]

        tdata = {
            text: 'Tree root',
            nodes: [
                { text: 'leaf 1', iconclass:'fa fa-car'},
                { text: 'leaf 2' },
                {
                    text: 'sub tree 1',
                    nodes: [
                        {
                            text: 'sub sub tree 1',
                            nodes: [
                                { text: 'leaf 1 of sub sub tree 1' },
                                { text: 'leaf 2 of sub sub tree 1' }
                            ]
                        },
                        { text: 'leaf 1 of sub tree' },
                        { text: 'leaf 2 of sub tree' },
                        {
                            text: 'sub sub tree 2',
                            nodes: [
                                { text: 'leaf 1 of sub sub tree 2' },
                                { text: 'leaf 2 of sub sub tree 2' }
                            ]
                        }
                    ]
                }
            ]
        }

        tree = @find 'tree'
        tree.data = tdata
        tree.ontreeselect = (e) =>
            @notify e.data.item.treepath
        tree.ontreedbclick = (e) =>
            @notify "treedbclick"
        @observable.on "treedbclick", (e) =>
            @notify "observable treedbclick"
        
        slider = @find 'slider'
        slider.onvaluechange = (v) =>
            @notify v

        cal = @find 'cal'
        cal.ondateselect = (e) =>
            @notify e.data.toString()
        
        pk = @find 'cpk'
        pk.oncolorselect = (e) =>
            @notify JSON.stringify(e)

        fileview = @find 'fileview'
        fileview.fetch = (path) ->
            new Promise (resolve, reject) ->
                dir = path.asFileHandle()
                dir.read().then (d) ->
                    p = dir.parent().asFileHandle()
                    p.filename = "[..]"
                    p.type = "dir"
                    return reject d.error if d.error
                    d.result.unshift p
                    resolve d.result
        fileview.path = "home:///"

        viewoption =  @find 'viewoption'
        viewoption.data = [
            { text: "icon" },
            { text: "list" },
            { text: "tree" }
        ]
        viewoption.onlistselect = (e) =>
            @notify e.data.item.data.text
            fileview.view = e.data.item.data.text

        dllist = @find "dialoglist"
        btrun = @find "btrundia"

        dllist.data = [
            { text: "Prompt dialog", id: "prompt" },
            { text: "Calendar dialog", id: "calendar" },
            { text: "Color picker dialog", id: "colorpicker" },
            { text: "Info dialog", id: "info" },
            { text: "YesNo dialog", id: "yesno" },
            { text: "Selection dialog", id: "selection" },
            { text: "About dialog", id: "about" },
            { text: "File dialog", id: "file" },
            { text: "Text dialog", id: "text" },
            { text: "Multi-input dialog", id: "minputs" },
             { text: "Multi key value dialog", id: "mkv" }
        ]
        @morphon Ant.OS.GUI.RESPONSIVE.MEDIUM, (fulfilled) =>
            if fulfilled
                this.find("tabctn").dir = "row"
            else
                this.find("tabctn").dir = "column"


        btrun.onbtclick = (e) =>
            item = dllist.selectedItem
            return unless item
            switch item.data.id
                when "prompt"
                    @openDialog("PromptDialog", {
                            title: "Prompt review",
                            value: "txt data",
                            label: "enter value"
                        })
                        .then (d) =>
                            @notify d
                when "calendar"
                    @openDialog("CalendarDialog", {
                            title: "Calendar dialog"
                    })
                        .then (d) =>
                            @notify d.toString()
                when "colorpicker"
                    @openDialog("ColorPickerDialog")
                        .then (d) =>
                            @notify JSON.stringify(d)
                when "info"
                    @openDialog("InfoDialog", {
                        title: "Info application",
                        name: "Show case",
                        date: "10/12/2014",
                        description: "the brown fox jumps over the lazy dog"
                    })
                        .then (d) ->
                when "yesno"
                    @openDialog("YesNoDialog", {
                            title: "Question ?",
                            text: "Do you realy want to delete file ?"
                        })
                        .then (d) =>
                            @notify d
                when "selection"
                    @openDialog("SelectionDialog", {
                            title: "Select data ?",
                            data: [
                                { text: "Option 1" },
                                { text: "Option 2" },
                                { text: "Option 3", iconclass: "fa fa-camera-retro fa-lg" }
                            ]
                        })
                        .then (d) =>
                            @notify d.text
                when "about"
                    @openDialog("AboutDialog" )
                        .then (d) =>
                when "file"
                    @openDialog("FileDialog", {
                            title: "Select file ?",
                            #root: "home:///",
                            mimes: ["text/*", "dir"],
                            file: "Untitled".asFileHandle()
                        })
                        .then (f, name) =>
                            @notify f, name
                
                when "text"
                    @openDialog("TextDialog", {
                            title: "Text dialog review",
                            value: "txt data",
                            label: "this is the label"
                        })
                        .then (d) =>
                            @notify d
                when "minputs"
                    @openDialog("MultiInputDialog", {
                        title: "Multi-inputs",
                        model: {
                            name: "Your name",
                            email: "Your email",
                            where: "Your address"
                        },
                        allow_empty: false,
                        data: {
                            name: "John Doe",
                            email: "jd@mail.com",
                            where: "Anywhere on Earth"
                        }
                    })
                    .then (d) =>
                        @notify JSON.stringify(d)
                
                when "mkv"
                    @openDialog("KeyValueDialog", {
                        title: "Multi key-values",
                        data: {
                            name: "John Doe",
                            email: "jd@mail.com",
                            where: "Anywhere on Earth"
                        }
                    })
                    .then (d) =>
                        @notify JSON.stringify(d)
                else return
                    


    mnFile: () ->
        #@notify file
        arr = {
            text: "__(File)",
            nodes: [
                { text: "__(New file)", dataid: "#{@name}-mkf", shortcut: 'C-F' },
                { text: "__(New folder)", dataid: "#{@name}-mkdir", shortcut: 'C-D' },
                { text: "__(Open with)", dataid: "#{@name}-open", child: @apps },
                { text: "__(Upload)", dataid: "#{@name}-upload", shortcut: 'C-U' },
                { text: "__(Download)", dataid: "#{@name}-download" },
                { text: "__(Share file)", dataid: "#{@name}-share", shortcut: 'C-S' },
                { text: "__(Properties)", dataid: "#{@name}-info", shortcut: 'C-I' }
            ], onchildselect: (e) => @notify e.data.item.data.text
        }
        return arr
    mnEdit: () ->

        {
            text: "__(Edit)",
            nodes: [
                { text: "__(Rename)", dataid: "#{@name}-mv", shortcut: 'C-R' },
                { text: "__(Delete)", dataid: "#{@name}-rm", shortcut: 'C-M' },
                { text: "__(Cut)", dataid: "#{@name}-cut", shortcut: 'C-X' },
                { text: "__(Copy)", dataid: "#{@name}-copy", shortcut: 'C-C' },
                { text: "__(Paste)", dataid: "#{@name}-paste", shortcut: 'C-P' }
            ], onchildselect: (e) => @notify e.data.item.data.text
        }

    menu: () ->
        menu = [
            @mnFile(),
            @mnEdit(),
            {
                text: "__(View)",
                nodes: [
                    { text: "__(Refresh)", dataid: "#{@name}-refresh"},
                    { text: "__(Sidebar)", switch: true, checked: true },
                    { text: "__(Navigation bar)", switch: true, checked: false },
                    { text: "__(Hidden files)", switch: true, checked: true, dataid: "#{@name}-hidden" },
                    { text: "__(Type)", nodes: [
                        { text: "__(Icon view)", radio: true, checked: true, dataid: "#{@name}-icon", type: 'icon' },
                        { text: "__(List view)", radio:true, checked: false, dataid: "#{@name}-list", type: 'list' },
                        { text: "__(Tree view)", radio:true, checked: false, dataid: "#{@name}-tree", type: 'tree' }
                     ], onchildselect: (e) => @notify e.data.item.data.text
                    },
                ], onchildselect: (e) => @notify e.data.item.data.text
            },
        ]
        menu
ShowCase.singleton = true
this.OS.register "ShowCase", ShowCase