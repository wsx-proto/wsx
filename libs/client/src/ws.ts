import type { InputSchema } from "elysia"
import { isNumericString } from "./utils"

export interface OnMessage<Data = unknown> extends MessageEvent {
	data: Data
	rawData: MessageEvent["data"]
}

export type WSEvent<
	K extends keyof WebSocketEventMap,
	Data = unknown,
> = K extends "message" ? OnMessage<Data> : WebSocketEventMap[K]

export class EdenWS<in out Schema extends InputSchema<any> = {}> {
	ws: WebSocket

	constructor(public url: string) {
		this.ws = new WebSocket(url)
	}

	send(data: Schema["body"] | Schema["body"][]) {
		if (Array.isArray(data)) {
			for (const datum of data) {
				this.send(datum)
			}

			return this
		}

		this.ws.send(
			typeof data === "object" ? JSON.stringify(data) : data.toString(),
		)

		return this
	}

	on<K extends keyof WebSocketEventMap>(
		type: K,
		listener: (event: WSEvent<K, Schema["response"]>) => void,
		options?: boolean | AddEventListenerOptions,
	) {
		return this.addEventListener(type, listener, options)
	}

	off<K extends keyof WebSocketEventMap>(
		type: K,
		listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
		options?: boolean | EventListenerOptions,
	) {
		this.ws.removeEventListener(type, listener, options)

		return this
	}

	subscribe(
		onMessage: (event: WSEvent<"message", Schema["response"]>) => void,
		options?: boolean | AddEventListenerOptions,
	) {
		return this.addEventListener("message", onMessage, options)
	}

	addEventListener<K extends keyof WebSocketEventMap>(
		type: K,
		listener: (event: WSEvent<K, Schema["response"]>) => void,
		options?: boolean | AddEventListenerOptions,
	) {
		this.ws.addEventListener(
			type,
			(ws) => {
				if (type === "message") {
					let data = (ws as MessageEvent).data.toString() as any
					const start = data.charCodeAt(0)

					if (start === 47 || start === 123)
						try {
							data = JSON.parse(data)
						} catch {
							// Not Empty
						}
					else if (isNumericString(data)) data = +data
					else if (data === "true") data = true
					else if (data === "false") data = false

					listener({
						...ws,
						data,
					} as any)
				} else listener(ws as any)
			},
			options,
		)

		return this
	}

	removeEventListener<K extends keyof WebSocketEventMap>(
		type: K,
		listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
		options?: boolean | EventListenerOptions,
	) {
		this.off(type, listener, options)

		return this
	}

	close() {
		this.ws.close()

		return this
	}
}
