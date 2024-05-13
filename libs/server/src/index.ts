import {
	type Schema as AnySchema,
	type Infer,
	validate,
} from "@typeschema/main"
import {
	type MaybePromise,
	Proto,
	type RPCHandler,
	type RPCOptions,
	type RPCRoute,
	type ServerRpcHandler,
	isPromise,
	subprotocol,
} from "@wsx/shared"
import { RoutingProxy, Store } from "./proxy"
import type { AppendTypingPrefix, ConsumeTyping, PrepareTyping } from "./types"

import type { Serve, Server, ServerWebSocket, WebSocketHandler } from "bun"
import { WsxSocket, idSymbol, sendSymbol, socketSymbol } from "./socket"
export { WsxSocket } from "./socket"

/**
 * Options for Wsx server
 */
export type WsxOptions<Prefix extends string = ""> = {
	prefix?: Prefix
}

export type AnyWsx = Wsx<any, any, any>

type RoutesBase = Record<string, unknown>
type EventBase = Record<string, unknown>

/**
 * Adapt WebSocket handlers for Wsx
 */
export class WsxHandler implements WebSocketHandler {
	constructor(private wsx: AnyWsx) {}

	open(raw: ServerWebSocket): void {
		// preserve
	}

	close(raw: ServerWebSocket): void {
		// preserve
	}

	async message(raw: ServerWebSocket, message: string | Buffer): Promise<void> {
		const ws = WsxSocket.reuse(raw as any)
		const request: Proto.RpcRequest | Proto.RpcResponse = JSON.parse(
			message as string,
		)
		const [action] = request
		if (action === Proto.actionTypes.rpc.request) {
			const [, id, path, withResponse, body] = request
			const route = this.wsx.router.get(path)
			if (!route) {
				//todo
				return
			}

			const { body: bodySchema } = route
			if (bodySchema) {
				const validationResult = await validate(bodySchema, body)
				if (!validationResult.success) {
					console.error("validation failed", validationResult)
					return
				}
			}

			const proxy = RoutingProxy(route.prefix, ws as any, this.wsx.store)
			const rawResponse = route.handler({ ws, body, events: proxy })
			if (!withResponse) return
			const response = isPromise(rawResponse) ? await rawResponse : rawResponse

			const rpcResponse: Proto.RpcResponse = [
				Proto.actionTypes.rpc.response,
				id,
				response,
			]
			ws[sendSymbol](rpcResponse)
			return
		}

		if (action === Proto.actionTypes.rpc.response) {
			const [, id, body] = request
			const resolve = this.wsx.store.resolvers.get(id)
			if (!resolve) {
				console.error("No resolver for call", id)
				return
			}
			resolve(body)
			return
		}
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
	private handler: WsxHandler

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
		Bun.serve({
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
		Body extends Options["body"] extends AnySchema
			? Infer<Options["body"]>
			: unknown,
		Response extends Options["response"] extends AnySchema
			? Infer<Options["response"]>
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
		})
		return this as any
	}

	/**
	 * Declare a server-sent events
	 */
	event<
		const Path extends string,
		Options extends RPCOptions,
		Body extends Options["body"] extends AnySchema
			? Infer<Options["body"]>
			: unknown,
		Response extends Options["response"] extends AnySchema
			? Infer<Options["response"]>
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
			})
		}

		return this as any
	}
}

function upgrade(
	server: Server,
	...[request, options]: Parameters<Server["upgrade"]>
): boolean {
	if (request.headers.get("sec-websocket-protocol") !== subprotocol) {
		return false
	}
	return server.upgrade(request, {
		headers: options?.headers,
		data: {
			...(options?.data ?? {}),
			[socketSymbol]: null,
			[idSymbol]: "",
		},
	})
}
