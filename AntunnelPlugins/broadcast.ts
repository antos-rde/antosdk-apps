/**
 * Broadcast plugin for Antunnel to communication
 * with the backend Antunnel broadcast publisher
 */
namespace Antunnel {
    /**
     * Broadcast control message type
     *
     * @export
     * @enum {number}
     */
    export enum BroadcastCTRLType {
        SUBSCRIBE = 0x0A,
        UNSUBSCRIBE = 0xB,
        QUERY_USER = 0xC,
        QUERY_GROUP = 0xD,
    }

    /**
     * Group state
     *
     * @export
     * @enum {number}
     */
    export enum BroadcastGroupState {
        INIT,
        SUBSCRIBED,
        UNSUBSCRIBED
    }


    /**
     * Broadcast control message
     *
     * @export
     * @interface BroadcastCTRLMsg
     */
    export interface BroadcastCTRLMsg {

        /**
         * Message type
         *
         * @type {BroadcastCTRLType}
         * @memberof BroadcastCTRLMsg
         */
        type: BroadcastCTRLType;

        /**
         * Group name
         *
         * @type {string}
         * @memberof BroadcastCTRLMsg
         */
        group?: string;

        /**
         * User name
         *
         * @type {string}
         * @memberof BroadcastCTRLMsg
         */
        user: string;

        /**
         * group id - allocated by backend
         *
         * @type {number}
         * @memberof BroadcastCTRLMsg
         */
        id: number;
    }


    /**
     * Broadcast group handle
     *
     * @export
     * @class BroadcastGroup
     */
    export class BroadcastGroup {

        /**
         * Group name
         *
         * @type {string}
         * @memberof BroadcastGroup
         */
        groupname: string;

        /**
         * Group id allocated by backend
         *
         * @type {number}
         * @memberof BroadcastGroup
         */
        id: number;

        /**
         * Active users of the group
         *
         * @type {Set<string>}
         * @memberof BroadcastGroup
         */
        users: Set<string>;

        /**
         * Called when grouped is opened by backend
         *
         * @memberof BroadcastGroup
         */
        onready: () => void;

        /**
         * Called whe a message is sent to group
         *
         * @memberof BroadcastGroup
         */
        onmessage: (data: Uint8Array) => void;

        /**
         * Called when user added to the group
         *
         * @memberof BroadcastGroup
         */
        onuseradd: (user: string) => void;

        /**
         * Called when user is removed from the group
         *
         * @memberof BroadcastGroup
         */
        onuserdel: (user: string) => void;

        /**
         * Called when handle owner left the group
         *
         * @memberof BroadcastGroup
         */
        onclose: () => void;

        /**
         * Owner of this handle
         *
         * @type {string}
         * @memberof BroadcastGroup
         */
        user: string;

        /**
         * reference to the attached Broadcast manage
         *
         * @type {BroadcastManager}
         * @memberof BroadcastGroup
         */
        mgr: BroadcastManager;

        /**
         * Current state of the handle
         *
         * @type {BroadcastGroupState}
         * @memberof BroadcastGroup
         */
        state: BroadcastGroupState;


        /**
         * Creates an instance of BroadcastGroup.
         * @param {string} name
         * @memberof BroadcastGroup
         */
        constructor(name: string) {
            this.groupname = name;
            this.users = new Set<string>();
            this.onmessage = undefined;
            this.onready = undefined;
            this.onuseradd = undefined;
            this.onuserdel = undefined;
            this.onclose = undefined;
            this.user = OS.setting.user.name;
            this.mgr = undefined;
            this.state = BroadcastGroupState.INIT;
        }


        /**
         * Leave the group
         *
         * @return {*}  {void}
         * @memberof BroadcastGroup
         */
        close(): void {
            if (!this.mgr || !this.id) {
                return;
            }
            this.mgr.unsubscribe(this.id);
        }


        /**
         * Query all users in the group
         *
         * @return {*}  {void}
         * @memberof BroadcastGroup
         */
        refresh(): void {
            if (!this.mgr || !this.id) {
                return;
            }
            this.mgr.query(this.id);
        }

        /**
         * Send a message to the group
         *
         * @param {Uint8Array} data
         * @memberof BroadcastGroup
         */
        send(data: Uint8Array): void {
            this.mgr.send(this.id, data);
        }
    }


    /**
     * Broadcast Manager
     * Managing all group handles created by the current
     * user
     *
     * @export
     * @class BroadcastManager
     */
    export class BroadcastManager {

        /**
         * Reference to Antunnel subscriber
         *
         * @private
         * @type {SubscriberInterface}
         * @memberof BroadcastManager
         */
        private sub: SubscriberInterface;

        /**
         * channel name
         *
         * @private
         * @type {string}
         * @memberof BroadcastManager
         */
        private channel: string;

        /**
         * Reference to the global tunnel handle
         *
         * @private
         * @type {AntunnelAPI}
         * @memberof BroadcastManager
         */
        private tunnel: AntunnelAPI;

        /**
         * list of all registered group handles
         *
         * @private
         * @type {{[prop: number]: BroadcastGroup}}
         * @memberof BroadcastManager
         */
         groups: { [prop: number]: BroadcastGroup };

        /**
         * temporary list of group handles that wait for
         * an connection confirmation from the backend 
         *
         * @private
         * @type {GenericObject<BroadcastGroup>}
         * @memberof BroadcastManager
         */
        private pendings: GenericObject<BroadcastGroup>;
        
        /**
         * callback handle when a group is added to the
         * manager
         *
         * @private
         * @type (group: BroadcastGroup)=> void
         * @memberof BroadcastManager
         */
        ongroupadd: (group: BroadcastGroup)=> void;

        /**
         * callback handle when a group is removed from the
         * manager
         *
         * @private
         * @type (group: BroadcastGroup)=> void
         * @memberof BroadcastManager
         */
        ongroupdel: (group: BroadcastGroup)=> void;

        /**
         * Creates an instance of BroadcastManager.
         * @param {string} channel
         * @memberof BroadcastManager
         */
        constructor(channel: string) {
            this.sub = undefined;
            this.channel = channel;
            this.tunnel = undefined;
            this.groups = {};
            this.pendings = {};
            this.ongroupadd = undefined;
            this.ongroupdel = undefined;
        }

        /**
         * Connect to the broadcast channel
         *
         * @private
         * @param {(d: any)=> void} resolve
         * @memberof BroadcastManager
         */
        private connect(resolve: (d: any) => void): void {
            this.sub = new Subscriber(this.channel);
            this.sub.onopen = () => {
                OS.announcer.osinfo(__("Subscriber {0}: Connected to the {1} channel", this.sub.id, this.channel));
                resolve(true);
            };

            this.sub.onerror = (e:AntunnelMSG) => {
                let err: any = e;
                if(e.data)
                {
                    err = new TextDecoder("utf-8").decode(e.data);
                }
                OS.announcer.oserror(
                    __("Subscriber {0}: Error from the {1} channel: {2}",
                        this.sub.id, this.channel, err), undefined);
            }

            this.sub.onmessage = (e: GenericObject<any>) => {
                if (e.data) {
                    let gid = Antunnel.Msg.int_from(e.data.slice(0, 4), 0, 4);
                    let g_handle = this.groups[gid];
                    if (!g_handle)
                        return;
                    if (g_handle.onmessage) {
                        g_handle.onmessage(e.data.slice(4));
                    }
                }
            }
            this.sub.onctrl = (d) => {
                let msg: BroadcastCTRLMsg = {
                    user: undefined,
                    group: undefined,
                    type: d.data[0] as BroadcastCTRLType,
                    id: undefined
                }
                switch (msg.type) {
                    case BroadcastCTRLType.SUBSCRIBE:
                    case BroadcastCTRLType.UNSUBSCRIBE:
                        let offset = d.data[1] + 2;
                        msg.user = new TextDecoder("utf-8").decode(d.data.slice(2, offset));
                        msg.id = Antunnel.Msg.int_from(d.data, offset, 4);
                        offset += 4;
                        msg.group = new TextDecoder("utf-8").decode(d.data.slice(offset));
                        if (msg.type === BroadcastCTRLType.SUBSCRIBE) {
                            let g_handle = this.pendings[msg.group];
                            if (g_handle && g_handle.user === msg.user) {
                                g_handle.id = msg.id;
                                this.pendings[msg.group] = undefined;
                                delete this.pendings[msg.group];
                                this.groups[msg.id] = g_handle;
                                g_handle.state = BroadcastGroupState.SUBSCRIBED;
                                if(this.ongroupadd)
                                {
                                    this.ongroupadd(g_handle);
                                }
                                g_handle.onready();
                            }
                            g_handle = this.groups[msg.id];
                            if (!g_handle) {
                                // create the group handle
                                g_handle = new BroadcastGroup(msg.group);
                                g_handle.id = msg.id;
                                g_handle.state = BroadcastGroupState.SUBSCRIBED;
                                g_handle.mgr = this;
                                this.groups[msg.id] = g_handle;
                                if(this.ongroupadd)
                                {
                                    this.ongroupadd(g_handle);
                                }
                                if(g_handle.onready)
                                {
                                    g_handle.onready();
                                }
                            }
                            if(!g_handle.users.has(msg.user))
                            {
                                g_handle.users.add(msg.user);
                                if (g_handle.onuseradd)
                                    g_handle.onuseradd(msg.user);
                            }
                        }
                        else {
                            let g_handle = this.groups[msg.id];
                            if (!g_handle) {
                                return;
                            }
                            if (g_handle.user === msg.user) {
                                OS.announcer.osinfo(__("Subcriber {0}: leave group {1}", this.sub.id, msg.group));
                                this.groups[msg.id] = undefined;
                                delete this.groups[msg.id];
                                g_handle.state = BroadcastGroupState.UNSUBSCRIBED;
                                if (g_handle.onclose)
                                    g_handle.onclose();
                                if(this.ongroupdel)
                                {
                                    this.ongroupdel(g_handle);
                                }
                            }
                            else {
                                g_handle.users.delete(msg.user);
                                if (g_handle.onuserdel)
                                    g_handle.onuserdel(msg.user);
                            }
                        }
                        break;
                    case BroadcastCTRLType.QUERY_USER:
                        msg.id = Antunnel.Msg.int_from(d.data, 1, 4);
                        msg.user = new TextDecoder("utf-8").decode(d.data.slice(5));
                        let g_handle = this.groups[msg.id];
                        if (!g_handle)
                            return;
                        if (!g_handle.users.has(msg.user)) {
                            g_handle.users.add(msg.user);
                            if (g_handle.onuseradd)
                                g_handle.onuseradd(msg.user);
                        }
                        break;
                    case BroadcastCTRLType.QUERY_GROUP:
                        msg.id = Antunnel.Msg.int_from(d.data, 1, 4);
                        msg.group = new TextDecoder("utf-8").decode(d.data.slice(5));
                        if (this.groups[msg.id])
                            return;
                        this.groups[msg.id] = new BroadcastGroup(msg.group);
                        this.groups[msg.id].id = msg.id;
                        this.groups[msg.id].state = BroadcastGroupState.SUBSCRIBED;
                        this.groups[msg.id].mgr = this;
                        if(this.ongroupadd)
                        {
                            this.ongroupadd(this.groups[msg.id]);
                        }
                        if(this.groups[msg.id].onready)
                        {
                            this.groups[msg.id].onready();
                        }
                        break;
                    default:
                        break;
                }
            }
            this.sub.onclose = () => {
                OS.announcer.osinfo(__("Subscriber {0}: Connection to {1} closed", this.sub.id, this.channel));
                this.sub = undefined;
            }
            this.tunnel.subscribe(this.sub);
        }

        /**
         * Perform setup of the manager:
         * - Check if Antunnel API is available
         * - Connect to the tunnel if the global tunnel does not exists
         * - Subscribe to th e broadcast channel if not done
         *
         * @return {*}  {Promise<any>}
         * @memberof BroadcastManager
         */
        setup(): Promise<any> {
            return new Promise(async (resolve, reject) => {
                try {
                    if (!Antunnel) {
                        throw new Error(__("Library not fould: %s", "Antunnel").__());
                    }
                    if (!Antunnel.tunnel) {
                        await OS.GUI.pushService("Antunnel/AntunnelService");
                        let uri = (OS.setting.system as any).tunnel_uri as string;
                        if (!uri) {
                            throw new Error(__("Unable to connect to: %s", "Antunnel").__());
                        }
                        await Antunnel.init(uri);
                        this.tunnel = Antunnel.tunnel;
                    }
                    else {
                        this.tunnel = Antunnel.tunnel;
                    }
                    if (!this.sub) {
                        this.connect(resolve);
                    }
                    else {
                        resolve(true);
                    }
                }
                catch (e) {
                    if (Antunnel.tunnel)
                        Antunnel.tunnel.close();
                    reject(__e(e));
                }
            });
        }

        /**
         * Remove a group handle from the manager
         *
         * @param {number} gid
         * @memberof BroadcastManager
         */
        unsubscribe(gid: number): void {
            let arr = new Uint8Array(5);
            arr[0] = BroadcastCTRLType.UNSUBSCRIBE;
            arr.set(Antunnel.Msg.bytes_of(gid, 4), 1);
            this.sub.send(Antunnel.Msg.CTRL, arr);
        }


        /**
         * Query users in the specific group
         *
         * @param {number} gid group id
         * @memberof BroadcastManager
         */
        query(gid: number): void {
            let arr = new Uint8Array(5);
            arr[0] = BroadcastCTRLType.QUERY_USER;
            arr.set(Antunnel.Msg.bytes_of(gid, 4), 1);
            this.sub.send(Antunnel.Msg.CTRL, arr);
        }

        /**
         * Query all groups of the current user
         * 
         * @memberof BroadcastManager
         */
        refresh(): void
        {
            let arr = new Uint8Array(1);
            arr[0] = BroadcastCTRLType.QUERY_GROUP;
            this.sub.send(Antunnel.Msg.CTRL, arr);
        }
        /**
         * Register a group to the manager
         *
         * @param {string} group
         * @memberof BroadcastManager
         */
        subscribe(group: string): void {
            let arr = new Uint8Array(group.length + 1);
            arr[0] = BroadcastCTRLType.SUBSCRIBE;
            arr.set(new TextEncoder().encode(group), 1);
            this.sub.send(Antunnel.Msg.CTRL, arr);
            let handle = new BroadcastGroup(group);
            handle.mgr = this;
            this.pendings[group] = handle;
        }


        /**
         *CLeanup the manager 
         *
         * @memberof BroadcastManager
         */
        teardown(): void {
            if (this.sub) {
                this.sub.close();
            }
            this.groups = {};
            this.pendings = {};
        }

        /**
         * return the current subscriber ID
         *
         * @memberof BroadcastManager
         * @return {number}
         */
        id(): number
        {
            if(this.sub)
            {
                return this.sub.id;
            }
            return 0;
        }

        /**
         * Send a message to a specific group
         *
         * @param {number} gid
         * @param {Uint8Array} data
         * @memberof BroadcastManager
         */
        send(gid: number, data: Uint8Array): void {
            let arr = new Uint8Array(data.length + 4);
            arr.set(Antunnel.Msg.bytes_of(gid, 4), 0);
            arr.set(data, 4);
            this.sub.send(Antunnel.Msg.DATA, arr);
        }

        /**
         * Get all the registered group
         *
         * @return {Uint8Array}
         * @memberof BroadcastManager
         */
        get_groups(): { [prop: number]: BroadcastGroup }
        {
            return this.groups;
        }

        /**
         * Get group by name
         *
         * @return {Uint8Array}
         * @memberof BroadcastManager
         */
        get_group(name: string): BroadcastGroup
        {
            for(let k in this.groups)
            {
                if(this.groups[k].groupname === name)
                {
                    return this.groups[k];
                }
            }
            return undefined;
        }
    }
}