import type { ServerWebSocket } from "bun"
import type { Broadcast } from "./broadcast"

export const socketSymbol = Symbol("socket")
export const idSymbol = Symbol("id")
export const sendSymbol = Symbol("send")
export const roomsSymbol = Symbol("rooms")

export type WsxRawSocket = ServerWebSocket<{
	[socketSymbol]: WsxSocket
	[idSymbol]?: string
	[roomsSymbol]?: Set<Broadcast>
}>

/**
 * WebSocket augmented with Wsx-specific properties
 */
export class WsxSocket<Ws extends WsxRawSocket = WsxRawSocket> {
	constructor(public raw: Ws) {
		if (!this.id) {
			const array = new Uint32Array(1)
			crypto.getRandomValues(array)
			this.id = array[0].toString()
		}
	}

	static reuse(ws: WsxRawSocket): WsxSocket {
		if (!ws.data[socketSymbol]) {
			ws.data[socketSymbol] = new WsxSocket(ws)
		}
		return ws.data[socketSymbol]
	}

	/**
	 * Prepare data, js object schema optimisation
	 */
	static onUpgrade(): object {
		return {
			[socketSymbol]: null,
			[idSymbol]: "",
			[roomsSymbol]: null,
		}
	}

	get id(): string {
		return this.raw.data[idSymbol]!
	}

	set id(value: string) {
		this.raw.data[idSymbol] = value
	}

	[sendSymbol](data: unknown): void {
		if (Buffer.isBuffer(data)) {
			this.raw.send(data)
			return
		}

		if (typeof data === "object") {
			this.raw.send(JSON.stringify(data))
			return
		}

		this.raw.send(data as string)
	}
}
