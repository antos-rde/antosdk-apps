class BookletEntry
    constructor: () ->
        @markAsDirty()
    save: () ->
    
    remove: () ->
        
    markAsDirty: () -> @dirty = true
    markAsClean: () -> @dirty = false
    
    toc: () ->
    
    titleFromFile:(file) ->
        content = file.cache
        title = (new RegExp "^#+(.*)\n", "g").exec content
        return "Untitled" unless title and title.length is 2
        return title[1].trim()

class BookletFolder extends BookletEntry
    constructor: () ->
        super()

    save: (apif) ->
    
    remove: (apif) ->
    
    rename: (newname) ->
    

class Book extends BookletFolder
    constructor: (@path) ->
        super()
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
            target: @,
            name: @titleFromFile(@descFile),
            nodes: v.toc() for v in @chapters,
            type: 'book'
        }

class BookletChapter extends BookletFolder
    constructor: (@book) ->
        super()
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
            target: @,
            name: @titleFromFile(@descFile),
            nodes: v.toc() for v in @sections,
            type: 'chapter'
        }
    
    save:(handle) ->
        v.save handle for v in @sections
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
                handle.notify __("chapter saved")
                

class BookletSection extends BookletFolder
    constructor: (@chapter) ->
        super()
        @chapter.addSection @
        @path = "#{@chapter.path}/#{@chapter.size()}"
        @files = []
        @descFile = "#{@path}/section.md".asFileHandler()

    addFile: (file) ->
        file.section = @
        @files.push file
    
    toc: () ->
        return {
            target: @,
            name: @titleFromFile(@descFile),
            nodes: v.toc() for v in @files,
            type: 'section'
        }
    
    save: () ->
        v.save handle for v in @sections
        me = @
        if @dirty
            if @descFile.dirty
                @descFile.write "text/plain", (r) ->
                    handle.error __("Fail to save file {0}: {1}", me.descFile.path, r.error) if r.error
                    me.markAsClean
                    handle.notify __("section saved")
    
    size: () ->
        return @files.length

class BookletFile extends BookletEntry
    constructor: (@section) ->
        super()
        @section.addFile @
        @path = "#{@section.path}/#{@section.size()}.md"
        @descFile = @path.asFileHandler()
        
    getTitle: () ->
        console.log "hello"
    save: (handle) ->
        v.save @descFile for v in @sections
        me = @
        if @dirty
            if @descFile.dirty
                @descFile.write "text/plain", (r) ->
                    handle.error __("Fail to save file {0}: {1}", me.descFile.path, r.error) if r.error
                    me.markAsClean
                    handle.notify __("Book saved")
    toc: () ->
        return {
            target: @,
            name: @titleFromFile(@handle),
            type: 'file'
        }