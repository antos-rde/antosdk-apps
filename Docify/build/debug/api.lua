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
        local cmd = "convert -resize 200x500 "..vfs.ospath(path).."[0] "..vfs.ospath(tpath)
        os.execute(cmd)
    end
    
    if vfs.exists(tpath) then
        local cmd = "rm "..vfs.ospath(tpath)
        os.execute(cmd)
        return result("exist")
    else
        return error("do not exist")
    end
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