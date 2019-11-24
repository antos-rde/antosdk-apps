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

    save: () ->
    
    remove: () ->
    
    rename: (newname) ->
    

class Book extends BookletFolder
    constructor: (@path, name) ->
        super name
        @chapters = []
        @metaFile = "#{@path}/meta.json".asFileHandler()
    
    addChapter: (chap) ->
        chap.book = @
        @chapters.push chap

    size: () ->
        return @chapters.length

    toc: () ->
        return {
            name: @name,
            path: @path,
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