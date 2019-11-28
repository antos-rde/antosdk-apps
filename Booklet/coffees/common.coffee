class BookletEntry
    constructor: () ->
        @name = "Untitled"
        
    save: () ->
    
    remove: () ->
    
    toc: () ->

    
    updateName:() ->
        return @name unless @descFile.dirty
        t = (new RegExp "^\s*#+(.*)\n", "g").exec @descFile.cache
        return @name unless t and t.length is 2
        @name =  t[1].trim()
    
    remove: () ->
        me = @
        return new Promise (r, e) ->
            f = me.path.asFileHandler()
            f.meta (d) ->
                if d.error
                    return r() unless me.parent
                    return me.parent.removeChild(me).then () ->
                        r()
                    .catch (msg) -> e msg
                else
                    f.remove (ret) ->
                        return e ret.error if ret.error
                        return r() unless me.parent
                        me.parent.removeChild(me).then () -> 
                            r()
                        .catch (msg) -> e msg

class BookletFolder extends BookletEntry
    constructor: (@type, @path, @hasMeta) ->
        super()
        @cnt = 0
        @nodes = []
        @metaFile = "#{@path}/meta.json".asFileHandler() if @hasMeta
        @descFile = "#{@path}/INTRO.md".asFileHandler()

    add: (chap) ->
        chap.parent = @
        @nodes.push chap
        @metaFile.dirty = true if @hasMeta and @metaFile
        chap.metaFile.dirty = true if chap.metaFile and chap.hasMeta
        @cnt = @cnt + 1

    removeChild: (child) ->
        me = @
        #v.treepath = v.path for v in @nodes if @nodes
        return new Promise (r, e) ->
            me.nodes.splice (me.nodes.indexOf child), 1
            #if me.nodes.includes child
            return r() unless me.hasMeta and me.metaFile
            me.metaFile.dirty = true
            me.updateMeta().then () ->
                r()
            .catch (msg) ->
                e msg
            

    size: () ->
        return @nodes.length
    
    mkdir: () ->
        me = @
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
            list[i] = v for v, i in me.nodes if me.type isnt 'section'
            me.mkdir().then () ->
                fn = (l) ->
                    return r() if l.length is 0
                    el = (l.splice 0, 1)[0]
                    el.mkdirs().then () ->
                        fn l
                    .catch (msg) -> e msg
                return fn list
            .catch (msg) -> e msg
            
    
    updateMeta: () ->
        me = @
        return new Promise (r, e) ->
            return r() unless me.metaFile.dirty
            entries = []
            entries[i] = v.path for v,i in me.nodes
            me.metaFile.cache = entries
            me.metaFile.write "object", (d) ->
                return e d.error if d.error
                me.metaFile.dirty = false
                console.log "saved " + me.metaFile.path
                r()
            
    
    update: () ->
        me = @
        return new Promise (r, e) ->
            me.updateMeta().then () ->
                return r() unless me.descFile.dirty
                me.descFile.write "text/plain", (d) ->
                    return e d.error if d.error
                    me.descFile.dirty = false
                    console.log "saved " + me.descFile.path
                    r()
            .catch (msg) -> e msg
                
    
    updateAll: () ->
        me = @
        return new Promise (r, e) ->
            list = []
            list[i] = v for v, i in me.nodes
            me.update().then () ->
                fn = (l) ->
                    return r() if l.length is 0
                    el = (l.splice 0, 1)[0]
                    el.updateAll().then () ->
                        fn l
                    .catch (msg) -> e msg
                return fn list
            .catch (msg) -> e msg

    toc: () ->
        @updateName()
        v.toc() for v in @nodes
        @
    

class Book extends BookletFolder
    constructor: (path) ->
        super 'book', path, true
        
    save:() ->
        me = @
        return new Promise (r, e) ->
            me.mkdirs().then () ->
                me.updateAll().then () ->
                    r()
                .catch (msg) -> e msg
            . catch (msg) -> e msg
    

class BookletChapter extends BookletFolder
    constructor: (book) ->
        path = "#{book.path}/c_#{book.cnt}"
        super 'chapter', path, true
        book.add @
                

class BookletSection extends BookletFolder
    constructor: (chapter) ->
        path = "#{chapter.path}/s_#{chapter.cnt}"
        super "section", path,  true
        chapter.add @
        

class BookletFile extends BookletEntry
    constructor: (@section) ->
        super()
        @hasMeta = false
        @type = "file"
        @path = "#{@section.path}/f_#{@section.cnt}.md"
        @descFile = @path.asFileHandler()
        @section.add @
        
    updateAll: ()->
        me = @
        return new Promise (r, e) ->
            return r() unless me.descFile.dirty
            me.descFile.write "text/plain", (d) ->
                return e d.error if d.error
                me.descFile.dirty = false
                console.log "saved" + me.descFile.path
                r()
    
    toc: () ->
        @updateName()
        @