class IOMail extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "IOMail", args
    
    main: () ->

IOMail.singleton = true

this.OS.register "IOMail", IOMail