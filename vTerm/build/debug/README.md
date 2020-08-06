# AntOS Virual Terminal

Terminal emulator to connect to remote server using AntOS Tunnel plugin.

Unlike wTerm that uses a dedicated websocket connection for each terminal to
communicate with remote terminal session via the Antd **wterm** plugin,
VTerm uses only one websocket connection for multiple terminal session
thanks to the Antd **tunnel** plugin.


VTerm depends on the server side **tunnel** plugin and the AntOS **Antunnel**
client side package