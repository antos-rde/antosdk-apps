local args=...

local handle = {}

local result = function(data)
    return { error = false, result = data }
end

local error = function(msg)
    return {error = msg, result = false}
end

local exec = function(host, rcmd, decode)
    local user = SESSION.user
    if not user then return nil end
    local cmd = "ssh -tt "..user.."@"..host.." "..rcmd
    if decode then
        cmd = cmd.." --format \\'{{json .}}\\'"
    end
    local f = assert(io.popen(cmd, 'r'))
    local s = assert(f:read('*a'))
    f:close()
    if decode then
        s = s:gsub('[\n\r]+', ',')
        return JSON.decodeString("["..s.."null]")
    else
        return s
    end
end

handle.list_image = function(data)
    local res = exec(data.host, "docker image ls", true)
    if not res then
        return error("Unable to fetch image list")
    end
    -- inspect images
    for i,v in ipairs(res) do
       v.Detail = exec(data.host, "docker image inspect "..v.ID, true)[1]
       v.text = v.Detail.RepoTags[1]
       if not v.text or v.text == "" then
           v.text = v.ID
        end
    end
    return result(res)
end

handle.list_container = function(data)
    local res = exec(data.host, "docker ps -a -f ancestor="..data.image, true)
    if not res then
        return error("Unable to fetch container list")
    end
    for i,v in ipairs(res) do
       v.Detail = exec(data.host, "docker container inspect "..v.ID, true)[1]
       v.text = v.Names
       
       if v.Detail.State.Running then
            v.iconclass = "fa fa-circle running"
        else
            v.iconclass = "fa fa-circle stop"
        end
    end
    return result(res)
end

handle.run_container = function(data)
    local res = exec(data.host, "docker start "..data.id, false)
    res = res:gsub('[\n\r]+', '')
    if res == data.id then
        return result("OK")
    else
        return error(res)
    end
end

handle.pull_image = function(data)
    local res = exec(data.host, "docker pull "..data.image, false)
    return result(std.b64encode(res))
end


handle.rm_image = function(data)
    local res = exec(data.host, "docker rmi "..data.id.."; sleep 2", false)
    return result(res)
end

handle.create_container = function(data)
    local cmd = "docker run "
    for k,v in pairs(data.parameters) do
        k = k:gsub(" ", "")
       if k:len() == 1 then
           cmd = cmd.." -"..k.." \""..v.."\" "
        else
            if k:match("^e_.*") then
                cmd = cmd.." -e \""..k:gsub("e_","").."="..v.."\" "
            else
                cmd = cmd.." --"..k
                if v ~= "" then
                    cmd = cmd.."=\""..v.."\" "
                end
            end
       end
    end
    
    cmd = cmd.."--detach=true "..data.image
    
    local res = exec(data.host, cmd, false)
    return result(res)
end

handle.stop_container = function(data)
    local res = exec(data.host, "docker stop "..data.id, false)
    res = res:gsub('[\n\r]+', '')
    if res == data.id then
        return result("OK")
    else
        return error(res)
    end
end

handle.restart_container = function(data)
    local res = exec(data.host, "docker restart "..data.id, false)
    res = res:gsub('[\n\r]+', '')
    if res == data.id then
        return result("OK")
    else
        return error(res)
    end
end

handle.rm_container = function(data)
    local res = exec(data.host, "docker stop "..data.id, false)
    res = res:gsub('[\n\r]+', '')
    if res == data.id then
        local res = exec(data.host, "docker rm "..data.id, false)
            res = res:gsub('[\n\r]+', '')
            if res == data.id then
                return result("OK")
            else
                error(res)
            end
    else
        return error(res)
    end
end

if args.action and handle[args.action] then
    return handle[args.action](args.args)
else
    return error("Invalid action parameter")
end