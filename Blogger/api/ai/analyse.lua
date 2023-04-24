local args = ...

local ret = { 
    error = false,
    result = nil
}
local __dir__ = debug.getinfo(1).source:match("@?(.*/)")
LOG_DEBUG("CURRENT PATH:%s", __dir__)
local cluster = loadfile(__dir__.."/cluster.lua")()
local dbpath = require("vfs").ospath(args.dbpath)
LOG_DEBUG("DB PATH:%s", dbpath)

local gettext = {}
gettext.get = function(file)
    local db = DBModel:new{db=file}
    db:open()
    if not db then return nil end
    local data, sort = db:find("blogs", {
        where = { publish = 1 },
        fields = {"id", "content"}
    })
    db:close()
    if not data or #data == 0 then return nil end
    return data 
end

gettext.stopwords = function(ospath)
    local words = {}
    for line in io.lines(ospath) do
        words[line] = true
    end
    return words
end

local data = gettext.get(dbpath)
local documents = {}
if data then
    local sw = gettext.stopwords(__dir__.."/stopwords.txt")
    for k, v in pairs(data) do
        local bag = cluster.bow(data[k].content, sw)
        documents[data[k].id] = bag
    end

    cluster.tfidf(documents)
    --local v = cluster.search("arm", documents)
    --echo(JSON.encode(v))
    local vectors, maxv, size = cluster.get_vectors(documents)
    local analytical =  DBModel:new{db=dbpath}
    analytical:open()
    -- purge the table
    analytical:delete("st_similarity", nil)
    -- get similarity and put to the table
    for id, v in pairs(vectors) do
        local top = cluster.top_similarity(id, vectors, args.top, 0.1)
        for a, b in pairs(top) do
            local record = {pid = id, sid = a, score = b}
            analytical:insert("st_similarity", record)
        end
    end
    analytical:close()
    ret.result = "Analyse complete"
else
    ret.error = "Unable to query database for post"
end

return ret