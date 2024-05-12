import { Proto } from "@wsx/shared"
import type { ServerWsInternal } from "./types"

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
	ws: ServerWsInternal,
	store: Store,
	paths: string[] = [],
): any =>
	new Proxy(() => {}, {
		get(_, param: string): any {
			if (param === "then") return undefined //! prevent promise resolution quirk
			return RoutingProxy(
				ws,
				store,
				param === "index" ? paths : [...paths, param],
			)
		},
		apply(_, __, [body, options]) {
			const methodPaths = [...paths]
			const method = methodPaths.pop() as Method
			const path = `/${methodPaths.join("/")}`

			const id = store.id++
			const withResponse = method === "call"
			const rpcRequest: Proto.RpcRequest = [
				Proto.actionTypes.rpc.request,
				id,
				path,
				withResponse,
				body,
			]
			ws.send(JSON.stringify(rpcRequest))

			if (!withResponse) return
			let resolve: Resolve
			const responsePromise = new Promise((innerResolve) => {
				resolve = innerResolve
			})
			store.resolvers.set(id, resolve!)
			return responsePromise
		},
	}) as any
