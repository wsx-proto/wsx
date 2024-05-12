import {
	type Schema as AnySchema,
	type Infer,
	validate,
} from "@typeschema/main"
import {
	Proto,
	type RPCHandler,
	type RPCOptions,
	type RPCRoute,
	type ServerRpcHandler,
	isPromise,
} from "@wsx/shared"
import { type CreateEden, Elysia } from "elysia"
import { RoutingProxy, Store } from "./proxy"
import type { ServerNs, ServerWs } from "./types"

export type WsxOptions = Parameters<Elysia["ws"]>[1]

export type RoutesBase = Record<string, unknown>
export type EventBase = Record<string, unknown>

export class Wsx<
	const in out BasePath extends string = "",
	const out Routes extends RoutesBase = {},
	const out Events extends EventBase = {},
> {
	plugin: Elysia

	router: Map<string, RPCRoute<ServerRpcHandler>> = new Map()
	events: Map<string, RPCOptions> = new Map()
	store = new Store()

	constructor(options?: WsxOptions) {
		this.plugin = new Elysia()

		this.plugin.ws("", {
			...options,
			open(ws) {
				if (options?.open) {
					options.open(ws)
				}
			},
			message: async (ws, message) => {
				if (options?.message) {
					options.message(ws, message)
				}

				const request: Proto.RpcRequest | Proto.RpcResponse = JSON.parse(
					message as string,
				)
				const [action] = request
				if (action === Proto.actionTypes.rpc.request) {
					const [, id, path, withResponse, body] = request
					const route = this.router.get(path)
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

					const proxy = RoutingProxy(ws as any, this.store)
					const rawResponse = route.handler({ ws, body, events: proxy })
					if (!withResponse) return
					const response = isPromise(rawResponse)
						? await rawResponse
						: rawResponse

					const rpcResponse: Proto.RpcResponse = [
						Proto.actionTypes.rpc.response,
						id,
						response,
					]
					ws.send(rpcResponse)
					return
				}

				if (action === Proto.actionTypes.rpc.response) {
					const [, id, body] = request
					const resolve = this.store.resolvers.get(id)
					if (!resolve) {
						console.error("No resolver for call", id)
						return
					}
					resolve(body)
					return
				}
			},
			close(ws, code, message) {
				if (options?.close) {
					options.close(ws, code, message)
				}
			},
		})
	}

	get handle(): Elysia["handle"] {
		return this.plugin.handle
	}

	listen(...options: Parameters<Elysia["listen"]>): this {
		this.plugin.listen(...options)
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
		Eden = CreateEden<
			`${BasePath}${Path extends "/" ? "/index" : Path}`,
			{
				$type: "route"
				$body: Body
				$response: Response
			}
		>,
	>(
		path: Path,
		handler: RPCHandler<
			{ body: Body; ws: ServerWs; events: ServerNs.Sign<Events> },
			Response
		>,
		options?: Options,
	): Wsx<BasePath, Routes & Eden, Events> {
		this.router.set(path, {
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
		Eden = CreateEden<
			`${BasePath}${Path extends "/" ? "/index" : Path}`,
			{
				$type: "event"
				$body: Body
				$response: Response
			}
		>,
	>(path: Path, options?: Options): Wsx<BasePath, Routes, Events & Eden> {
		this.events.set(path, options ?? {})
		return this as any
	}
}
