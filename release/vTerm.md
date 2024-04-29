# AntOS Virual Terminal

Terminal emulator to connect to remote server using AntOS Tunnel plugin.

Unlike wTerm that uses a dedicated websocket connection for each terminal to
communicate with remote terminal session via the Antd **wterm** plugin,
VTerm uses only one websocket connection for multiple terminal session
thanks to the Antd **tunnel** plugin.


VTerm depends on the server side **tunnel** plugin and the AntOS **Antunnel**
client side package

## Change logs
- v0.1.20-fix bug with new xterm.js
- v0.1.19-a Use the new xterm.js libraries v5.1.0
- v0.1.18-a support AntOS v2.0.x
- v0.1.17-a update dependencies to latest
- v0.1.16-a fix incorrect control command
- v0.1.15-a update dependencies to latest
- v0.1.14-a: Change app icon
- v0.1.12-a: Add copy/paste shortcuts (CTRL+SHIFT+C/ CTRL+SHIFT+V)
- v0.1.9-a: Update dependencies to latest
- v0.1.6-a: Add dependencies to package meta-data