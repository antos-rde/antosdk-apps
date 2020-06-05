
local data = ...
-- print(data.content)
local error_msg = {}
local iserror = false
for k,v in pairs(data.to) do
    print("sent to:"..v)
    local to = v
    local from = "From: mrsang@lxsang.me\n"
    local suject = "Subject: " .. data.title .. "\n"
    local content = data.content.."\n"
    local cmd = 'echo "' .. utils.escape(from .. suject .. content) .. '"| sendmail ' .. to
    --print(cmd)
    local r = os.execute(cmd)
    if not r then
        iserror = true
        table.insert(error_msg, v)
        print("Unable to send mail to: "..v)
    end
end
local result = {}
result.error = iserror
result.result = error_msg
return result