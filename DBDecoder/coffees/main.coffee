class DBDecoder extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "DBDecoder", args
    
    main: () ->
        bt = @find "decoder"
        @db = new @_api.DB("blogs")
        bt.onbtclick = (e) =>
            # decode the database
            @db.find("1=1").then (data) =>
                for v in data
                    v.content = atob(v.content)
                    v.rendered = atob(v.rendered)
                @saveDB(data).then () =>
                    @notify "Data base saved"
                .catch (e) => @error e.toString(), e
    
    saveDB: (list) ->
        new Promise (resolve, reject) =>
            return resolve() if list.length is 0
            record = list.shift()
            @db.save(record).then () =>
                @saveDB(list)
                    .then () => resolve()
                    .catch (e) => reject __e e
            .catch (e) => reject __e e
                

this.OS.register "DBDecoder", DBDecoder