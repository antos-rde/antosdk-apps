# Antunnel

`Antunnel` is a client side API that allows AntOS applications to
talk to server side applications via the [`antd-tunnel-pligin`](https://github.com/lxsang/antd-tunnel-plugin) plugin
using a single websocket API.

## Changes log
- v0.2.0-b User multiple bytes interger network byte order in frame format
- v0.1.9-b Use the new client size minima frame format (reduces frame overhead)
- v0.1.4-a Reduce frame overhead
- v0.1.3-a Remove magic number in the frame to reduce frame overhead
