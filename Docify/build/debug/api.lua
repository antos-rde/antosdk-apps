local arg = ...

ulib = require("ulib")
vfs = require("vfs")

local handle = {}
local docpath = nil

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

handle.merge_files = function(data)
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
    local thumb = docpath.."/cache/"..enc.sha1(firstfile:gsub(docpath, ""))..".png"
    local desthumb = docpath.."/cache/"..enc.sha1(fpath:gsub(docpath, ""))..".png"
    if vfs.exists(thumb) then
        vfs.move(thumb, desthumb)
    end
    -- remove all other thumb files
    for i,v in ipairs(data.file) do
        thumb = docpath.."/cache/"..enc.sha1(v:gsub(docpath, ""))..".png"
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

handle.preview = function(path)
    -- convert -resize 300x500 noel.pdf[0] thumb.png
    local name = enc.sha1(path:gsub(docpath,""))..".png"
    -- try to find the thumb
    local tpath = docpath.."/cache/"..name
    if not vfs.exists(tpath) then
        -- regenerate thumb
        local cmd = "convert -resize 250x500 \""..vfs.ospath(path).."\"[0] "..vfs.ospath(tpath)
        LOG_ERROR(cmd)
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

handle.deletedoc = function(param)
    -- move file to unclassified
    local newfile = docpath.."/unclassified/"..utils.basename(param.file)
    vfs.move(param.file, newfile)
    -- delete thumb file
    local thumb = docpath.."/cache/"..enc.sha1(param.file:gsub(docpath,""))..".png"
    if vfs.exists(thumb) then
        vfs.delete(thumb)
    end
    return result("Document entry deleted")
end

handle.updatedoc = function(param)
    local r = handle.merge_files(param.data)
    if r.error then return r end

    if param.rm then
        -- move ve the old file to unclassified
        local newfile = docpath.."/unclassified/"..utils.basename(param.rm)
        local cmd = "rm -f "..vfs.ospath(param.rm)
        os.execute(cmd)
        --if vfs.exists(param.rm) then
        --    vfs.move(param.rm, newfile)
        --end
        -- move the thumb file if needed
        local thumb = docpath.."/cache/"..enc.sha1(param.rm:gsub(docpath,""))..".png"
        local newwthumb = docpath.."/cache/"..enc.sha1(newfile:gsub(docpath, ""))..".png"
        if vfs.exists(thumb) then
            vfs.move(thumb, newwthumb)
        end
    end
    param.data.file = r.result
    print(r.result)
    param.data.mtime = os.time(os.date("!*t"))
    return result(param.data)
    --return handle.update({
    --    table = "docs",
    --    data = param.data
    --})
end

if arg.action and handle[arg.action] then
    -- check if the database exits
    docpath = arg.docpath
    
    return handle[arg.action](arg.args)
else
    return error("Invalid action parameter")
end