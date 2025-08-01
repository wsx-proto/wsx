import { socketSymbols, type WsxSocket } from "../../socket"
import type { Broadcast } from "../broadcast"
import * as symbols from "./symbols"
export { symbols as topicSymbols }

import * as broadcastSymbols from "../symbols"

/**
 * Pub/Sub topic
 */
export class Topic {
	sockets: Set<WsxSocket> = new Set()

	constructor(
		private broadcast: Broadcast,
		public key: string,
	) {}

	subscribe(socket: WsxSocket) {
		this.sockets.add(socket)
		socket.raw.data[socketSymbols.topics] ??= new Set()
		socket.raw.data[socketSymbols.topics].add(this)
	}

	unsubscribe(socket: WsxSocket) {
		this[symbols.remove](socket)
		socket.raw.data[socketSymbols.topics]?.delete(this)
	}

	[symbols.remove](socket: WsxSocket) {
		this.sockets.delete(socket)
		if (this.sockets.size === 0) {
			this.broadcast.remove(this.key)
		}
	}

	[symbols.publish](data: unknown, except?: WsxSocket) {
		this.broadcast[broadcastSymbols.publish](this, data, except)
	}
}
