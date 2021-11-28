/**
 * This namespace describe the Antunnel API
 * used by o ther application
 */
namespace Antunnel {

    /**
     * Tunnel message type
     *
     * @export
     * @enum {number}
     */
    export enum AntunnelMSGType {
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
    export interface AntunnelAPI {

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
    export var tunnel: AntunnelAPI;


    /**
     * A tunnel frame header
     *
     * @export
     * @interface AntunnelMSGHeader
     */
    export interface AntunnelMSGHeader {

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
    export interface AntunnelMSG {

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
    export interface AntunnelMSGMeta {
        /** 
         * constructor
         */
        new(): AntunnelMSG;

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

    export var Msg: AntunnelMSGMeta;


    /**
     * Interface of a Subscriber class
     *
     * @export
     * @interface SubscriberInterface
     */
    export interface SubscriberInterface {

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
        onerror: (d: string| AntunnelMSG) => void;

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
    export interface SubscriberInterfaceMeta {
        new(channel: string): SubscriberInterface;
    }

    export var Subscriber: SubscriberInterfaceMeta;

    /**
     * Core handle  initialization
     */
    export var init: (u: string) => void;
}