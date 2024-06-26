import type { ServerWebSocket } from "bun"
import type { Topic } from "../broadcast"
import { genId } from "../utils/gen-id"
import * as symbols from "./symbols"
export { symbols as socketSymbols }

export type WsxRawSocket = ServerWebSocket<{
	[symbols.socket]: WsxSocket
	[symbols.id]?: string
	[symbols.topics]?: Set<Topic>
}>

/**
 * WebSocket augmented with Wsx-specific properties
 */
export class WsxSocket<Ws extends WsxRawSocket = WsxRawSocket> {
	constructor(public raw: Ws) {
		this.id ??= genId()
	}

	static reuse(ws: WsxRawSocket): WsxSocket {
		ws.data[symbols.socket] ??= new WsxSocket(ws)
		return ws.data[symbols.socket]
	}

	/**
	 * Prepare data, js object schema optimisation
	 */
	static onUpgrade(): object {
		return {
			[symbols.socket]: null,
			[symbols.id]: "",
			[symbols.topics]: null,
		}
	}

	get id(): string {
		return this.raw.data[symbols.id]!
	}

	set id(value: string) {
		this.raw.data[symbols.id] = value
	}

	get data(): any {
		return this.raw.data
	}

	[symbols.send](data: unknown): void {
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
