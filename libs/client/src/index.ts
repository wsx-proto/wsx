import type { Wsx } from "@wsx/server"
import type { ClientConfig, ClientType } from "./types"
export type { ClientType, ClientConfig, ClientWs } from "./types"

import { Proto, type RPCHandler, isPromise, subprotocol } from "@wsx/shared"

type Method = (typeof methods)[number]
const methods = ["call", "send", "listen", "unlisten"] as const

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
	/**
	 * listeners for server-sent events
	 */
	listeners: Map<string, RPCHandler> = new Map()
}

const RoutingProxy = (
	ws: WebSocket,
	store: Store,
	config: ClientConfig,
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
				store.listeners.set(path, body) // body is a handler ¯\_(ツ)_/¯
				return
			}

			if (method === "unlisten") {
				store.listeners.delete(path)
				return
			}

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

/**
 * Create a client for the Wsx server
 */
export const Client = <
	const App extends Wsx<any, any>,
	Callers = ClientType<App>,
>(
	domain: string,
	config: ClientConfig = {},
): Promise<{ routes: Callers; raw: WebSocket }> => {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(
			config.keepDomain ? domain : fixDomain(domain),
			subprotocol,
		)
		const store = new Store()

		const routingProxy = RoutingProxy(ws, store, config)

		ws.addEventListener("open", () => {
			resolve({ routes: routingProxy, raw: ws })
		})

		ws.addEventListener("close", () => {
			reject(new Error(`Cannot connect to server ${domain}`))
		})

		ws.addEventListener("message", async ({ data }) => {
			const response = JSON.parse(data) as Proto.RpcResponse | Proto.RpcRequest
			const [action] = response
			if (action === Proto.actionTypes.rpc.response) {
				const [, id, body] = response
				const resolve = store.resolvers.get(id)
				if (!resolve) {
					console.error("No resolver for call", id)
					return
				}
				resolve(body)
				return
			}
			if (action === Proto.actionTypes.rpc.request) {
				const [, id, path, withResponse, body] = response
				const handler = store.listeners.get(path)
				if (!handler) {
					console.error("No listener for path", path)
					return
				}
				const rawResponse = handler({ ws, body })
				if (!withResponse) return
				const responseBody = isPromise(rawResponse)
					? await rawResponse
					: rawResponse
				const rpcResponse: Proto.RpcResponse = [
					Proto.actionTypes.rpc.response,
					id,
					responseBody,
				]
				ws.send(JSON.stringify(rpcResponse))
				return
			}
		})
	})
}

function fixDomain(domain: string): string {
	if (!domain.includes("://"))
		domain =
			(locals.find((v) => (domain as string).includes(v))
				? "ws://"
				: "wss://") + domain

	if (domain.endsWith("/")) domain = domain.slice(0, -1)
	return domain
}
