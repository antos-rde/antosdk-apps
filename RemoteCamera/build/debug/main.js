(function(){var t;(t=class extends this.OS.application.BaseApplication{constructor(t){super("RemoteCamera",t)}main(){var t,e,s;for(this.mute=!1,this.player=this.find("player"),this.qctl=this.find("qctl"),this.fpsctl=this.find("fpsctl"),this.cam_setting={w:640,h:480,fps:10,quality:60},t=[],e=s=5;s<=30;e=s+=5)t.push({text:""+e,value:e});return this.fpsctl.data=t,this.fpsctl.selected=this.cam_setting.fps/5-1,this.fpsctl.onlistselect=t=>{if(!this.mute)return this.cam_setting.fps=t.data.item.data.value,this.setCameraSetting()},this.qctl.value=this.cam_setting.quality,this.resoctl=this.find("resoctl"),this.resoctl.data=[{text:__("320x240"),mode:"qvga"},{text:__("640x480"),selected:!0,mode:"vga"},{text:__("800x600"),mode:"svga"},{text:__("1024x760"),mode:"hd"},{text:__("1920×1080"),mode:"fhd"}],this.resoctl.onlistselect=t=>{if(!this.mute){switch(t.data.item.data.mode){case"qvga":this.cam_setting.w=320,this.cam_setting.h=240;break;case"vga":this.cam_setting.w=640,this.cam_setting.h=480;break;case"svga":this.cam_setting.w=800,this.cam_setting.h=600;break;case"hd":this.cam_setting.w=1024,this.cam_setting.h=768;break;case"fhd":this.cam_setting.w=1920,this.cam_setting.h=1080}return this.setCameraSetting()}},this.qctl.onvaluechange=t=>{if(!this.mute)return this.cam_setting.quality=t.data,this.setCameraSetting()},Antunnel.tunnel?this.setting.channel?this.openSession():this.requestChannel():this.notify(__("Antunnel service is not available"))}requestChannel(){return this.openDialog("PromptDialog",{title:__("Enter camera channel"),label:__("Please enter camera channel name")}).then(t=>(this.setting.channel=t,this.openSession()))}menu(){return{text:"__(Option)",nodes:[{text:"__(Camera channel)"}],onchildselect:t=>this.requestChannel()}}openSession(){if(Antunnel&&this.setting.channel)return this.tunnel=Antunnel.tunnel,this.sub=new Antunnel.Subscriber(this.setting.channel),this.sub.onopen=()=>console.log("Subscribed to camera channel"),this.sub.onerror=t=>this.error(__("Error: {0}",new TextDecoder("utf-8").decode(t.data)),t),this.sub.onctrl=t=>{switch(this.cam_setting.w=Antunnel.Msg.int_from(t.data,0),this.cam_setting.h=Antunnel.Msg.int_from(t.data,2),this.cam_setting.fps=t.data[4],this.cam_setting.quality=t.data[5],this.mute=!0,this.qctl.value=this.cam_setting.quality,`${this.cam_setting.w}x${this.cam_setting.h}`){case"320x240":this.resoctl.selected=0;break;case"640x480":this.resoctl.selected=1;break;case"800x600":this.resoctl.selected=2;break;case"1024x768":this.resoctl.selected=3;break;case"1920x1080":this.resoctl.selected=4}return this.fpsctl.selected=this.cam_setting.fps/5-1,this.mute=!1},this.sub.onmessage=t=>{var e,s,i;return(i=new JpegImage).parse(t.data),e=this.player.getContext("2d"),this.player.width=i.width,this.player.height=i.height,s=e.getImageData(0,0,i.width,i.height),i.copyToImageData(s),e.putImageData(s,0,0)},this.sub.onclose=()=>(this.sub=void 0,this.notify(__("Unsubscribed to the camera service")),this.quit()),Antunnel.tunnel.subscribe(this.sub)}cleanup(){if(this.sub)return this.sub.close()}setCameraSetting(){var t;if(this.sub)return(t=new Uint8Array(6)).set(Antunnel.Msg.bytes_of(this.cam_setting.w),0),t.set(Antunnel.Msg.bytes_of(this.cam_setting.h),2),t[4]=this.cam_setting.fps,t[5]=this.cam_setting.quality,this.sub.send(Antunnel.Msg.CTRL,t)}}).singleton=!0,t.dependencies=["pkg://libjpeg/jpg.js"],this.OS.register("RemoteCamera",t)}).call(this);