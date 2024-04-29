local args=...

--LOG_ROOT = ulib.getenv("HOME")

if not args then
    args = REQUEST
end
local vfs = require("vfs")
local handle = {}
--local logger =  Logger:new{ levels = {INFO = true, ERROR = true, DEBUG = false}}
local result = function(data)
    return { error = false, result = data }
end

local error = function(msg)
    return {error = msg, result = false}
end

local fetch = function(url)
    local https = require('ssl.https')
    local body, code, headers = https.request(url)
    if code~=200 then 
        LOG_ERROR("Error: ".. (code or '') ) 
        return nil
    end
    return body
end

handle.token = function(data)
    local file = vfs.ospath(data.file)
    local stat = ulib.file_stat(file)
    local ret = {
        sid = "access_token="..SESSION.sessionid,
        key = enc.sha1(file..":"..stat.mtime)
    }
    return result(ret)
end

handle.duplicate = function(data)
    if not data.src or not data.dest then
        return error("Unknow source or destination file")
    end
    local real_src = vfs.ospath(data.src)
    local real_dest = vfs.ospath(data.dest)
    if not ulib.exists(real_src) then
        return error("Source file doesnt exist")
    end
    if not ulib.send_file(real_src, real_dest) then
        return error("Unable to duplicate file")
    end
    return result(true)
end 

handle.discover = function(data)
    content = fetch(url)
    -- move file to correct position
    if content then
        return result(content)
    else
        return error("Unable to discover data")
    end
end

handle.file = function(data)
    local rq = REQUEST.r
    if not rq then
        return error("Unknown request")
    end
    local ret, stat = vfs.fileinfo(data.file)
    if not ret then
        return error("Unable to query file info")
    end
    local path = vfs.ospath(data.file)
    if rq:match("/wopi/files/[^/]*/contents$") then
        if REQUEST.method == "GET" then
            std.sendFile(path)
            return nil
        elseif REQUEST.method == "POST" then
            --local clen = tonumber(HEADER['Content-Length'])
            local barr = REQUEST["application/octet-stream"]
            barr:fileout(path)
            return result(true)
        else
            return error("Unknown request method")
        end
    elseif rq:match("/wopi/files/[^/]*$") then
        return {
            BaseFileName = stat.name,
            Size =  math.floor(stat.size),
            UserCanWrite = vfs.checkperm(data.file,"write"),
            mime = stat.mime,
            PostMessageOrigin = "*",
            UserCanNotWriteRelative = false
        }
    else
        return error("Unknown request")
    end

end

--logger:info(JSON.encode(REQUEST))

if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end