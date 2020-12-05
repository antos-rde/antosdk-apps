local arg = ...

ulib = require("ulib")
sqlite =  modules.sqlite()
vfs = require("vfs")

local handle = {}
local docpath = nil
local dbpath = nil

local result = function(data)
    return {
        error = false,
        result = data
    }
end

local error = function(data)
    return {
        error = data,
        result = false
    }
end

local mkdirp =function(p)
    if not vfs.exists(p) then
        if not vfs.mkdir(p) then
            return false, error("Unable to create directory: "..p)
        end
    end
    return true, nil
end

local merge_files = function(data)
    local firstfile = data.file[1]
    local fpath = docpath.."/"..data.cid
    local r, e = mkdirp(fpath)
    if not r then return e end
    fpath = fpath.."/"..os.date("%d-%m-%Y_%H_%M_%S")..".pdf"
    -- concat the files
    if #data.file > 1 then
        local cmd = "gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile="..vfs.ospath(fpath)
        for i,v in ipairs(data.file) do
           cmd = cmd.." \""..vfs.ospath(v).."\""
        end
        os.execute(cmd)
        if not vfs.exists(fpath) then
            return error("Unable to merge PDF files")
        end
        cmd = "chmod 777 "..vfs.ospath(fpath)
        os.execute(cmd)
    else
        local cmd = "mv \""..vfs.ospath(firstfile).."\" \""..vfs.ospath(fpath).."\""
        os.execute(cmd)
        if not vfs.exists(fpath) then
            return error("Unable to move PDF file")
        end
    end
    -- move the thumb file to the cache folder
    local thumb = docpath.."/cache/"..std.sha1(firstfile:gsub(docpath, ""))..".png"
    local desthumb = docpath.."/cache/"..std.sha1(fpath:gsub(docpath, ""))..".png"
    if vfs.exists(thumb) then
        vfs.move(thumb, desthumb)
    end
    -- remove all other thumb files
    for i,v in ipairs(data.file) do
        thumb = docpath.."/cache/"..std.sha1(v:gsub(docpath, ""))..".png"
        if vfs.exists(thumb) then
            vfs.delete(thumb)
        end
        -- delete all files
        if vfs.exists(v) then
            vfs.delete(v)
        end
    end
    return result(fpath)
end

handle.init = function(args)
    
    local r, e = mkdirp(docpath)
    if not r then return e end
    
    r, e = mkdirp(docpath.."/unclassified")
    if not r then return e end
    
    r, e = mkdirp(docpath.."/cache")
    if not r then return e end
    
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to initialized database "..dbpath)
    end
    local sql
    -- check if table exists
    if sqlite.hasTable(db, "categories") == 0 then
        -- create the table
        sql = [[
        CREATE TABLE "categories" (
            "id"    INTEGER,
            "name"  TEXT NOT NULL,
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        ]]
        if sqlite.query(db, sql) ~= 1 then
            sqlite.dbclose(db)
            return error("Unable to create table categories")
        end
        -- insert unknown category
        sql = [[
        INSERT INTO categories("id","name") VALUES (0,'Uncategoried');
        ]]
        if sqlite.query(db, sql) ~= 1 then
            sqlite.dbclose(db)
            return error("Unable to create default category")
        end
    end
    
    if sqlite.hasTable(db, "owners") == 0 then
        -- create the table
        sql = [[
        CREATE TABLE "owners" (
            "id"    INTEGER,
            "name"  TEXT NOT NULL,
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        ]]
        if sqlite.query(db, sql) ~= 1 then
            sqlite.dbclose(db)
            return error("Unable to create table owners")
        end
        -- insert unknown category
        sql = [[
        INSERT INTO owners("id","name") VALUES (0,'None');
        ]]
        if sqlite.query(db, sql) ~= 1 then
            sqlite.dbclose(db)
            return error("Unable to create default None owner")
        end
    end
    
    if sqlite.hasTable(db, "docs") == 0 then
        -- create the table
        sql = [[
        CREATE TABLE "docs" (
            "id"    INTEGER,
            "name"  TEXT NOT NULL,
            "ctime" INTEGER,
            "day"   INTEGER,
            "month" INTEGER,
            "year"  INTEGER,
            "cid"   INTEGER DEFAULT 0,
            "oid"   INTEGER DEFAULT 0,
            "file"  TEXT NOT NULL,
            "tags"  TEXT,
            "note"  TEXT,
            "mtime" INTEGER,
            FOREIGN KEY("oid") REFERENCES "owners"("id") ON DELETE SET DEFAULT ON UPDATE NO ACTION,
            FOREIGN KEY("cid") REFERENCES "categories"("id") ON DELETE SET DEFAULT ON UPDATE NO ACTION,
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        ]]
        if sqlite.query(db, sql) ~= 1 then
            sqlite.dbclose(db)
            return error("Unable to create table docs")
        end
    end
    sqlite.dbclose(db)
    return result("Docify initialized")
end

handle.select = function(param)
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to get database "..dbpath)
    end
    local r = sqlite.select(db, param.table, "*", param.cond)
    sqlite.dbclose(db)
    if r == nil then
        return error("Unable to select data from "..param.table)
    else
        return result(r)
    end
end

handle.fetch = function(table)
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to get database "..dbpath)
    end
    local r = sqlite.select(db, table, "*", "1=1")
    sqlite.dbclose(db)
    if r == nil then
        return error("Unable to fetch data from "..table)
    else
        return result(r)
    end
end

handle.insert = function(param)
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to get database "..dbpath)
    end
    local keys = {}
    local values = {}
    for k,v in pairs(param.data) do
        if k ~= "id" then
            table.insert(keys,k)
            if type(v) == "number" then
                table.insert(values, v)
            elseif type(v) == "boolean" then
                table.insert( values, v and 1 or 0 )
            else
                local t = "\""..v:gsub('"', '""').."\""
                table.insert(values,t)
            end
        end
    end
    local sql = "INSERT INTO "..param.table.." ("..table.concat(keys,',')..') VALUES ('
    sql = sql..table.concat(values,',')..');'
    local r = sqlite.query(db, sql)
    sqlite.dbclose(db)
    if r == nil then
        return error("Unable to insert data to "..param.table)
    else
        return result("Data inserted")
    end
end

handle.preview = function(path)
    -- convert -resize 300x500 noel.pdf[0] thumb.png
    local name = std.sha1(path:gsub(docpath,""))..".png"
    -- try to find the thumb
    local tpath = docpath.."/cache/"..name
    if not vfs.exists(tpath) then
        -- regenerate thumb
        local cmd = "convert -resize 250x500 \""..vfs.ospath(path).."\"[0] "..vfs.ospath(tpath)
        os.execute(cmd)
    end
    
    if vfs.exists(tpath) then
        local cmd = "chmod 777 "..vfs.ospath(tpath)
        os.execute(cmd)
        return result(tpath)
    else
        return error("do not exist")
    end
end

handle.get_doc = function(id)
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to get database "..dbpath)
    end
    local r = sqlite.select(db, "docs", "*", "id = "..id)
    if r == nil or #r == 0 then
        sqlite.dbclose(db)
        return error("Unable to select data from "..param.table)
    else
        r = r[1]
        local o = sqlite.select(db, "owners", "*", "id = "..r.oid)
        sqlite.dbclose(db)
        if o == nil or #o == 0 then
            return result(r)
        else
            o = o[1]
            r.owner = o.name
            if r.ctime then
                r.ctime = os.date("%d/%m/%Y %H:%M:%S", r.ctime)
            end
            
            if r.mtime then
                r.mtime = os.date("%d/%m/%Y %H:%M:%S", r.mtime)
            end
            local edate = ""
            return result(r)
        end
    end
end

handle.deletedoc = function(param)
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to get database "..dbpath)
    end
    local sql = "DELETE FROM docs WHERE id="..param.id..";"
    local ret = sqlite.query(db, sql) == 1
    sqlite.dbclose(db)
    if not ret then
        return error("Unable to delete doc meta-data from database")
    end
    -- move file to unclassified
    local newfile = docpath.."/unclassified/"..std.basename(param.file)
    vfs.move(param.file, newfile)
    -- delete thumb file
    local thumb = docpath.."/cache/"..std.sha1(param.file:gsub(docpath,""))..".png"
    if vfs.exists(thumb) then
        vfs.delete(thumb)
    end
    return result("Document entry deleted")
end

handle.updatedoc = function(param)
    local r = merge_files(param.data)
    if r.error then return r end

    if param.rm then
        -- move ve the old file to unclassified
        local newfile = docpath.."/unclassified/"..std.basename(param.rm)
        if vfs.exists(param.rm) then
            vfs.move(param.rm, newfile)
        end
        -- move the thumb file if needed
        local thumb = docpath.."/cache/"..std.sha1(param.rm:gsub(docpath,""))..".png"
        local newwthumb = docpath.."/cache/"..std.sha1(newfile:gsub(docpath, ""))..".png"
        if vfs.exists(thumb) then
            vfs.move(thumb, newwthumb)
        end
    end
    param.data.file = r.result
    print(r.result)
    param.data.mtime = os.time(os.date("!*t"))
    return handle.update({
        table = "docs",
        data = param.data
    })
end


handle.insertdoc = function(data)
    local r = merge_files(data)
    if r.error then return r end
    -- save data
    data.file = r.result
    data.ctime = os.time(os.date("!*t"))
    data.mtime = os.time(os.date("!*t"))
    local ret = handle.insert({
        table = "docs",
        data = data
    })
    return ret
end

handle.update = function(param)
    if not param.data.id or param.data.id == 0 then
        return error("Record id is 0 or not found")
    end
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to get database "..dbpath)
    end
    local lst = {}
    for k,v in pairs(param.data) do
        if(type(v)== "number") then
            table.insert(lst,k.."="..v)
        elseif type(v) == "boolean" then
            table.insert( lst, k.."="..(v and 1 or 0) )
        else
            table.insert(lst,k.."=\""..v:gsub('"', '""').."\"")
        end
    end
    
    local sql = "UPDATE "..param.table.." SET "..table.concat(lst,",").." WHERE id="..param.data.id..";"
    local r =  sqlite.query(db, sql)
    sqlite.dbclose(db)
    if r == nil then
        return error("Unable to update data to "..param.table)
    else
        return result("Data Updated")
    end
end

handle.delete = function(param)
    if param.id == 0 then
        return error("Record with id = 0 cannot be deleted")
    end
    
    local db = sqlite._getdb(vfs.ospath(dbpath))
    if not db then
        return error("Unable to get database "..dbpath)
    end
    local sql = "DELETE FROM "..param.table.." WHERE id="..param.id..";"
	local r =  sqlite.query(db, sql)
    sqlite.dbclose(db)
    if r == nil then
        return error("Unable to delete data from "..param.table)
    else
        return result("Data deleted")
    end
end


if arg.action and handle[arg.action] then
    -- check if the database exits
    docpath = arg.docpath
    dbpath =  docpath.."/docify.db"
    
    return handle[arg.action](arg.args)
else
    return error("Invalid action parameter")
end