class TinyEditor extends this.OS.GUI.BaseApplication
    constructor: ( args ) ->
        super "TinyEditor", args
    
    main: () ->
        me = @
        @editor = @find "editor"
        @bindKey "ALT-N", () -> me.newFile()
        @bindKey "ALT-O", () -> me.openFile()
        @bindKey "CTRL-S", () -> me.saveFile()
        @filehandler = if @args and @args.length > 0 then @args[0].asFileHandler() else null
        $(@editor).on 'input', (e) ->
            return if me.filehandler.dirty is true
            me.filehandler.dirty = true
            me.scheme.set "apptitle", "#{me.filehandler.path}*"
        @read()
        
    menu: () ->
        me = @
        m = [ 
            {
                text: "__(File)",
                child: [
                    { text: "__(New)", dataid :"new", shortcut: 'A-N' },
                    { text: "__(Open)", dataid :"open", shortcut: 'A-O' },
                    { text: "__(Save)", dataid :"save", shortcut: 'C-S' }
                ],
                onmenuselect: (e) ->
                    switch e.item.data.dataid
                        when "new" then me.newFile()
                        when "open" then me.openFile()
                        when "save" then me.saveFile()
            }
        ]
        m

    newFile: () ->
        @filehandler = null
        @read()
    
    openFile: () ->
        me = @
        @openDialog "FileDiaLog", ( dir, fname, d ) ->
            me.filehandler = "#{dir}/#{fname}".asFileHandler()
            me.read()
        , __("Open file")
    
    saveFile: () ->
        me = @
        @filehandler.cache = @editor.value
        return @write() unless @filehandler.path is "Untitled"
        @openDialog "FileDiaLog", (dir, fname, d) ->
            me.filehandler.setPath "#{dir}/#{fname}"
            me.write()
        , __("Save as"), { file: me.filehandler }
    
    read: () ->
        me = @
        @editor.value = ""
        if @filehandler is null
            @filehandler = "Untitled".asFileHandler()
            @scheme.set "apptitle", "Untitled"
            return
        @filehandler.read (d) ->
            me.scheme.set "apptitle", me.filehandler.path
            me.editor.value = d
    
    write: () ->
        me = @
        @filehandler.write "text/plain", (d) ->
            return me.error __("Error saving file {0}", me.filehandler.path) if d.error
            me.filehandler.dirty = false
            me.scheme.set "apptitle", "#{me.filehandler.path}"
            
    
    cleanup: (e) ->
        return unless @filehandler.dirty
        me = @
        e.preventDefault()
        @ask "__(Quit)", "__(Quit without saving?)", () ->
            me.filehandler.dirty = false
            me.quit()
    
this.OS.register "TinyEditor", TinyEditor