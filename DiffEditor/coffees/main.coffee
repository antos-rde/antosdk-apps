class DiffEditor extends @OS.application.BaseApplication
    constructor: ( args ) ->
        super "DiffEditor", args
    
    main: () ->
        @editor_cnt = @find "diffeditor"
        @fileview = @find "fileview"
        
        @fileview.fetch = (path) =>
            return new Promise  (resolve, reject) =>
                path.asFileHandle().read()
                    .then (d) =>
                        return reject(d.error) if d.error
                        return resolve(d.result)
                    .catch (e) =>
                        return reject(__e(e))
        @fileview.onfileopen = (e) =>
            return unless e.data and e.data.path
            return if e.data.type is "dir"
            return @openFile e.data.path.asFileHandle()
        
        @currdir = undefined
        ace.config.set('basePath', "scripts/ace")
        ace.require("ace/ext/language_tools")
        @modelist = ace.require("ace/ext/modelist")
        
        @differ = new AceDiff({
            # ace: window.ace,
            element: @editor_cnt,
            theme: "ace/theme/monokai",
            left: {
                content: '',
            },
            right: {
                content: '',
            }
        })
        @editors = @differ.getEditors()
        opts = {
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
            highlightActiveLine: true,
            highlightSelectedWord: true,
            behavioursEnabled: true,
            #wrap: true,
            fontSize: "10pt",
            showInvisibles: true,
        }
        
        @editors.left.setOptions(opts)
        @editors.right.setOptions(opts)
        @editors.left.current_file = undefined
        @editors.right.current_file = undefined
        @editors.left.afx_label = @find("left-file")
        @editors.right.afx_label = @find("right-file")
        @editors.left.mux = false
        @editors.right.mux = false
        
        @on "resize", () =>
            @editors = @differ.getEditors()
            @editors.left.resize()
            @editors.right.resize()
        
        $('.acediff__left .ace_scrollbar-v',@editor_cnt).scroll(() =>
            @editors.right.session.setScrollTop(@editors.left.session.getScrollTop()))
        $('.acediff__right .ace_scrollbar-v', @editor_cnt).scroll(() =>
            @editors.left.session.setScrollTop(@editors.right.session.getScrollTop()))
        
        @editors.left.on "focus", (e) =>
            @current_editor = @editors.left
        @editors.right.on "focus", (e) =>
            @current_editor = @editors.right
            
        @editors.left.on "input", (e) =>
            return @editors.left.mux = false if @editors.left.mux
            return @editors.left.afx_label.text = __("Temporary file") unless @editors.left.current_file
            return if  @editors.left.current_file.dirty
            @editors.left.current_file.dirty = true
            @editors.left.afx_label.text += "*"
            
        @editors.right.on "input", (e) =>
            return @editors.right.mux = false if @editors.right.mux
            return @editors.right.afx_label.text = __("Temporary file") unless @editors.right.current_file
            return if  @editors.right.current_file.dirty
            @editors.right.current_file.dirty = true
            @editors.right.afx_label.text += "*"
        
        
        @current_editor = @editors.left
        @current_editor.focus()
        
        list = []
        for v in @modelist.modes
            list.push {
                text: v.caption,
                mode: v.mode
            }
        @langlist = @find("langmode")
        @langlist.data = list
        @langlist.onlistselect = (e) =>
            @editors.left.getSession().setMode e.data.item.data.mode
            @editors.right.getSession().setMode e.data.item.data.mode
        
        @bindKey "ALT-O", () => @menuAction("open")
        @bindKey "ALT-F", () => @menuAction("opendir")
        @bindKey "CTRL-S", () => @menuAction("save")
        @toggleSideBar()
    
    toggleSideBar: () ->
        if @currdir
            $(@fileview).show()
            @fileview.path = @currdir.path
        else
            $(@fileview).hide()
            
        @trigger("resize")
    
    menu: () ->
        return [
            {
                text: __("File"),
                nodes: [
                    { text: __("Open"), dataid: "open", shortcut: "A-O" },
                    {
                        text: __("Open Folder"),
                        dataid: "opendir",
                        shortcut: "A-F",
                    },
                    { text: __("Save"), dataid: "save", shortcut: "C-S" }
                ],
                onchildselect: (e) =>
                    @menuAction(e.data.item.data.dataid)
            }
        ]
    
    openFile: (file) ->
        @current_editor.mux = true
        file.read()
            .then (d) =>
                file.cache = d
                @current_editor.current_file = file
                @current_editor.afx_label.text = file.path
                @current_editor.setValue d, -1
                # select current mode
                m = @modelist.getModeForPath(file.path)
                item = i for v,i in @langlist.data when v.mode is m.mode
                return unless item isnt undefined
                @langlist.selected = item
    
    menuAction:(dataid) ->
        switch dataid
            when "open"
                @openDialog "FileDialog", {
                    title: __("Open file"),
                    mimes: ["text/.*", "application/json", "application/javascript"],
                }
                .then (f) =>
                        @openFile(f.file.path.asFileHandle())
                        
            when "opendir"
                @openDialog("FileDialog", {
                        title: __("Open folder"),
                        mimes: ["dir"],
                    })
                    .then (f) =>
                        @currdir = f.file.path.asFileHandle()
                        @toggleSideBar()
                        
            when "save"
                fn = (ed) =>
                    return unless ed.current_file and ed.current_file.dirty
                    ed.current_file.cache = ed.getValue()
                    ed.current_file.write("text/plain")
                        .then (r) =>
                            ed.current_file.dirty = false
                            ed.afx_label.text = ed.current_file.path
                            @notify __("File {0} saved", ed.current_file.path)
                        .catch (e) =>
                            @error __("Unable to save to: {0}", ed.current_file.path), e
                fn @editors.left
                fn @editors.right
            else
                return console.log(dataid)
    
    cleanup: (evt) ->
        dirty = false
        dirty = true if @editors.left.current_file and @editors.left.current_file.dirty
        dirty = true if @editors.right.current_file and @editors.right.current_file.dirty
        if dirty
            evt.preventDefault()
            @ask { title: __("Unsaved changes"), text: __("Ignore modification ?")}
            .then (d) =>
                return unless d
                @editors.left.current_file.dirty = false
                @editors.right.current_file.dirty = false
                @quit()
        else
            @differ.destroy()
        
DiffEditor.dependencies = [
    "os://scripts/ace/ace.js",
    "os://scripts/ace/ext-language_tools.js",
    "os://scripts/ace/ext-themelist.js",
    "os://scripts/ace/ext-language_tools.js",
    "pkg://AceDiff/main.js",
    "pkg://AceDiff/main.css"
]
@OS.register "DiffEditor", DiffEditor