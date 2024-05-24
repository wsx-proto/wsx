import { type WsxSocket, socketSymbols } from "../socket"
import * as symbols from "./symbols"
export { symbols as topicSymbols }

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
		for (const socket of this.sockets) {
			if (socket === except) continue
			socket[socketSymbols.send](data)
		}
	}
}

export class Broadcast {
	topics: Map<string, Topic> = new Map()

	remove(topic: string) {
		this.topics.delete(topic)
	}
}

/**
 * Local broadcast. Shares actions only across the same server instance
 */
export class LocalBroadcast extends Broadcast {
	topic(key: string): Topic {
		const topic = this.topics.get(key)
		if (topic) return topic

		const newTopic = new Topic(this, key)
		this.topics.set(key, newTopic)
		return newTopic
	}
}
