
local data = ...
-- print(data.content)
local error_msg = {}
local iserror = false
local tmp_name = "/tmp/"..os.time(os.date("!*t"))
local file = io.open (tmp_name , "w")
if file then
    file:write("From: mrsang@lxsang.me\n")
    file:write("Subject: " .. data.title .. "\n")
    file:write( data.content.."\n")
    file:close()
    for k,v in pairs(data.to) do
        print("sent to:"..v)
        local to = v
        local cmd = 'cat ' ..tmp_name .. '| sendmail ' .. to
        --print(cmd)
        local r = os.execute(cmd)
        if not r then
            iserror = true
            table.insert(error_msg, v)
            print("Unable to send mail to: "..v)
        end
    end
else
    iserror = true
    table.insert(error_msg, "Cannot create mail file")
end
local result = {}
result.error = iserror
result.result = error_msg
return result