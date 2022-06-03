var Antunnel;!function(s){let e;!function(s){s[s.OK=0]="OK",s[s.SUBSCRIBE=2]="SUBSCRIBE",s[s.UNSUBSCRIBE=3]="UNSUBSCRIBE",s[s.ERROR=1]="ERROR",s[s.DATA=6]="DATA",s[s.CTRL=7]="CTRL",s[s.CLOSE=5]="CLOSE",s[s.PING=8]="PING"}(e=s.AntunnelMSGType||(s.AntunnelMSGType={}))}(Antunnel||(Antunnel={})),function(s){let e,t;!function(s){s[s.SUBSCRIBE=10]="SUBSCRIBE",s[s.UNSUBSCRIBE=11]="UNSUBSCRIBE",s[s.QUERY_USER=12]="QUERY_USER",s[s.QUERY_GROUP=13]="QUERY_GROUP"}(e=s.BroadcastCTRLType||(s.BroadcastCTRLType={})),function(s){s[s.INIT=0]="INIT",s[s.SUBSCRIBED=1]="SUBSCRIBED",s[s.UNSUBSCRIBED=2]="UNSUBSCRIBED"}(t=s.BroadcastGroupState||(s.BroadcastGroupState={}));class n{constructor(s){this.groupname=s,this.users=new Set,this.onmessage=void 0,this.onready=void 0,this.onuseradd=void 0,this.onuserdel=void 0,this.onclose=void 0,this.user=OS.setting.user.name,this.mgr=void 0,this.state=t.INIT}close(){this.mgr&&this.id&&this.mgr.unsubscribe(this.id)}refresh(){this.mgr&&this.id&&this.mgr.query(this.id)}send(s){this.mgr.send(this.id,s)}}s.BroadcastGroup=n,s.BroadcastManager=class{constructor(s){this.sub=void 0,this.channel=s,this.tunnel=void 0,this.groups={},this.pendings={},this.ongroupadd=void 0,this.ongroupdel=void 0}connect(i){this.sub=new s.Subscriber(this.channel),this.sub.onopen=()=>{OS.announcer.osinfo(__("Subscriber {0}: Connected to the {1} channel",this.sub.id,this.channel)),i(!0)},this.sub.onerror=s=>{let e=s;s.data&&(e=new TextDecoder("utf-8").decode(s.data)),OS.announcer.oserror(__("Subscriber {0}: Error from the {1} channel: {2}",this.sub.id,this.channel,e),void 0)},this.sub.onmessage=e=>{if(e.data){let t=s.Msg.int_from(e.data.slice(0,4),0,4),n=this.groups[t];if(!n)return;n.onmessage&&n.onmessage(e.data.slice(4))}},this.sub.onctrl=i=>{let r={user:void 0,group:void 0,type:i.data[0],id:void 0};switch(r.type){case e.SUBSCRIBE:case e.UNSUBSCRIBE:let o=i.data[1]+2;if(r.user=new TextDecoder("utf-8").decode(i.data.slice(2,o)),r.id=s.Msg.int_from(i.data,o,4),o+=4,r.group=new TextDecoder("utf-8").decode(i.data.slice(o)),r.type===e.SUBSCRIBE){let s=this.pendings[r.group];s&&s.user===r.user&&(s.id=r.id,this.pendings[r.group]=void 0,delete this.pendings[r.group],this.groups[r.id]=s,s.state=t.SUBSCRIBED,this.ongroupadd&&this.ongroupadd(s),s.onready()),s=this.groups[r.id],s||(s=new n(r.group),s.id=r.id,s.state=t.SUBSCRIBED,s.mgr=this,this.groups[r.id]=s,this.ongroupadd&&this.ongroupadd(s),s.onready&&s.onready()),s.users.has(r.user)||(s.users.add(r.user),s.onuseradd&&s.onuseradd(r.user))}else{let s=this.groups[r.id];if(!s)return;s.user===r.user?(OS.announcer.osinfo(__("Subcriber {0}: leave group {1}",this.sub.id,r.group)),this.groups[r.id]=void 0,delete this.groups[r.id],s.state=t.UNSUBSCRIBED,s.onclose&&s.onclose(),this.ongroupdel&&this.ongroupdel(s)):(s.users.delete(r.user),s.onuserdel&&s.onuserdel(r.user))}break;case e.QUERY_USER:r.id=s.Msg.int_from(i.data,1,4),r.user=new TextDecoder("utf-8").decode(i.data.slice(5));let u=this.groups[r.id];if(!u)return;u.users.has(r.user)||(u.users.add(r.user),u.onuseradd&&u.onuseradd(r.user));break;case e.QUERY_GROUP:if(r.id=s.Msg.int_from(i.data,1,4),r.group=new TextDecoder("utf-8").decode(i.data.slice(5)),this.groups[r.id])return;this.groups[r.id]=new n(r.group),this.groups[r.id].id=r.id,this.groups[r.id].state=t.SUBSCRIBED,this.groups[r.id].mgr=this,this.ongroupadd&&this.ongroupadd(this.groups[r.id]),this.groups[r.id].onready&&this.groups[r.id].onready()}},this.sub.onclose=()=>{OS.announcer.osinfo(__("Subscriber {0}: Connection to {1} closed",this.sub.id,this.channel)),this.sub=void 0},this.tunnel.subscribe(this.sub)}setup(){return new Promise(async(e,t)=>{try{if(!s)throw new Error(__("Library not fould: %s","Antunnel").__());if(s.tunnel)this.tunnel=s.tunnel;else{await OS.GUI.pushService("Antunnel/AntunnelService");let e=OS.setting.system.tunnel_uri;if(!e)throw new Error(__("Unable to connect to: %s","Antunnel").__());await s.init(e),this.tunnel=s.tunnel}this.sub?e(!0):this.connect(e)}catch(e){s.tunnel&&s.tunnel.close(),t(__e(e))}})}unsubscribe(t){let n=new Uint8Array(5);n[0]=e.UNSUBSCRIBE,n.set(s.Msg.bytes_of(t,4),1),this.sub.send(s.Msg.CTRL,n)}query(t){let n=new Uint8Array(5);n[0]=e.QUERY_USER,n.set(s.Msg.bytes_of(t,4),1),this.sub.send(s.Msg.CTRL,n)}refresh(){let t=new Uint8Array(1);t[0]=e.QUERY_GROUP,this.sub.send(s.Msg.CTRL,t)}subscribe(t){let i=new Uint8Array(t.length+1);i[0]=e.SUBSCRIBE,i.set((new TextEncoder).encode(t),1),this.sub.send(s.Msg.CTRL,i);let r=new n(t);r.mgr=this,this.pendings[t]=r}teardown(){this.sub&&this.sub.close(),this.groups={},this.pendings={}}id(){return this.sub?this.sub.id:0}send(e,t){let n=new Uint8Array(t.length+4);n.set(s.Msg.bytes_of(e,4),0),n.set(t,4),this.sub.send(s.Msg.DATA,n)}get_groups(){return this.groups}get_group(s){for(let e in this.groups)if(this.groups[e].groupname===s)return this.groups[e]}}}(Antunnel||(Antunnel={}));