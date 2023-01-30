-- collecting arguments
local args=...

-- require libs
local vfs = require("vfs")
local sqlite = modules.sqlite()

-- helper functions
local result = function(data)
    return { error = false, result = data }
end

local error = function(msg)
    return {error = msg, result = false}
end

-- handler object
local handle = {}

-- Handle functions defined here

handle.init = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite._getdb(os_path)
    if not db then
        return error("Unable to open sqlite db file")
    end
    sqlite.dbclose(db)
    return result(true)
end

handle.query = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite._getdb(os_path)
    if not db then
        return error("Unable to open sqlite db file")
    end
    local ret = sqlite.query(db, data.query)
    sqlite.dbclose(db)
    if ret ~= 1 then
        return error("error executing query")
    end
    return result(true)
end

handle.select = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite._getdb(os_path)
    if not db then
        return error("Unable to open sqlite db file")
    end
    local ret = sqlite.select(db, data.table, data.fields, data.cond);
    sqlite.dbclose(db)
    if not ret then
        return error("error executing select statement")
    end
    return result(ret)
end

handle.last_insert_id = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite._getdb(os_path)
    if not db then
        return error("Unable to open sqlite db file")
    end
    local ret = sqlite.lastInsertID(db)
    sqlite.dbclose(db)
    return result(ret)
end

-- dispatching action
if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end