
local data = ...


-- Michal Kottman, 2011, public domain
local socket = require 'socket'
local smtp = require 'socket.smtp'
local ssl = require 'ssl'
local https = require 'ssl.https'
local ltn12 = require 'ltn12'

function sslCreate()
    local sock = socket.tcp()
    return setmetatable({
        connect = function(_, host, port)
            local r, e = sock:connect(host, port)
            if not r then return r, e end
            sock = ssl.wrap(sock, {mode='client', protocol='tlsv1_2'})
            return sock:dohandshake()
        end
    }, {
        __index = function(t,n)
            return function(_, ...)
                return sock[n](sock, ...)
            end
        end
    })
end

function sendMail(user, password, to,subject, body)
    local msg = {
        headers = {
            from = string.format("%s <%s@iohub.dev>", user, user),
            to = string.format("%s <%s>",to.text, to.email),
            subject = subject
        },
        body = body
    }

    local ok, err = smtp.send {
        from = string.format('<%s@iohub.dev>', user),
        rcpt = string.format('<%s>', to.email),
        source = smtp.message(msg),
        user = string.format('%s@iohub.dev', user),
        password = password,
        server = 'iohub.dev',
        port = 465,
        create = sslCreate
    }
    if not ok then
        return false, error
    else
        return true
    end
end

local error_msg = {}
local iserror = false

for k,v in pairs(data.to) do
    LOG_DEBUG("Send email to:"..v.email)
    local r,e = sendMail(data.user, data.password, v, data.title, data.content)
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