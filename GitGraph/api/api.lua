-- nothing todo for now
local args=...
local vfs = require("vfs")

local result = function(data)
    return { error = false, result = data }
end

local error = function(msg)
    return {error = msg, result = false}
end

local handle = {}

handle.log = function(data)
    -- convert VFS to OS path
    local os_path = vfs.ospath(data.base_dir)
    if(not os_path) then
        return error("Base dir "..data.base_dir.." is not found")
    end
    local cmd = "cd "..os_path.." && "
    cmd = cmd.."git --no-pager log -n "..data.n_commits.." --all --format='{ \"hashes\":{ \"commit\":\"%H\", \"tree\":\"%T\", \"parents\":\"%P\" }, \"author\":{ \"date\": \"%ai\", \"name\": \"%an\", \"email\":\"%ae\" }, \"committer\":{ \"date\": \"%ci\", \"name\": \"%cn\", \"email\":\"%ce\" }, \"extra\":\"%D\"} ====:RAW:====%B====:RAW:========:COMMITEND:===='"
    if(data.before) then
        cmd = cmd.." --before='"..data.before.."'"
    end
    local f = assert(io.popen(cmd, 'r'))
    local s = assert(f:read('*a'))
    f:close()
    local ret = {}
    for line in s:gmatch("(.-)====:COMMITEND:====\n") do
        local arr = {}
        for el in line:gmatch("(.-)====:RAW:====") do
            table.insert(arr, el)
        end
        local commit = JSON.decodeString(arr[1])
        commit.message = arr[2]
        table.insert(ret, commit)
    end
    return result(ret)
end

handle.list_file = function(data)
    local os_path = vfs.ospath(data.base_dir)
    if(not os_path) then
        return error("Base dir "..data.base_dir.." is not found")
    end
    local cmd = "cd "..os_path..' && git --no-pager log -m -1 --name-status --pretty="format:" '..data.commit
    local f = assert(io.popen(cmd, 'r'))
    local s = assert(f:read('*a'))
    f:close()
    local ret = {}
    for line in s:gmatch("(.-)\n") do
        table.insert(ret, line)
    end
    return result(ret)
end

handle.get_changes = function(data)
    local os_path = vfs.ospath(data.base_dir)
    if(not os_path) then
        return error("Base dir "..data.base_dir.." is not found")
    end
    local cmd = "cd "..os_path.." && git --no-pager diff --no-prefix -U1000 "..data.commit.."^:"..data.file.." "..data.commit..":"..data.file
    local f = assert(io.popen(cmd, 'r'))
    local s = assert(f:read('*a'))
    f:close()
    return result(s)
end

handle.get_file = function(data)
    local os_path = vfs.ospath(data.base_dir)
    if(not os_path) then
        return error("Base dir "..data.base_dir.." is not found")
    end
    local cmd = "cd "..os_path.." && git --no-pager show "..data.commit..":"..data.file
    local f = assert(io.popen(cmd, 'r'))
    local s = assert(f:read('*a'))
    f:close()
    return result(s)
end

if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end