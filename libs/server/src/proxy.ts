import { Proto } from "@wsx/shared"
import type { AnyWsx } from "."
import { type WsxSocket, sendSymbol } from "./socket"

type Method = (typeof methods)[number]
const methods = ["call", "send"] as const

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
	store: Store,
	paths: string[] = [],
): any =>
	new Proxy(() => {}, {
		get(_, param: string): any {
			if (param === "then") return undefined //! prevent promise resolution quirk
			return RoutingProxy(
				prefix,
				ws,
				store,
				param === "index" ? paths : [...paths, param],
			)
		},
		apply(_, __, [body, options]) {
			const methodPaths = [...paths]
			const method = methodPaths.pop() as Method
			const path = `${prefix}/${methodPaths.join("/")}`

			const id = store.id++
			const withResponse = method === "call"
			const rpcRequest: Proto.RpcRequest = [
				Proto.actionTypes.rpc.request,
				id,
				path,
				withResponse,
				body,
			]
			ws[sendSymbol](rpcRequest)

			if (!withResponse) return
			let resolve: Resolve
			const responsePromise = new Promise((innerResolve) => {
				resolve = innerResolve
			})
			store.resolvers.set(id, resolve!)
			return responsePromise
		},
	}) as any
