import type { MaybePromise } from "@wsx/shared"
import type { WsxSocket } from "./socket"

export class LifeCycleStore {
	onRequest: OnRequest[] = []
	onHandle: OnHandle[] = []
	onResponse: OnResponse[] = []
	onError: OnError[] = []

	clone(): LifeCycleStore {
		const clone = new LifeCycleStore()
		clone.onRequest = this.onRequest.slice()
		clone.onHandle = this.onHandle.slice()
		clone.onResponse = this.onResponse.slice()
		clone.onError = this.onError.slice()
		return clone
	}

	prepend(store: LifeCycleStore): this {
		this.onRequest.unshift(...store.onRequest)
		this.onHandle.unshift(...store.onHandle)
		this.onResponse.unshift(...store.onResponse)
		this.onError.unshift(...store.onError)
		return this
	}

	append(store: LifeCycleStore): this {
		this.onRequest.push(...store.onRequest)
		this.onHandle.push(...store.onHandle)
		this.onResponse.push(...store.onResponse)
		this.onError.push(...store.onError)
		return this
	}
}

export type OnRequest = (options: {
	body: any
	ws: WsxSocket
}) => MaybePromise<void>

export type OnHandle = (options: {
	body: any
	ws: WsxSocket
}) => MaybePromise<void>

export type OnResponse = (
	options: {
		body: any
		ws: WsxSocket
	},
	response: any,
) => MaybePromise<void>

export type OnError = (ws: WsxSocket, error: any) => MaybePromise<void>
