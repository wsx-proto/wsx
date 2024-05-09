import type { Wsx } from "@wsx/server"
import type { ClientNs } from "./types"
export type { ClientNs as ClientType }

import { actionTypes, type GenericResponse, type RpcRequest } from "@wsx/shared"

type Method = (typeof methods)[number]
const methods = ["call", "send", "listen"] as const

const locals = ["localhost", "127.0.0.1", "0.0.0.0"]

type Resolve = (response: unknown) => void

class Store {
	/**
	 * next request id
	 */
	id = 0
	/**
	 * resolvers for requests promises
	 */
	resolvers: Map<number, Resolve> = new Map()
}

const RoutingProxy = (
	ws: WebSocket,
	store: Store,
	config: ClientNs.Config,
	paths: string[] = [],
): any =>
	new Proxy(() => {}, {
		get(_, param: string): any {
			if (param === "then") return undefined //! prevent promise resolution quirk
			return RoutingProxy(
				ws,
				store,
				config,
				param === "index" ? paths : [...paths, param],
			)
		},
		apply(_, __, [body, options]) {
			const methodPaths = [...paths]
			const method = methodPaths.pop() as Method
			const path = `/${methodPaths.join("/")}`

			if (method === "listen") {
				// todo
				return
			}

			const id = store.id++
			const withResponse = method === "call"
			const rpcRequest: RpcRequest = [
				actionTypes.rpc.request,
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

export const Client = <
	const App extends Wsx<any, any>,
	Callers = ClientNs.Create<App>,
>(
	domain: string,
	config: ClientNs.Config = {},
): Promise<Callers> => {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(config.keepDomain ? domain : fixDomain(domain))
		const store = new Store()

		const routingProxy = RoutingProxy(ws, store, config)

		ws.addEventListener("open", () => {
			resolve(routingProxy)
		})

		ws.addEventListener("close", () => {
			reject(new Error(`Cannot connect to server ${domain}`))
		})

		ws.addEventListener("message", ({ data }) => {
			const response = JSON.parse(data) as GenericResponse
			const [action] = response
			if (action === actionTypes.rpc.response) {
				const [, id, body] = response
				const resolve = store.resolvers.get(id)
				if (!resolve) {
					console.error("No resolver for call", id)
					return
				}
				resolve(body)
			}
		})
	})
}

function fixDomain(domain: string) {
	if (!domain.includes("://"))
		domain =
			(locals.find((v) => (domain as string).includes(v))
				? "ws://"
				: "wss://") + domain

	if (domain.endsWith("/")) domain = domain.slice(0, -1)
	return domain
}
