# WVNC remote desktop
![](https://raw.githubusercontent.com/lxsang/antosdk-apps/master/RemoteDesktop/screenshot.jpg)

A web based VNC client allowing to control remote VNC desktop from browser. The application is based on **wvnc**, a protocol and API that uses web socket to communicate with remote VNC server.

Further information on **wvnc**: [https://blog.lxsang.me/post/id/23](https://blog.lxsang.me/post/id/23)


## Change logs
* v0.1.17 - Allow to save current connection to setting
* v0.1.16 - Allow to enable/disable mouse capture in remote desktop, remove some unused toolbar buttons
* v0.1.15 - Only send ACK command when finish rendering the received frame, this allows to vastly improve performance and bandwidth
* v0.1.14 - Add toolbar for canvas size control
* v0.1.13 - support AntOS v2.0.x
* v0.1.12 - improve UI handling
* v0.1.11 - Support 16 bits per pixel
* v0.1.10 - Allow to sync clipboard between local and remote machine, CTRL+SHIF+V to paste text from local to remote machine
* v0.1.9 - improve stability
* v0.1.7-8 - remove package dependencies, use web assembly for jpeg decoding, improve rendering performance and connection stability
* v0.1.6 - Change category
* v0.1.5 - add package dependencies and use the new **libwvnc**
* v0.1.0 - adapt to the new AntOS API
