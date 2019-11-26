class BookletEntry
    constructor: (@name) ->
        @markAsDirty()
    save: () ->
    
    remove: () ->
        
    markAsDirty: () -> @dirty = true
    markAsClean: () -> @dirty = false
    
    toc: () ->

class BookletFolder extends BookletEntry
    constructor: (name) ->
        super name

    save: (apif) ->
    
    remove: (apif) ->
    
    rename: (newname) ->
    

class Book extends BookletFolder
    constructor: (@path, name) ->
        super name
        @chapters = []
        @metaFile = "#{@path}/meta.json".asFileHandler()
        @descFile = "#{@path}/book.md".asFileHandler()
    
    addChapter: (chap) ->
        chap.book = @
        @chapters.push chap

    size: () ->
        return @chapters.length
    
    save:(handle) ->
        v.save handle for v in @chapters
        me = @
        if @dirty
            if @descFile.dirty
                @descFile.write "text/plain", (r) ->
                    handle.error __("Fail to save file {0}: {1}", me.descFile.path, r.error) if r.error
            @metaFile.cache = @toc()
            @metaFile.dirty = true
            @metaFile.write "object", (r) ->
                return handle.error __("Fail to write book meta: {0}", r.error)
                me.markAsClean
                handle.notify __("Book saved")

    toc: () ->
        return {
            name: @name,
            path: @path,
            description: @descFile.path,
            meta: @metaFile.path,
            entries: v.toc() for v in @chapters
        }

class BookletChapter extends BookletFolder
    constructor: (@book, name) ->
        super name
        @book.addChapter @
        @sections = []
        @path = "#{@book.path}/#{@book.size()}"
        @metaFile = "#{@path}/meta.json".asFileHandler()
        @descFile = "#{@path}/chapter.md".asFileHandler()
        
    addSection: (sec) ->
        sec.chapter = @
        @sections.push sec
    
    size: () ->
        return @sections.length
    
    toc: () ->
        return {
            name: @name,
            path: @path,
            meta: @metaFile.path,
            description: @descFile.path,
            entries: v.toc() for v in @sections
        }

class BookletSection extends BookletFolder
    constructor: (@chapter, name) ->
        super name
        @chapter.addSection @
        @path = "#{@chapter.path}/#{@chapter.size()}"
        @files = []
        @descFile = "#{@path}/section.md".asFileHandler()

    addFile: (file) ->
        file.section = @
        @files.push file
    
    toc: () ->
        return {
            name: @name,
            path: @path,
            description: @descFile.path,
            entries: v.toc() for v in @files
        }
    
    size: () ->
        return @files.length

class BookletFile extends BookletEntry
    constructor: (@section) ->
        super ""
        @section.addFile @
        @path = "#{@section.path}/#{@section.size()}.md"
        @handle = @path.asFileHandler()
        
    getTitle: () ->
        
    toc: () ->
        return {
            name: @name,
            path: @path
        }