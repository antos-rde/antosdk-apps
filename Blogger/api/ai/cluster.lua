local doclassify = {}
local st = require("stmr")
doclassify.bow = function(data, stopwords)
    -- first step get a table of worlds that contain
    -- world: occurences
    local bag = {}
    for w in data:gmatch('%w+') do
        local word = w:lower()
        if not stopwords[word] then
            word = st.stmr(word)
            if bag[word] then
                bag[word].count = bag[word].count + 1
            else
                bag[word] = {count=0, tf=0, tfidf=0.0}
                bag[word].count = 1
            end
        end
    end
    -- now calculate the tf of the bag
    for k,v in pairs(bag) do
        bag[k].tf = math.log(1 + bag[k].count)
    end
    return bag
end
doclassify.len = function(table)
    local cnt = 0
    for k,v in pairs(table) do cnt = cnt+1 end
    return cnt
end
doclassify.tfidf = function(documents)
    -- now for each term in a bag, calculate 
    -- the inverse document frequency, which 
    -- is a measure of how much information 
    -- the word provides, that is, whether the
    -- term is common or rare across all documents
    local ndoc = doclassify.len(documents)
    for k,bag in pairs(documents) do
        -- for eacht term in bag
        -- calculate its idf across all documents
        for term,b in pairs(bag) do
            local n = 0
            for id,doc in pairs(documents) do
                if doc[term] then n = n+1 end
            end
            --echo("term:"..term.." appears in"..n.." documents")
            b.tfidf = b.tf*math.log(ndoc/n)
        end
    end
    
end

doclassify.search = function(term, documents)
    local r = {}
    for id, doc in pairs(documents) do
        if doc[term:lower()] then
            r[id] = doc[term].tfidf
        end
    end
    return r
end

doclassify.get_vectors = function(documents)
    -- get a list of vector from documents
    local index = 0
    local vectors = {}
    local maps = {}
    local terms = {}
    local maxv = 0
    
    for id in pairs(documents) do
        maps[id] = {}
        vectors[id] = {}
    end 
    -- first loop, get the term
    for id, doc in pairs(documents) do
        for k,v in pairs(doc) do
            -- get max value
            if v.tfidf > maxv then
                maxv = v.tfidf
            end
            -- get the term
            if not terms[k] then
                index = index + 1
                terms[k] = index
            end
            for pid in pairs(documents) do
                if not maps[pid][k] then
                    if id == pid then
                        maps[pid][k] = v.tfidf
                    else
                        maps[pid][k] = 0
                    end
                else
                    if maps[pid][k] == 0 and id == pid then
                        maps[pid][k] = v.tfidf
                    end
                end
            end
        end
    end
    -- reindexing the vectors
    for id in pairs(documents) do
        for k,v in pairs(maps[id]) do
            vectors[id][terms[k]] = v
        end
    end
    --echo("Max tfidf "..maxv.." in document #"..maxid.." of term "..term)
    return vectors, maxv, index, terms
end

doclassify.similarity = function(va, vb)
    -- using cosin similarity
    local dotp = 0
    local maga = 0
    local magb = 0
    for k = 1,#va do
        dotp = dotp + va[k]*vb[k]
        maga = maga + va[k]*va[k]
        magb = magb + vb[k]*vb[k]
    end
    maga = math.sqrt(maga)
    magb = math.sqrt(magb)
    local d  = 0
    if maga ~= 0 and magb ~= 0 then
        d = dotp/ (magb*maga)
    end
    return d
end
doclassify.similarities = function(v1, collection)
    local similarities = {}
    assert(#v1 == #(collection[1]), "Incorrect vectors size")
    for i=1,#collection do
        similarities[i] = doclassify.similarity(v1, collection[i])
    end
    return similarities
end

doclassify.mean_similarity = function(v1, v2)
    assert(#v1 == #v2, "Incorrect vectors size")
    local similarities = {}
    for i = 1,#v1 do similarities[i] = doclassify.similarity(v1[i], v2[i]) end
    return doclassify.mean(similarities)
end
doclassify.similarity_chart = function(id, vectors)
    local vs = {}
    local cnt = 0
    local lut = {}
    for k,v in pairs(vectors) do
        if k ~= id then
            cnt = cnt + 1
            vs[cnt] = v
            lut[cnt] = k
        end
    end
    if not vs[1] then return {} end
    return doclassify.similarities(vectors[id], vs), lut
end

doclassify.top_similarity = function(id, vectors, n, th)
    local chart,lut = doclassify.similarity_chart(id,vectors)
    --echo(JSON.encode(chart))
    --echo(JSON.encode(lut))
    if not lut or #lut <= 0 then return nil end
    local top = {}
    
    local j=0
    local goon = true
    if not th then
        goon = false
        th = 0
    end
    
    while j < n or goon
    do
        local i,maxv = doclassify.argmax(chart)
        top[lut[i]] = maxv
        chart[i] = 0.0
        j=j+1
        if maxv < th and goon then
            goon = false
        end
    end
    
    --for j=1,n do
    --    local i,maxv = doclassify.argmax(chart)
    --    top[lut[i]] = maxv
    --    chart[i] = 0.0
    --end
    return top
    
end
doclassify.save_vectors = function(vectors, name)
    local f = io.open(name,"w")
    if f == nil then return false end
    for id, v in pairs(vectors) do
        f:write(id)
        for i=1,#v do f:write(","..v[i]) end
        f:write("\n")
    end
    f:close()
    return true
end
doclassify.save_topchart = function(vectors, name,n)
    local f = io.open(name,"w")
    if f == nil then return false end
    for k,v in pairs(vectors) do 
        local top = doclassify.top_similarity(k,vectors,n, 0.1)
        for a,b in pairs(top) do
            f:write(k.." "..a.." "..b.."\n")
        end
    end
    f:close()
    return true
end
doclassify.kmean = function(nclass, documents, maxstep, ids)
    -- now 
    local vectors, maxv, size = doclassify.get_vectors(documents)
    -- random centroids
    local centroids = {}
    local old_centroids = {}
    local clusters = {}
    --for pid in pairs(documents) do clusters[pid] = 0 end
    -- add noise to mean_vector
    for i = 1,nclass do
        if ids == nil then
            centroids[i] = doclassify.random(size,math.floor(maxv))
        else
            centroids[i] = vectors[ids[i]]
        end
        old_centroids[i] = doclassify.zeros(size)
    end
    
    -- loop until convergence or maxstep reached
    local similarity = doclassify.mean_similarity(centroids, old_centroids)
    local step = maxstep
    while 1.0-similarity > 1e-9 and step > 0 do
        clusters = {}
        --echo(JSON.encode(centroids))
        for id,v in pairs(vectors) do
            local similarities = doclassify.similarities(v, centroids)
            --echo(JSON.encode(similarities))
            local cluster, maxvalue = doclassify.argmax(similarities)
            --echo("doc #"..id.." is in clusters #"..cluster.." max value is "..maxvalue)
            clusters[id] = cluster
        end
        -- storing the old centroids
        old_centroids = centroids
        -- calculate new centroids
        local new_centroids = {}
        for class in pairs(centroids) do
            local cnt = 0
            local cvectors = {}
            for id,v in pairs(vectors) do
                if clusters[id] == class then
                    cnt = cnt + 1
                    cvectors[cnt] = v
                end
            end
            new_centroids[class] = doclassify.mean_vector(cvectors, size)
        end
        centroids = new_centroids
        --echo(JSON.encode(centroids))
        --echo(JSON.encode(old_centroids))
        similarity = doclassify.mean_similarity(centroids, old_centroids)
        echo("step #"..step..", similarity "..similarity)
        step = step - 1
    end
    local results = {}
    for i = 1,nclass do
        local list = {}
        local cnt = 0
        for id,c in pairs(clusters) do
            if c == i then
                cnt = cnt + 1
                list[cnt] = id
            end
        end
        results[i] = list
    end
    return results, clusters, centroids
end

doclassify.zeros = function(n)
    local vector = {}
    for i = 1,n do vector[i] = 0.0 end
    return vector
end

doclassify.random = function(n,maxv)
    local vector = {}
    for i=1,n do
        vector[i] = math.random() + math.random(0, maxv)
    end
    return vector
end

doclassify.sum = function(v)
    local sum  = 0.0
    for i=1,#v do sum = sum + v[i] end
    return sum
end

doclassify.mean = function(v)
    return doclassify.sum(v)/#v
    
end

doclassify.mean_vector = function(vectors, size)
    local means = doclassify.zeros(size)
    if not vectors or #vectors == 0 then return means end
    --local size = #(vectors[1])
    local times = 0
    for k,v in pairs(vectors) do
        for i=1,#v do means[i] = means[i] + v[i] end
        times = times + 1
    end
    for i = 1,size do means[i] = means[i]/times end
    return means
end

doclassify.argmin = function(v)
    local minv = 0.0
    local mini = 0.0
    for i = 1,#v do
        if v[i] <= minv then
            mini = i
            minv = v[i]
        end
    end
    --echo("min index"..mini.." val "..minv)
    return mini, minv
end

doclassify.argmax = function(v)
    local maxv = 0.0
    local maxi = 0.0
    for i = 1,#v do
        if v[i] >= maxv then
            maxi = i
            maxv = v[i]
        end
    end
    return maxi,maxv
end

return doclassify
