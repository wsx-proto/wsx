import { type WsxSocket, roomsSymbol, sendSymbol } from "./socket"

export const roomPublishSymbol = Symbol("roomPublish")
export const roomRemoveSymbol = Symbol("roomRemove")

export class Broadcast {
	sockets: Set<WsxSocket> = new Set()

	constructor(
		public topic: string,
		private manager: BroadcastsManager,
	) {}

	subscribe(socket: WsxSocket) {
		this.sockets.add(socket)
		if (!socket.raw.data[roomsSymbol]) {
			socket.raw.data[roomsSymbol] = new Set()
		}
		socket.raw.data[roomsSymbol].add(this)
	}

	unsubscribe(socket: WsxSocket) {
		this[roomRemoveSymbol](socket)
		socket.raw.data[roomsSymbol]?.delete(this)
	}

	[roomRemoveSymbol](socket: WsxSocket) {
		this.sockets.delete(socket)
		if (this.sockets.size === 0) {
			this.manager.remove(this.topic)
		}
	}

	[roomPublishSymbol](data: unknown, except?: WsxSocket) {
		for (const socket of this.sockets) {
			if (socket === except) continue
			socket[sendSymbol](data)
		}
	}
}

export class BroadcastsManager {
	broadcasts = new Map<string, Broadcast>()

	remove(topic: string) {
		this.broadcasts.delete(topic)
	}
}

export class LocalBroadcastsManager extends BroadcastsManager {
	topic(topic: string) {
		const existingBroadcast = this.broadcasts.get(topic)
		if (existingBroadcast) return existingBroadcast

		const newBroadcast = new Broadcast(topic, this)
		this.broadcasts.set(topic, newBroadcast)
		return newBroadcast
	}
}
