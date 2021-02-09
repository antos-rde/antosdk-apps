local args=...
local web = require("web")
local vfs = require("vfs")

if not args then
    args = REQUEST
end

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

local handle = {}

handle.token = function()
    return result("sessionid="..SESSION.sessionid)
end

handle.duplicate = function(data)
    local file = vfs.ospath(data.as)
    local tmpfile = "/tmp/"..std.sha1(file)
    local cmd = "curl -o "..tmpfile..' "'..data.remote..'"'
    os.execute(cmd)
    -- move file to correct position
    if ulib.exists(tmpfile) then
        cmd = "mv "..tmpfile.." "..file
        os.execute(cmd)
        print("File "..file.." is duplicated with remote")
    else
        return error("Unable to duplicate file")
    end
    return result("File duplicated")
end

handle.save = function()
    --print(JSON.encode(REQUEST))
    if not REQUEST.json then
        return error("Invalid request")
    end
    local data = JSON.decodeString(REQUEST.json)
    if not data then
        return error("Invalid request")
    end
    if not REQUEST.file then
        return error("No file found")
    end
    local file = vfs.ospath(REQUEST.file)
    if data.status == 2 then
        local tmpfile = "/tmp/"..std.sha1(file)
        local cmd = "curl -o "..tmpfile..' "'..data.url..'"'
        os.execute(cmd)
        -- move file to correct position
        if ulib.exists(tmpfile) then
            cmd = "mv "..tmpfile.." "..file
            os.execute(cmd)
            print("File "..file.." sync with remote")
        else
            return error("Unable to download")
        end
    end
    
    return result("OK")
end

--print(JSON.encode(args))

if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end
