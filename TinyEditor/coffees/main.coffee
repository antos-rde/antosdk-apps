class TinyEditor extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "TinyEditor", args
    
    main: () ->
        @editor = @find "editor"
        @bindKey "ALT-N", () => @newFile()
        @bindKey "ALT-O", () => @openFile()
        @bindKey "CTRL-S", () => @saveFile()
        @filehandle = if @args and @args.length > 0 then @args[0].path.asFileHandle() else null
        $(@editor).on 'input', (e) =>
            return if @filehandle.dirty is true
            @filehandle.dirty = true
            @scheme.set "apptitle", "#{@filehandle.path}*"
        @read()
        
    menu: () ->
        m = [ 
            {
                text: "__(File)",
                child: [
                    { text: "__(New)", dataid :"new", shortcut: 'A-N' },
                    { text: "__(Open)", dataid :"open", shortcut: 'A-O' },
                    { text: "__(Save)", dataid :"save", shortcut: 'C-S' }
                ],
                onchildselect: (e) =>
                    switch e.data.item.get("data").dataid
                        when "new" then @newFile()
                        when "open" then @openFile()
                        when "save" then @saveFile()
            }
        ]
        m

    newFile: () ->
        @filehandle = null
        @read()
    
    openFile: () ->
        @openDialog "FileDialog", { title: __("Open file") }
            .then (d) =>
                @filehandle = d.file.path.asFileHandle()
                @read()
        , 
    
    saveFile: () ->
        @filehandle.cache = @editor.value
        return @write() unless @filehandle.path is "Untitled"
        @openDialog("FileDialog", {
            title: __("Save as"),
            file: @filehandle
        }).then (f) =>
            d = f.file.path.asFileHandle()
            d = d.parent() if f.file.type is "file"
            @filehandle.setPath "#{d.path}/#{f.name}"
            @write()
    
    read: () ->
        @editor.value = ""
        if @filehandle is null
            @filehandle = "Untitled".asFileHandle()
            @scheme.set "apptitle", "Untitled"
            return
        @filehandle.read().then (d) =>
            @scheme.set "apptitle", @filehandle.path
            @editor.value = d
        .catch (e) => @error __("Unable to read file content")
    
    write: () ->
        @filehandle.write("text/plain").then (d) =>
            @filehandle.dirty = false
            @scheme.set "apptitle", "#{@filehandle.path}"
        .catch (e) => @error __("Error saving file {0}", @filehandle.path), e
            
    
    cleanup: (e) ->
        return unless @filehandle.dirty
        e.preventDefault()
        @ask { title: "__(Quit)", text: "__(Quit without saving?)" }
        .then () =>
            @filehandle.dirty = false
            @quit()
    
this.OS.register "TinyEditor", TinyEditor