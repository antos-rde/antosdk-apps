local path = require("fs/vfs").ospath("home://aiws/blog-clustering")
local gettext = loadfile(path.."/gettext.lua")()
local cluster = loadfile(path.."/cluster.lua")()

local refresh = false

local file = "/home/mrsang/test.csv"
if refresh then
    local data = gettext.get({publish=1})
    local documents = {}
    if data then
        local sw = gettext.stopwords("home://aiws/blog-clustering/stopwords.txt")
        for k,v in pairs(data) do
            local bag = cluster.bow(data[k].content, sw)
            documents[data[k].id] = bag
        end
        cluster.tfidf(documents)
        --local v = cluster.search("arm", documents)
        --echo(JSON.encode(v))
        local vectors, maxv, size = cluster.get_vectors(documents)
        local s = cluster.save_topchart(vectors,file, 3)
        if s then echo("file saved") else echo("error save file") end
        --echo(JSON.encode(r))
        --r = cluster.similarity(vectors["14"],vectors["16"])
        --echo("Similarity "..r)
        
        --local c,l = cluster.kmean(3, documents, 10)
        --echo(JSON.encode(c))
        --echo(JSON.encode(l))
    else
        echo("Data missing")
    end
else
    local f = io.open(file,"r")
    local result = {}
    for line in f:lines() do
        local arr = {}
        local cnt = 0
        for i in line:gmatch( "%S+") do
           cnt = cnt + 1
           arr[cnt] = i
        end
        if not result[arr[1]] then result[arr[1]] = {} end
        result[arr[1]][arr[2]] = tonumber(arr[3])
    end
    f:close()
    echo(JSON.encode(result))
    --local r = cluster.top_similarity("2",vectors, 3)
    --echo(JSON.encode(r))
end