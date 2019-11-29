
class BookletEntry
    constructor: (@name) ->
        @loaded = true
        
    save: () ->
    
    remove: () ->
    
    toc: () ->

    
    updateName:() ->
        return @name unless @descFile.dirty
        t = (new RegExp "^\s*#+(.*)\n", "g").exec @descFile.cache
        return @name unless t and t.length is 2
        @metaFile.dirty = true if @hasMeta and @metaFile
        @parent.metaFile.dirty = true if @parent and @parent.hasMeta and @parent.metaFile
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
        super "Untitle"
        @init()
    
    init: () ->
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
    read: (folderPath) ->
        me = @
        return new Promise (r, e) ->
            me.path = folderPath
            me.init()
            me.loaded = false
            me.metaFile.meta (d) ->
                return e d.error if d.error
                me.metaFile.read (data) ->
                    # load all child
                    me.name = data.name
                    list = []
                    list[i] = v for v,i in data.entries
                    fn = (l) ->
                        if l.length is 0
                            me.cnt = data.cnt
                            return r() 
                        el = (l.splice 0, 1)[0]
                        #console.log "create", el.type
                        obj = new NS[el.type]( me )
                        obj.name = el.name
                        obj.read(el.path).then () ->
                            fn l
                        .catch (msg) ->
                            fn l
                            
                    return fn list
                , "json"

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
            list[i] = v for v, i in me.nodes if me.type isnt 'Section'
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
            entries[i] = {name: v.name, path:v.path, type:v.type} for v,i in me.nodes
            data = {
                name: me.name,
                entries: entries,
                cnt: me.cnt,
                meta: me.hasMeta
            }
            me.metaFile.cache = data
            me.metaFile.write "object", (d) ->
                return e d.error if d.error
                me.metaFile.dirty = false
                #console.log "saved " + me.metaFile.path
                r()
            
    
    update: () ->
        me = @
        return new Promise (r, e) ->
            me.updateMeta().then () ->
                return r() unless me.descFile.dirty
                me.descFile.write "text/plain", (d) ->
                    return e d.error if d.error
                    me.descFile.dirty = false
                    #console.log "saved " + me.descFile.path
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
    

class BookletBook extends BookletFolder
    constructor: (path) ->
        super 'Book', path, true
        
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
        super 'Chapter', path, true
        book.add @
                

class BookletSection extends BookletFolder
    constructor: (chapter) ->
        path = "#{chapter.path}/s_#{chapter.cnt}"
        super "Section", path,  true
        chapter.add @
        

class BookletFile extends BookletEntry
    constructor: (@section) ->
        super "Untitle file"
        @hasMeta = false
        @type = "File"
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
                #console.log "saved" + me.descFile.path
                r()
    
    read: (p) ->
        me = @
        return new Promise (r, e) ->
            me.loaded = false
            me.treepath = p
            r() 
    
    toc: () ->
        @updateName()
        @

NS =
    Book: BookletBook
    Chapter: BookletChapter
    Section: BookletSection
    File: BookletFile