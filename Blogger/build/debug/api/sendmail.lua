
local data = ...
-- load the smtp support
local smtp = require("socket.smtp")

local from = string.format("<%s@iohub.dev>", data.user);

local mesgt = {
  headers = {
    from = string.format("Dany <%s@iohub.dev>", data.user),
    to = "",
    subject = data.title
  },
  body = data.content
}

local error_msg = {}
local iserror = false

for k,v in pairs(data.to) do
    LOG_DEBUG("Send email to:"..v.email)
    local rcpt = string.format("<%s>",v.email)
    mesgt.headers.to = string.format("%s <%s>",v.text, v.email)
    local r, e = smtp.send{
        from = from,
        rcpt = rcpt,
        server = "iohub.dev",
        domain = "iohub.dev",
        user = data.user,
        password = data.password,
        source = smtp.message(mesgt)
    }

    local r = os.execute(cmd)
    if not r then
        iserror = true
        table.insert(error_msg, v.email)
        LOG_ERROR(string.format("Unable to send mail to %s: %s",v.email, e))
    end
end
local result = {}
result.error = iserror
result.result = error_msg
return result