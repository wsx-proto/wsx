import { Proto } from "@wsx/shared"
import type { AnyWsx } from "."
import { roomPublishSymbol } from "./broadcast"
import { type WsxSocket, sendSymbol } from "./socket"
import type { SendOptions } from "./types"

type Method = (typeof methods)[number]
const methods = ["call", "emit"] as const

type Resolve = (response: unknown) => void

export class Store {
	/**
	 * next request id
	 */
	id = 0
	/**
	 * resolvers for requests promises
	 */
	resolvers: Map<number, Resolve> = new Map()
}

export const RoutingProxy = (
	prefix: string,
	ws: WsxSocket,
	wsx: AnyWsx,
	paths: string[] = [],
): any =>
	new Proxy(() => {}, {
		get(_, param: string): any {
			if (param === "then") return undefined //! prevent promise resolution quirk
			return RoutingProxy(
				prefix,
				ws,
				wsx,
				param === "index" ? paths : [...paths, param],
			)
		},
		apply(_, __, [body, options]: [any, SendOptions?]) {
			const methodPaths = [...paths]
			const method = methodPaths.pop() as Method
			const path = `${prefix}/${methodPaths.join("/")}`

			if (method === "call") {
				let sendTo: WsxSocket = ws
				if (options && "id" in options && options?.id) {
					sendTo = wsx.sockets.get(options.id as string)!
				}

				const id = wsx.store.id++
				const action: Proto.RpcRequest = [
					Proto.actionTypes.rpc.request,
					id,
					path,
					body,
				]
				sendTo[sendSymbol](action)

				let resolve: Resolve
				const responsePromise = new Promise((innerResolve) => {
					resolve = innerResolve
				})
				wsx.store.resolvers.set(id, resolve!)
				return responsePromise
			}

			if (method === "emit") {
				const id = wsx.store.id++
				const action: Proto.Emit = [Proto.actionTypes.emit, path, body]

				if (!options) {
					ws[sendSymbol](action)
					return
				}

				if ("id" in options && options.id) {
					wsx.sockets.get(options.id)![sendSymbol](action)
					return
				}

				if ("broadcast" in options && options.broadcast) {
					options.broadcast[roomPublishSymbol](action, ws)
				}
			}
		},
	}) as any
