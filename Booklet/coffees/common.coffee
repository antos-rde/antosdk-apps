
class BookletEntry
    constructor: (@text) ->
        @loaded = true
        
    save: () ->
    
    remove: () ->
    
    toc: () ->

    
    updateName:() ->
        # return @text unless @descFile.dirty
        t = (new RegExp "^\s*#+(.*)\n", "g").exec @descFile.cache
        return @text unless t and t.length is 2
        @metaFile.dirty = true if @hasMeta and @metaFile
        @parent.metaFile.dirty = true if @parent and @parent.hasMeta and @parent.metaFile
        @text =  t[1].trim()
    
    remove: () ->
        return new Promise (r, e) =>
            f = @path.asFileHandle()
            f.meta().then (d) =>
                    f.remove().then (ret) =>
                        return r() unless @parent
                        @parent.removeChild(@).then () -> 
                            r()
                        .catch (msg) -> e __e msg
                    .catch (msg) -> e __e msg
            .catch (msg) =>
                return r() unless @parent
                return @parent.removeChild(@).then () ->
                    r()
                .catch (msg) -> e __e msg

class BookletFolder extends BookletEntry
    constructor: (@type, @path, @hasMeta) ->
        super "Untitle"
        @init()
    
    init: () ->
        @cnt = 0
        @nodes = []
        @metaFile = "#{@path}/meta.json".asFileHandle() if @hasMeta
        @descFile = "#{@path}/INTRO.md".asFileHandle()

    up: (node) ->
        return unless node
        idx = @nodes.indexOf node
        return unless idx > 0
        @nodes.splice idx, 1
        @nodes.splice idx-1, 0, node
    
    down: (node) ->
        return unless node
        idx = @nodes.indexOf node
        return unless idx >= 0 and idx < @nodes.length - 1
        @nodes.splice idx, 1
        @nodes.splice idx + 1, 0, node
        

    add: (chap) ->
        chap.parent = @
        chap.root = @root
        @nodes.push chap
        @metaFile.dirty = true if @hasMeta and @metaFile
        chap.metaFile.dirty = true if chap.metaFile and chap.hasMeta
        @cnt = @cnt + 1

    removeChild: (child) ->
        
        #v.treepath = v.path for v in @nodes if @nodes
        return new Promise (r, e) =>
            @nodes.splice (@nodes.indexOf child), 1
            #if @nodes.includes child
            return r() unless @hasMeta and @metaFile
            @metaFile.dirty = true
            @updateMeta().then () ->
                r()
            .catch (msg) -> e __e msg
            
    read: (folderPath) ->
        
        return new Promise (r, e) =>
            @path = folderPath
            @init()
            @loaded = false
            @metaFile.meta().then (d) =>
                @metaFile.read("json").then (data) =>
                    # load all child
                    @text = data.name
                    list = []
                    list[i] = v for v,i in data.entries
                    fn = (l) =>
                        if l.length is 0
                            @cnt = data.cnt
                            return r() 
                        el = (l.splice 0, 1)[0]
                        obj = new NS[el.type]( @ )
                        obj.name = el.name
                        obj.read(el.path.replace("book://", @root)).then () =>
                            fn l
                        .catch (msg) =>
                            fn l
                            
                    return fn list
                .catch (msg) -> e __e msg
            .catch (msg) -> e __e msg

    size: () ->
        return @nodes.length
    
    mkdir: () ->
        
        return new Promise (r, e) =>
            dir = @path.asFileHandle()
            dir.meta().then (d) =>
                return r()
            .catch (ex) =>
                bname = dir.basename
                dir = dir.parent().asFileHandle()
                dir.mk bname
                    .then (result) => r()
                    .catch (msg) -> e __e msg
    
    mkdirs: () ->
        
        return new Promise (r, e) =>
            list = []
            list[i] = v for v, i in @nodes if @type isnt 'Section'
            @mkdir().then () =>
                fn = (l) =>
                    return r() if l.length is 0
                    el = (l.splice 0, 1)[0]
                    el.mkdirs().then () =>
                        fn l
                    .catch (msg) -> e __e msg
                return fn list
            .catch (msg) -> e __e msg
            
    
    updateMeta: () ->
        
        return new Promise (r, e) =>
            return r() unless @metaFile.dirty
            entries = []
            entries[i] = {name: v.name, path:v.path.replace( @root, "book://" ), type:v.type} for v,i in @nodes
            data = {
                name: @text,
                entries: entries,
                cnt: @cnt,
                meta: @hasMeta
            }
            @metaFile.cache = data
            @metaFile.write "object"
                .then (d) =>
                    @metaFile.dirty = false
                    r()
                .catch (msg) -> e __e msg
            
    
    update: () ->
        
        return new Promise (r, e) =>
            @updateMeta().then () =>
                return r() unless @descFile.dirty
                @descFile.write "text/plain"
                    .then (d) =>
                        @descFile.dirty = false
                        #console.log "saved " + @descFile.path
                        r()
                    .catch (msg) -> e __e msg
            .catch (msg) -> e __e msg
                
    
    updateAll: () ->
        
        return new Promise (r, e) =>
            list = []
            list[i] = v for v, i in @nodes
            @update().then () =>
                fn = (l) =>
                    return r() if l.length is 0
                    el = (l.splice 0, 1)[0]
                    el.updateAll().then () =>
                        fn l
                    .catch (msg) -> e __e msg
                return fn list
            .catch (msg) -> e __e msg

    toc: () ->
        @updateName()
        v.toc() for v in @nodes
        @
    

class BookletBook extends BookletFolder
    constructor: (path) ->
        super 'Book', path, true
    
    init: () ->
        super.init()
        @root = @path
        
    save:() ->
        
        return new Promise (r, e) =>
            @mkdirs().then () =>
                @updateAll().then () =>
                    r()
                .catch (msg) -> e __e msg
            . catch (msg) -> e __e msg
    

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
        @descFile = @path.asFileHandle()
        @section.add @
        
    updateAll: ()->
        
        return new Promise (r, e) =>
            return r() unless @descFile.dirty
            @descFile.write "text/plain"
                .then (d) =>
                    @descFile.dirty = false
                    #console.log "saved" + @descFile.path
                    r()
                .catch (msg) => e __e msg
    
    read: (p) ->
        return new Promise (r, e) =>
            @loaded = false
            @treepath = p
            @path = p
            @descFile = @path.asFileHandle()
            r() 
    
    toc: () ->
        @updateName()
        @

NS =
    Book: BookletBook
    Chapter: BookletChapter
    Section: BookletSection
    File: BookletFile