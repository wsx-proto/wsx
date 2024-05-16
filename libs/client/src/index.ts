import type { Wsx } from "@wsx/server"
import type { ClientConfig, ClientType } from "./types"
export type { ClientType, ClientConfig, ClientWs } from "./types"

import { Proto, type RPCHandler, isPromise, subprotocol } from "@wsx/shared"

type Method = (typeof methods)[number]
const methods = ["call", "emit", "listen", "unlisten"] as const

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
			let actionToSend: Proto.Emit | Proto.RpcRequest
			if (method === "emit") {
				actionToSend = [Proto.actionTypes.emit, path, body]
			} else {
				actionToSend = [Proto.actionTypes.rpc.request, id, path, body]
			}
			ws.send(JSON.stringify(actionToSend))

			if (method === "call") {
				let resolve: Resolve
				const responsePromise = new Promise((innerResolve) => {
					resolve = innerResolve
				})
				store.resolvers.set(id, resolve!)
				return responsePromise
			}
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
			const action = JSON.parse(data) as Proto.GenericAction
			const [actionType] = action
			if (Proto.isRpcResponse(action)) {
				const [, id, body] = action
				const resolve = store.resolvers.get(id)
				if (!resolve) {
					console.error("No resolver for call", id)
					return
				}
				resolve(body)
				return
			}

			const isEmit = actionType === Proto.actionTypes.emit
			const isRpcRequest = actionType === Proto.actionTypes.rpc.request
			if (isEmit || isRpcRequest) {
				let id: number | undefined
				let path: string
				let body: unknown
				if (isEmit) {
					;[, path, body] = action
				} else {
					;[, id, path, body] = action
				}

				const handler = store.listeners.get(path)
				if (!handler) {
					console.error("No listener for path", path)
					return
				}
				const rawResponse = handler({ ws, body })
				if (isRpcRequest) {
					const responseBody = isPromise(rawResponse)
						? await rawResponse
						: rawResponse
					ws.send(
						JSON.stringify([
							Proto.actionTypes.rpc.response.success,
							id!,
							responseBody,
						] satisfies Proto.RpcResponse["success"]),
					)
				}
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
