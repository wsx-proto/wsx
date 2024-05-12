import type { ServerWebSocket } from "bun"

export const idSymbol = Symbol("id")
export const sendSymbol = Symbol("send")

export type WsxRawSocket = ServerWebSocket<{ [idSymbol]?: string }>

/**
 * WebSocket augmented with WSX-specific properties
 */
export class WsxSocket<Ws extends WsxRawSocket = WsxRawSocket> {
	constructor(public raw: Ws) {
		if (!this.id) {
			const array = new Uint32Array(1)
			crypto.getRandomValues(array)
			this.id = array[0].toString()
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
