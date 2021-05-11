local args=...

local result = function(data)
    return { error = false, result = data }
end

local error = function(msg)
    return {error = msg, result = false}
end

local handle = {}

handle.exec = function(data)
    local cmd = data.cmd
    if data.pwd then
        cmd = "cd "..require("vfs").ospath(data.pwd).. " && "..cmd
    end
    cmd = cmd.." 2>&1"
    local pipe = io.popen(cmd)
    for line in pipe:lines() do
        echo(JSON.encode(result(line)))
    end
    pipe:close()
    return result("Done: ["..cmd.."]")
end

if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end