
/**
 * This namespace describe the Antunnel API
 * used by o ther application
 */
declare namespace Antunnel {
    /**
     * Tunnel message type
     *
     * @export
     * @enum {number}
     */
    enum AntunnelMSGType {
        OK = 0,
        SUBSCRIBE = 2,
        UNSUBSCRIBE = 3,
        ERROR = 1,
        DATA = 6,
        CTRL = 7,
        CLOSE = 5,
        PING = 8
    }
    /**
     * Main tunnel core handle API
     *
     * @export
     * @interface AntunnelAPI
     */
    interface AntunnelAPI {
        /**
         * Close the socket connection attached to the
         * current handle
         *
         * @memberof AntunnelAPI
         */
        close(): void;
        /**
         * register a subscriber to the handle
         *
         * @param {SubscriberInterface} sub
         * @memberof AntunnelAPI
         */
        subscribe(sub: SubscriberInterface): void;
        /**
         * Remove a subscriber from the handle
         *
         * @param {SubscriberInterface} sub
         * @param {boolean} b notify the backend ?
         * @memberof AntunnelAPI
         */
        unsubscribe(sub: SubscriberInterface, b: boolean): void;
    }
    /**
     * Singleton instance to the current core tunnel handle
     */
    var tunnel: AntunnelAPI;
    /**
     * A tunnel frame header
     *
     * @export
     * @interface AntunnelMSGHeader
     */
    interface AntunnelMSGHeader {
        /**
         * Client ID allocated by the backend
         *
         * @type {number}
         * @memberof AntunnelMSGHeader
         */
        cid: number;
        /**
         * Subscriber ID allocated by Antunnel frontend
         *
         * @type {number}
         * @memberof AntunnelMSGHeader
         */
        sid: number;
        /**
         * Payload size
         *
         * @type {number}
         * @memberof AntunnelMSGHeader
         */
        size: number;
        /**
         * Message type
         *
         * @type {AntunnelMSGType}
         * @memberof AntunnelMSGHeader
         */
        type: AntunnelMSGType;
    }
    /**
     * Tunnel frame format
     *
     * @export
     * @interface AntunnelMSG
     */
    interface AntunnelMSG {
        /**
         * frame header
         *
         * @type {AntunnelMSGHeader}
         * @memberof AntunnelMSG
         */
        header: AntunnelMSGHeader;
        /**
         * raw data
         *
         * @type {Uint8Array}
         * @memberof AntunnelMSG
         */
        data: Uint8Array;
        /**
         * helper function that convert the
         * entire frame to byte array
         *
         * @memberof AntunnelMSG
         */
        as_raw(): void;
    }
    /**
     * Static members of Msg class
     *
     * @export
     * @interface AntunnelMSGMeta
     */
    interface AntunnelMSGMeta {
        /**
         * constructor
         */
        new (): AntunnelMSG;
        /**
         * convert number to array (network byte order)
         *
         * @param {number} x
         * @param {number} [s]
         * @return {*}  {Uint8Array}
         * @memberof AntunnelMSGMeta
         */
        bytes_of(x: number, s?: number): Uint8Array;
        /**
         * convert network byte order array to number
         *
         * @param {Uint8Array} data
         * @param {number} offset
         * @param {number} [s]
         * @return {*}  {number}
         * @memberof AntunnelMSGMeta
         */
        int_from(data: Uint8Array, offset: number, s?: number): number;
        OK: AntunnelMSGType;
        ERROR: AntunnelMSGType;
        DATA: AntunnelMSGType;
        CLOSE: AntunnelMSGType;
        SUBSCRIBE: AntunnelMSGType;
        UNSUBSCRIBE: AntunnelMSGType;
        CTRL: AntunnelMSGType;
        PING: AntunnelMSGType;
    }
    var Msg: AntunnelMSGMeta;
    /**
     * Interface of a Subscriber class
     *
     * @export
     * @interface SubscriberInterface
     */
    interface SubscriberInterface {
        /**
         * Subscriber ID allocated by Antunnel API
         *
         * @type {number}
         * @memberof SubscriberInterface
         */
        id: number;
        /**
         * Channel ID/ Client ID allocated by backend
         *
         * @type {number}
         * @memberof SubscriberInterface
         */
        channel_id: number;
        /**
         * Called when a channel is opened for
         * this subscriber
         *
         * @memberof SubscriberInterface
         */
        onopen: () => void;
        /**
         * Error handle callback
         *
         * @memberof SubscriberInterface
         */
        onerror: (d: string | AntunnelMSG) => void;
        /**
         * Message callback
         *
         * @memberof SubscriberInterface
         */
        onmessage: (m: AntunnelMSG) => void;
        /**
         * Control messqge callback
         *
         * @memberof SubscriberInterface
         */
        onctrl: (m: AntunnelMSG) => void;
        /**
         * Subscriber close callback
         *
         * @memberof SubscriberInterface
         */
        onclose: () => void;
        /**
         * Send a message to backend
         *
         * @memberof SubscriberInterface
         */
        send: (t: AntunnelMSGType, arr: Uint8Array) => void;
        close: () => void;
    }
    /**
     * Static member of a subscriber
     *
     * @export
     * @interface SubscriberInterfaceMeta
     */
    interface SubscriberInterfaceMeta {
        new (channel: string): SubscriberInterface;
    }
    var Subscriber: SubscriberInterfaceMeta;
    /**
     * Core handle  initialization
     */
    var init: (u: string) => void;
}

/**
 * Broadcast plugin for Antunnel to communication
 * with the backend Antunnel broadcast publisher
 */
declare namespace Antunnel {
    /**
     * Broadcast control message type
     *
     * @export
     * @enum {number}
     */
    enum BroadcastCTRLType {
        SUBSCRIBE = 10,
        UNSUBSCRIBE = 11,
        QUERY_USER = 12,
        QUERY_GROUP = 13
    }
    /**
     * Group state
     *
     * @export
     * @enum {number}
     */
    enum BroadcastGroupState {
        INIT = 0,
        SUBSCRIBED = 1,
        UNSUBSCRIBED = 2
    }
    /**
     * Broadcast control message
     *
     * @export
     * @interface BroadcastCTRLMsg
     */
    interface BroadcastCTRLMsg {
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
    class BroadcastGroup {
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
        constructor(name: string);
        /**
         * Leave the group
         *
         * @return {*}  {void}
         * @memberof BroadcastGroup
         */
        close(): void;
        /**
         * Query all users in the group
         *
         * @return {*}  {void}
         * @memberof BroadcastGroup
         */
        refresh(): void;
        /**
         * Send a message to the group
         *
         * @param {Uint8Array} data
         * @memberof BroadcastGroup
         */
        send(data: Uint8Array): void;
    }
    /**
     * Broadcast Manager
     * Managing all group handles created by the current
     * user
     *
     * @export
     * @class BroadcastManager
     */
    class BroadcastManager {
        /**
         * Reference to Antunnel subscriber
         *
         * @private
         * @type {SubscriberInterface}
         * @memberof BroadcastManager
         */
        private sub;
        /**
         * channel name
         *
         * @private
         * @type {string}
         * @memberof BroadcastManager
         */
        private channel;
        /**
         * Reference to the global tunnel handle
         *
         * @private
         * @type {AntunnelAPI}
         * @memberof BroadcastManager
         */
        private tunnel;
        /**
         * list of all registered group handles
         *
         * @private
         * @type {{[prop: number]: BroadcastGroup}}
         * @memberof BroadcastManager
         */
        private groups;
        /**
         * temporary list of group handles that wait for
         * an connection confirmation from the backend
         *
         * @private
         * @type {GenericObject<BroadcastGroup>}
         * @memberof BroadcastManager
         */
        private pendings;
        /**
         * callback handle when a group is added to the
         * manager
         *
         * @private
         * @type (group: BroadcastGroup)=> void
         * @memberof BroadcastManager
         */
        ongroupadd: (group: BroadcastGroup) => void;
        /**
         * callback handle when a group is removed from the
         * manager
         *
         * @private
         * @type (group: BroadcastGroup)=> void
         * @memberof BroadcastManager
         */
        ongroupdel: (group: BroadcastGroup) => void;
        /**
         * Creates an instance of BroadcastManager.
         * @param {string} channel
         * @memberof BroadcastManager
         */
        constructor(channel: string);
        /**
         * Connect to the broadcast channel
         *
         * @private
         * @param {(d: any)=> void} resolve
         * @memberof BroadcastManager
         */
        private connect;
        /**
         * Perform setup of the manager:
         * - Check if Antunnel API is available
         * - Connect to the tunnel if the global tunnel does not exists
         * - Subscribe to th e broadcast channel if not done
         *
         * @return {*}  {Promise<any>}
         * @memberof BroadcastManager
         */
        setup(): Promise<any>;
        /**
         * Remove a group handle from the manager
         *
         * @param {number} gid
         * @memberof BroadcastManager
         */
        unsubscribe(gid: number): void;
        /**
         * Query users in the specific group
         *
         * @param {number} gid group id
         * @memberof BroadcastManager
         */
        query(gid: number): void;
        /**
         * Query all groups of the current user
         *
         * @memberof BroadcastManager
         */
        refresh(): void;
        /**
         * Register a group to the manager
         *
         * @param {string} group
         * @memberof BroadcastManager
         */
        subscribe(group: string): void;
        /**
         *CLeanup the manager
         *
         * @memberof BroadcastManager
         */
        teardown(): void;
        /**
         * return the current subscriber ID
         *
         * @memberof BroadcastManager
         * @return {number}
         */
        id(): number;
        /**
         * Send a message to a specific group
         *
         * @param {number} gid
         * @param {Uint8Array} data
         * @memberof BroadcastManager
         */
        send(gid: number, data: Uint8Array): void;
    }
}
