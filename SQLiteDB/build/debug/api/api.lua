-- collecting arguments
local args=...

-- require libs
local vfs = require("vfs")

-- helper functions
local result = function(data)
    return { error = false, result = data }
end

local error = function(msg,...)
    local err_msg = string.format(msg or "ERROR",...)
    return {error = err_msg, result = false}
end

-- handler object
local handle = {}

-- Handle functions defined here

handle.init = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("init: Unable to open sqlite db file")
    end
    sqlite.dbclose(db)
    return result(true)
end

handle.update = function(data)
    if not data.table_name or not data.record or not data.db_source then
        return error("update: Invalid request data")
    end
    if not data.record.id then
        return error("update: unknown record id for record")
    end
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("update: Unable to open sqlite db file")
    end
    local tb = {}
    local gen = SQLQueryGenerator:new({})
    for k,v in pairs(data.record) do
        if k ~= data.pk then
            table.insert(tb, string.format("%s=%s", k, gen:parse_value(v, {[type(v)] = true})))
        end
    end
    local sql = string.format("UPDATE  %s SET %s  WHERE id = %d", data.table_name, table.concat(tb,","), data.record.id)
    LOG_DEBUG("Execute query: [%s]", sql)
    local ret, err = sqlite.exec(db, sql);
    sqlite.dbclose(db)
    if not ret then
        return error("insert: Unable to insert to %s: %s", data.table_name, err)
    else
        return result(ret)
    end
end

handle.drop_table = function(data)
    if not data.table_name  or not data.db_source then
        return error("drop_table: Invalid request data")
    end
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("drop_table: Unable to open sqlite db file")
    end
    local sql = string.format("DROP TABLE IF EXISTS  %s;", data.table_name)
    LOG_DEBUG("Execute query: [%s]", sql)
    local ret, err = sqlite.exec(db, sql);
    sqlite.dbclose(db)
    if not ret then
        return error("drop_table: Unable to drop table %s: %s", data.table_name, err)
    else
        return result(ret)
    end
end

handle.insert = function(data)
    if not data.table_name or not data.record or not data.db_source then
        return error("insert: Invalid request data")
    end
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("insert: Unable to open sqlite db file")
    end
    local keys = {}
    local vals = {}
    local gen = SQLQueryGenerator:new({})
    for k,v in pairs(data.record) do
        if k ~= data.pk then
            table.insert(keys,k)
            table.insert(vals,gen:parse_value(v, {[type(v)] = true}))
        end
    end
    local sql = string.format("INSERT INTO  %s (%s) VALUES(%s)", data.table_name, table.concat(keys,","), table.concat(vals,","))
    LOG_DEBUG("Execute query: [%s]", sql)
    local ret, err = sqlite.exec(db, sql)
    local id = sqlite.last_insert_id(db)
    sqlite.dbclose(db)
    if not ret then
        return error("insert: Unable to insert to %s: %s", data.table_name, err)
    else
        
        return result(id)
    end
end

handle.create_table = function(data)
    if not data.table_name or not data.scheme or not data.db_source then
        return error("create_table: Invalid request data")
    end
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("create_table: Unable to open sqlite db file")
    end
    local tb = {}
    for k,v in pairs(data.scheme) do
        if k ~= "id" then
            table.insert(tb, k.." "..v)
        end
    end
    local sql = string.format("CREATE TABLE IF NOT EXISTS %s(id INTEGER PRIMARY KEY,%s)", data.table_name, table.concat(tb,","))
    LOG_DEBUG("Execute query: [%s]", sql)
    local ret,err = sqlite.exec(db, sql);
    sqlite.dbclose(db)
    if not ret then
        return error("create_table: Unable to create table %s with the provided scheme: %s", data.table_name, err)
    else
        return result(ret)
    end
end

handle.select = function(data)
    if not data.filter then
        return error("select: No filter provided")
    end
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("select: Unable to open sqlite db file")
    end
    local generator = SQLQueryGenerator:new(data.filter)
    local r,sql = generator:sql_select()
    if not r then
        return error(sql)
    end
    LOG_DEBUG("Execute query: %s", sql);
    local ret, err = sqlite.query(db, sql);
    sqlite.dbclose(db)
    if not ret then
        return error("select: error executing query statement: %s ", err)
    end
    return result(ret)
end


handle.delete_records = function(data)
    if not data.filter then
        return error("delete_records: No filter provided")
    end
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("delete_records: Unable to open sqlite db file")
    end
    local generator = SQLQueryGenerator:new(data.filter)
    local r,sql = generator:sql_delete()
    if not r then
        return error(sql)
    end
    LOG_DEBUG("Execute query: %s", sql);
    local ret, err = sqlite.exec(db, sql);
    sqlite.dbclose(db)
    if not ret then
        return error("delete_records: error executing query statement: %s ", err)
    end
    return result(ret)
end


handle.table_scheme = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("table_scheme: Unable to open sqlite db file")
    end
    local sql = string.format("SELECT p.name, p.type, p.pk FROM  sqlite_master AS m JOIN pragma_table_info(m.name) AS p WHERE m.type ='table' AND m.name = '%s'", data.table_name)
    local ret, err = sqlite.query(db, sql);
    sqlite.dbclose(db)
    if not ret then
        return error("table_scheme: error executing query statement: %s", err)
    end
    return result(ret)
end


handle.list_table = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("list_table: Unable to open sqlite db file")
    end
    local sql = "SELECT name FROM sqlite_master WHERE type ='table'"
    local ret, err = sqlite.query(db, sql)
    
    sqlite.dbclose(db)
    if not ret then
        return error("table_scheme: error executing query statement: %s", err)
    end
    return result(ret)
end

handle.last_insert_id = function(data)
    local os_path = vfs.ospath(data.db_source)
    local db = sqlite.db(os_path)
    if not db then
        return error("last_insert_id: Unable to open sqlite db file")
    end
    local ret = sqlite.last_insert_id(db)
    sqlite.dbclose(db)
    return result(ret)
end

-- dispatching action
if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end