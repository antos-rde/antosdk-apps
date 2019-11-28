class BookletEntry
    constructor: () ->
        @name = "Untitled"
        
    save: () ->
    
    remove: () ->
    
    toc: () ->

    
    updateName:() ->
        return @name unless @descFile.dirty
        t = (new RegExp "^\s*#+(.*)[\n,$]", "g").exec @descFile.cache
        return @name unless t and t.length is 2
        @name =  t[1].trim()
        

class BookletFolder extends BookletEntry
    constructor: (@type, @path, @hasMeta) ->
        super()
        @nodes = []
        @metaFile = "#{@path}/meta.json".asFileHandler() if @hasMeta
        @descFile = "#{@path}/#{@type}.md".asFileHandler()

    add: (chap) ->
        chap.parent = @
        @nodes.push chap

    size: () ->
        return @nodes.length
    
    mkdir: () ->
        me = @
        console.log "making:" + me.path
        return new Promise (r, e) ->
            dir = me.path.asFileHandler()
            dir.meta (d) ->
                return r() unless d.error
                bname = dir.basename
                dir = dir.parent().asFileHandler()
                dir.mk bname, (result) ->
                    e __("Error when create directory: {0}", result.error) if result.error
                    r()
    
    mkdirs: () ->
        me = @
        return new Promise (r, e) ->
            list = []
            list[i] = v for v, i in me.nodes if me.hasMeta
            console.log list
            me.mkdir().then () ->
                fn = (l) ->
                    return r() if l.length is 0
                    el = (l.splice 0, 1)[0]
                    el.mkdirs().then () ->
                        fn l
                return fn list
            
    
    save:(handle) ->
        @mkdirs().then ()->
            handle.notify __("All directories are created")
        .catch (msg) ->
            handle.error msg

    toc: () ->
        @updateName()
        v.toc() for v in @nodes
        @
    
    remove: (apif) ->
    

class Book extends BookletFolder
    constructor: (path) ->
        super 'book', path, true
    
    

class BookletChapter extends BookletFolder
    constructor: (book) ->
        path = "#{book.path}/c_#{book.size()}"
        super 'chapter', path, true
        book.add @
                

class BookletSection extends BookletFolder
    constructor: (chapter) ->
        path = "#{chapter.path}/s_#{chapter.size()}"
        super "section", path,  false
        chapter.add @
        

class BookletFile extends BookletEntry
    constructor: (@section) ->
        super()
        @section.add @
        @path = "#{@section.path}/f_#{@section.size()}.md"
        @descFile = @path.asFileHandler()
        
    save: (handle) ->
        v.save @descFile for v in @sections
        me = @
        if @descFile.dirty
            @descFile.write "text/plain", (r) ->
                handle.error __("Fail to save file {0}: {1}", me.descFile.path, r.error) if r.error
                @descFile.dirty = false
                handle.notify __("Book saved")
    toc: () ->
        @updateName()
        @