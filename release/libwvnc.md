# libwvnc

Overview about WVNC: [https://blog.lxsang.me/r/id/23](https://blog.lxsang.me/r/id/23)

**libwvnc** is the client side protocol API for my [Antd's **wvnc**](https://github.com/lxsang/antd-wvnc-plugin) server side plugin. It allows to acess VNC server from the web using websocket (via the **wvnc** server plugin).

Since the **wvnc** plugin offers data compression using JPEG, **wvnc.js** depends on the **libjpeg** package and **web worker** to speed up the data decoding process, thus speed up the screen rendering on HTML canvas.


## Example
It is straight forward to use the api:

Html code:

```html
    ...
    <canvas id = "screen"></canvas>
```

Javascript:

```javascript
  var args, client;
  args = {
    // the canvas element
    element: 'screen',
    // The websocket uri to the wvnc server side plugin
    ws: 'wss://localhost/wvnc',
    // the decoder worker
    libjpeg: 'path/to/jpg.js'
  };
  client = new WVNC(args);
  
  // This function responds to a VNC server password request
  // should return a promise
  client.onpassword = function() {
    return new Promise(function(r, e) {
      return r('password');
    });
  };
  
  // this function responds to the remote OS username and password request
  // should return a promise
  client.oncredential = function() {
    return new Promise(function(r, e) {
      return r('username', 'password');
    });
  };
  // event fired when a text is copied on
  // the remote computer
  client.oncopy = function(text) {
    console.log(text);
  };
  // init the WVNC client
  client.init()
    .then(function() {
        client.connect(
          // VNC server
          "192.168.1.20:5901", 
          {
            // bits per pixel
            bbp: 32,
            // data compression flag
            // 1 is for both JPEG
            // 0 is for raw data
            flag: 1,
            // JPEG quality %
            quality: 50
          });
    })
    .catch(function(m, s) {
      return console.error(m, s);
    });
```
