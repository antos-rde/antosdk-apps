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

handle.save = function()
    print(JSON.encode(REQUEST))
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
        print("download to"..file)
        if not web.download(data.url, file) then
            print("Unable to download")
            return error("Unable to save file")
        end
    end
    
    return result("OK")
end

print(JSON.encode(args))

if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end
