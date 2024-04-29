local args=...

local release_url = "https://ci.iohub.dev/public/antos-release/packages/2.0.x/"

local result = function(data)
    return { error = false, result = data }
end

local error = function(msg)
    return {error = msg, result = false}
end

local output = function(text)
    echo( JSON.encode(result(text)))
end

function script_path()
   local str = debug.getinfo(2, "S").source:sub(2)
   return str:match("(.*/)")
end

local cwd = script_path()
local release_dir = cwd.."/release/"

-- prepare release directory
if ulib.exists(release_dir) then
    --remove it
    ulib.delete(release_dir)
end

-- create release dir
output("Creating delivery directory: "..release_dir)
if not ulib.mkdir(release_dir) then
    return error("Unable to create release dir")
end

local r = ulib.read_dir(cwd, cwd)
if r.error then
    return error(r.error)
end

local packages = {}

for i,v in pairs(r) do
    if v.type == "dir" then
        local ar_file = v.path.."/build/release/"..v.filename..".zip"
        local meta_file = v.path.."/package.json"
        local readme_file = v.path.."/README.md"
        if ulib.exists(ar_file) and ulib.exists(meta_file) then
            -- copy zip file to release directory
            output("Copying "..ar_file.." -> "..release_dir.."/"..v.filename..".zip")
            if not ulib.send_file(ar_file, release_dir..v.filename..".zip") then
                return error("Unable to copy file:"..v.filename..".zip")
            end
            if ulib.exists(readme_file) then
                output("Copying "..readme_file.." -> "..release_dir.."/"..v.filename..".md")
                if not ulib.send_file(readme_file, release_dir..v.filename..".md") then
                    return error("Unable to copy file:"..v.readme_file..".md")
                end
            end
            -- read meta-data
            local meta = JSON.decodeFile(meta_file)
            if not meta then
                return error("Unable to parse package meta-data: "..meta_file)
            end
            local pkg = {
                pkgname = v.filename,
                name = meta.name,
                description = release_url..v.filename..".md",
                category = meta.category or "Other",
                author = meta.info.author or "Unknown",
                version = meta.version,
                dependencies = meta.dependencies or {},
                download = release_url..v.filename..".zip"
            }
            table.insert(packages, pkg)
        --else
        --    if not ulib.exists(ar_file) then
        --        output("AR file not found "..ar_file)
        --    else
        --        output("Meta file not found "..meta_file)
        --    end
        end
    end
end

-- write meta-data
local index_file = release_dir.."/packages.json"
output("Generate meta-data file: "..index_file)

local file,err = io.open(index_file,'w')
if file then
    file:write(JSON.encode(packages))
    file:close()
else
    return error("error open file ".. index_file..":"..err)
end



return result("Done!!!")