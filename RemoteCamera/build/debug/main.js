(function() {
  var RemoteCamera;

  RemoteCamera = class RemoteCamera extends this.OS.application.BaseApplication {
    constructor(args) {
      super("RemoteCamera", args);
    }

    main() {
      var fps, i, j;
      this.mute = false;
      this.player = this.find("player");
      this.qctl = this.find("qctl");
      this.fpsctl = this.find("fpsctl");
      this.cam_setting = {
        w: 640,
        h: 480,
        fps: 10,
        quality: 60
      };
      fps = [];
      for (i = j = 5; j <= 30; i = j += 5) {
        fps.push({
          text: `${i}`,
          value: i
        });
      }
      this.fpsctl.data = fps;
      this.fpsctl.selected = this.cam_setting.fps / 5 - 1;
      this.fpsctl.onlistselect = (e) => {
        if (this.mute) {
          return;
        }
        this.cam_setting.fps = e.data.item.data.value;
        return this.setCameraSetting();
      };
      this.qctl.value = this.cam_setting.quality;
      this.resoctl = this.find("resoctl");
      this.resoctl.data = [
        {
          text: __("320x240"),
          mode: "qvga"
        },
        {
          text: __("640x480"),
          selected: true,
          mode: "vga"
        },
        {
          text: __("800x600"),
          mode: "svga"
        },
        {
          text: __("1024x760"),
          mode: "hd"
        },
        {
          text: __("1920×1080"),
          mode: "fhd"
        }
      ];
      this.resoctl.onlistselect = (e) => {
        if (this.mute) {
          return;
        }
        switch (e.data.item.data.mode) {
          case "qvga":
            this.cam_setting.w = 320;
            this.cam_setting.h = 240;
            break;
          case "vga":
            this.cam_setting.w = 640;
            this.cam_setting.h = 480;
            break;
          case "svga":
            this.cam_setting.w = 800;
            this.cam_setting.h = 600;
            break;
          case "hd":
            this.cam_setting.w = 1024;
            this.cam_setting.h = 768;
            break;
          case "fhd":
            this.cam_setting.w = 1920;
            this.cam_setting.h = 1080;
        }
        return this.setCameraSetting();
      };
      this.qctl.onvaluechange = (e) => {
        if (this.mute) {
          return;
        }
        this.cam_setting.quality = e.data;
        return this.setCameraSetting();
      };
      if (!Antunnel.tunnel) {
        return this.notify(__("Antunnel service is not available"));
      }
      if (!this.setting.channel) {
        return this.requestChannel();
      } else {
        return this.openSession();
      }
    }

    requestChannel() {
      return this.openDialog("PromptDialog", {
        title: __("Enter camera channel"),
        label: __("Please enter camera channel name")
      }).then((v) => {
        this.setting.channel = v;
        return this.openSession();
      });
    }

    menu() {
      return {
        text: "__(Option)",
        nodes: [
          {
            text: "__(Camera channel)"
          }
        ],
        onchildselect: (e) => {
          return this.requestChannel();
        }
      };
    }

    openSession() {
      if (!Antunnel) {
        return;
      }
      if (!this.setting.channel) {
        return;
      }
      this.tunnel = Antunnel.tunnel;
      this.sub = new Antunnel.Subscriber(this.setting.channel);
      this.sub.onopen = () => {
        return console.log("Subscribed to camera channel");
      };
      this.sub.onerror = (e) => {
        return this.error(__("Error: {0}", new TextDecoder("utf-8").decode(e.data)), e);
      };
      //@sub = undefined
      this.sub.onctrl = (e) => {
        var res;
        this.cam_setting.w = Antunnel.Msg.int_from(e.data, 0);
        this.cam_setting.h = Antunnel.Msg.int_from(e.data, 2);
        this.cam_setting.fps = e.data[4];
        this.cam_setting.quality = e.data[5];
        this.mute = true;
        this.qctl.value = this.cam_setting.quality;
        res = `${this.cam_setting.w}x${this.cam_setting.h}`;
        switch (res) {
          case "320x240":
            this.resoctl.selected = 0;
            break;
          case "640x480":
            this.resoctl.selected = 1;
            break;
          case "800x600":
            this.resoctl.selected = 2;
            break;
          case "1024x768":
            this.resoctl.selected = 3;
            break;
          case "1920x1080":
            this.resoctl.selected = 4;
        }
        this.fpsctl.selected = this.cam_setting.fps / 5 - 1;
        return this.mute = false;
      };
      this.sub.onmessage = (e) => {
        var context, imgData, jpeg;
        jpeg = new JpegImage();
        jpeg.parse(e.data);
        context = this.player.getContext("2d");
        this.player.width = jpeg.width;
        this.player.height = jpeg.height;
        //jpeg.copyToImageData(d)
        imgData = context.getImageData(0, 0, jpeg.width, jpeg.height);
        jpeg.copyToImageData(imgData);
        return context.putImageData(imgData, 0, 0);
      };
      this.sub.onclose = () => {
        this.sub = void 0;
        this.notify(__("Unsubscribed to the camera service"));
        return this.quit();
      };
      return Antunnel.tunnel.subscribe(this.sub);
    }

    cleanup() {
      if (this.sub) {
        return this.sub.close();
      }
    }

    setCameraSetting() {
      var arr;
      if (!this.sub) {
        return;
      }
      arr = new Uint8Array(6);
      arr.set(Antunnel.Msg.bytes_of(this.cam_setting.w), 0);
      arr.set(Antunnel.Msg.bytes_of(this.cam_setting.h), 2);
      arr[4] = this.cam_setting.fps;
      arr[5] = this.cam_setting.quality;
      return this.sub.send(Antunnel.Msg.CTRL, arr);
    }

  };

  RemoteCamera.singleton = true;

  RemoteCamera.dependencies = ["pkg://libjpeg/jpg.js"];

  this.OS.register("RemoteCamera", RemoteCamera);

}).call(this);
