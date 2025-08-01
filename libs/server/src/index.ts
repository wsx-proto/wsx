import {
	isObject,
	isPromise,
	type MaybePromise,
	Proto,
	type RPCHandler,
	type RPCOptions,
	type ServerRpcHandler,
	type StandardSchemaV1,
	standardValidate,
	subprotocol,
} from "@wsx/shared"
import type { Serve, Server, ServerWebSocket, WebSocketHandler } from "bun"
import { topicSymbols } from "./broadcast"
import {
	LifeCycleStore,
	type OnError,
	type OnHandle,
	type OnRequest,
	type OnResponse,
} from "./life-cycle"
import { RoutingProxy, Store } from "./proxy"
import { socketSymbols, WsxSocket } from "./socket"
import type { AppendTypingPrefix, ConsumeTyping, PrepareTyping } from "./types"

export { Localcast, Rediscast, Topic } from "./broadcast"
export { WsxSocket } from "./socket"

/**
 * Options for Wsx server
 */
export type WsxOptions<Prefix extends string = ""> = {
	prefix?: Prefix
}

/** Any Wsx instance */
export type AnyWsx = Wsx<any, any, any>

type RoutesBase = Record<string, unknown>
type EventBase = Record<string, unknown>

/**
 * Adapt WebSocket handlers for Wsx
 */
export class WsxHandler implements WebSocketHandler {
	constructor(private wsx: AnyWsx) {}

	open(raw: ServerWebSocket): void {
		const socket = WsxSocket.reuse(raw as any)
		this.wsx.sockets.set(socket.id, socket)
	}

	close(raw: ServerWebSocket): void {
		const socketRaw = raw as unknown as WsxSocket["raw"]
		this.wsx.sockets.delete(socketRaw.data[socketSymbols.id]!)
		const rooms = socketRaw.data[socketSymbols.topics]
		if (rooms) {
			for (const room of rooms) {
				room[topicSymbols.remove](raw as any)
			}
		}
	}

	async message(raw: ServerWebSocket, message: string | Buffer): Promise<void> {
		const ws = WsxSocket.reuse(raw as any)
		const action: Proto.GenericAction = JSON.parse(message as string)
		const [actionType] = action

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

			const route = this.wsx.router.get(path)
			if (!route) {
				// console.debug("Route not found", { path })
				if (isRpcRequest) {
					ws[socketSymbols.send]([
						Proto.actionTypes.rpc.response.fail,
						id!,
						"Route not found",
						{ path },
					] satisfies Proto.RpcResponse["fail"])
				}
				return
			}

			try {
				for (const hook of route.lifeCycle.onRequest) {
					await hook({ body, ws })
				}
			} catch (error) {
				await this.handleError(route, ws, error, "fail", id)
				return
			}

			const { body: bodySchema } = route
			if (bodySchema) {
				let validationResult = standardValidate(bodySchema, body)
				if (validationResult instanceof Promise) {
					validationResult = await validationResult
				}
				if (validationResult.issues) {
					// console.debug("Validation failed", validationResult.issues)
					if (isRpcRequest) {
						ws[socketSymbols.send]([
							Proto.actionTypes.rpc.response.fail,
							id!,
							"Validation failed",
							validationResult.issues,
						] satisfies Proto.RpcResponse["fail"])
					}
					return
				}
			}

			try {
				for (const hook of route.lifeCycle.onHandle) {
					await hook({ body, ws })
				}
			} catch (error) {
				await this.handleError(route, ws, error, "fail", id)
				return
			}

			const proxy = RoutingProxy(route.prefix, ws as any, this.wsx)
			let response: unknown
			try {
				const rawResponse = route.handler({ ws, body, events: proxy })
				response = isPromise(rawResponse) ? await rawResponse : rawResponse
			} catch (error) {
				await this.handleError(route, ws, error, "error", id)
				return
			}

			if (isRpcRequest) {
				for (const hook of route.lifeCycle.onResponse) {
					await hook({ body, ws }, response)
				}

				ws[socketSymbols.send]([
					Proto.actionTypes.rpc.response.success,
					id!,
					response,
				] satisfies Proto.RpcResponse["success"])
			}
			return
		}

		if (Proto.isRpcResponse(action)) {
			const [, id, body] = action
			const resolve = this.wsx.store.resolvers.get(id)
			if (!resolve) {
				console.error("No resolver for call", id)
				return
			}
			resolve(body)
			return
		}
	}

	async handleError(
		route: RPCRoute<ServerRpcHandler>,
		ws: WsxSocket,
		error: unknown,
		type: "fail" | "error",
		id?: number,
	): Promise<void> {
		for (const hook of route.lifeCycle.onError) {
			await hook(ws, error)
		}

		const message =
			isObject(error) && typeof (error as any).message === "string"
				? (error as any).message
				: "Error occured during handling"

		if (type === "fail") {
			ws[socketSymbols.send]([
				Proto.actionTypes.rpc.response.fail,
				id!,
				message,
				{ error },
			] satisfies Proto.RpcResponse["fail"])
			return
		}

		ws[socketSymbols.send]([
			Proto.actionTypes.rpc.response.error,
			id!,
			message,
			{ error },
		] satisfies Proto.RpcResponse["error"])
	}
}

/**
 * Wsx server instance or plugin
 */
export class Wsx<
	const in out Prefix extends string = "",
	const out Routes extends RoutesBase = {},
	const out Events extends EventBase = {},
> {
	prefix: Prefix
	router: Map<string, RPCRoute<ServerRpcHandler>> = new Map()
	events: Map<string, RPCOptions> = new Map()
	store: Store = new Store()
	sockets: Map<string, WsxSocket> = new Map()
	private handler: WsxHandler
	server?: Server
	lifeCycle: LifeCycleStore = new LifeCycleStore()

	constructor(options?: WsxOptions<Prefix>) {
		this.handler = new WsxHandler(this)
		this.prefix = options?.prefix ?? ("" as Prefix)
	}

	/**
	 * Attach the Wsx server to an existing server
	 */
	attach(): WebSocketHandler & { upgrade: typeof upgrade } {
		return {
			upgrade,
			open: this.handler.open.bind(this.handler),
			close: this.handler.close.bind(this.handler),
			message: this.handler.message.bind(this.handler),
		}
	}

	listen(
		port: number,
		options?: Omit<Serve, "port" | "fetch" | "websocket"> & {
			/**
			 * Mount a custom handler for non-wsx requests
			 */
			httpHandler?: (request: Request) => MaybePromise<Response>
		},
	): this {
		const websocket = this.attach()
		this.server = Bun.serve({
			port,

			fetch(request, server) {
				const success = websocket.upgrade(server, request)
				if (!success) {
					options?.httpHandler?.(request)
				}
			},
			websocket,
		})
		return this
	}

	route<
		const Path extends string,
		Options extends RPCOptions,
		Body extends Options["body"] extends StandardSchemaV1
			? StandardSchemaV1.InferOutput<Options["body"]>
			: unknown,
		Response extends Options["response"] extends StandardSchemaV1
			? StandardSchemaV1.InferOutput<Options["response"]>
			: unknown,
		Typing = PrepareTyping<
			`${Prefix}${Path extends "/" ? "/index" : Path}`,
			{
				$type: "route"
				$body: Body
				$response: Response
			}
		>,
	>(
		path: Path,
		handler: RPCHandler<
			{ body: Body; ws: WsxSocket; events: ConsumeTyping<Events> },
			Response
		>,
		options?: Options,
	): Wsx<Prefix, Routes & Typing, Events> {
		this.router.set(this.prefix + path, {
			prefix: this.prefix,
			handler: handler as RPCHandler,
			body: options?.body,
			response: options?.response,
			lifeCycle: this.lifeCycle.clone(),
		})
		return this as any
	}

	/**
	 * Declare a server-sent events
	 */
	event<
		const Path extends string,
		Options extends RPCOptions,
		Body extends Options["body"] extends StandardSchemaV1
			? StandardSchemaV1.InferOutput<Options["body"]>
			: unknown,
		Response extends Options["response"] extends StandardSchemaV1
			? StandardSchemaV1.InferOutput<Options["response"]>
			: unknown,
		Typing = PrepareTyping<
			`${Prefix}${Path extends "/" ? "/index" : Path}`,
			{
				$type: "event"
				$body: Body
				$response: Response
			}
		>,
	>(path: Path, options?: Options): Wsx<Prefix, Routes, Events & Typing> {
		this.events.set(this.prefix + path, options ?? {})
		return this as any
	}

	use<
		PluginPath extends string,
		PluginRoutes extends RoutesBase,
		PluginEvents extends EventBase,
	>(
		plugin: Wsx<PluginPath, PluginRoutes, PluginEvents>,
	): Wsx<
		Prefix,
		Routes & AppendTypingPrefix<Prefix, PluginRoutes>,
		Events & AppendTypingPrefix<Prefix, PluginEvents>
	> {
		for (const [path, route] of plugin.router) {
			this.router.set(this.prefix + path, {
				...route,
				prefix: this.prefix + route.prefix,
				lifeCycle: route.lifeCycle.clone().prepend(this.lifeCycle),
			})
		}

		return this as any
	}

	// Life cycle methods

	onRequest(handler: OnRequest): this {
		this.lifeCycle.onRequest.push(handler)
		return this
	}

	onHandle(handler: OnHandle): this {
		this.lifeCycle.onHandle.push(handler)
		return this
	}

	onResponse(handler: OnResponse): this {
		this.lifeCycle.onResponse.push(handler)
		return this
	}

	onError(handler: OnError): this {
		this.lifeCycle.onError.push(handler)
		return this
	}
}

function upgrade(
	server: Server,
	...[request, options]: Parameters<Server["upgrade"]>
): boolean {
	if (request.headers.get("sec-websocket-protocol") !== subprotocol) {
		return false
	}
	const data = WsxSocket.onUpgrade()
	return server.upgrade(request, {
		headers: options?.headers,
		data: !options?.data
			? data
			: {
					...options.data,
					...data,
				},
	})
}

export type RPCRoute<Handler = RPCHandler> = {
	/**
	 * For events localisation
	 */
	prefix: string
	handler: Handler
	lifeCycle: LifeCycleStore
} & RPCOptions
