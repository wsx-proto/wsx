import { Elysia, type CreateEden } from "elysia"
import { Router } from "@wsx/router"
import {
	type GenericRequest,
	actionTypes,
	type MaybePromise,
	type RpcResponse,
} from "@wsx/shared"
import { type Schema, type Infer, validate } from "@typeschema/main"

export type WsxOptions = Parameters<Elysia["ws"]>[1]

export type RoutesBase = Record<string, unknown>

type RPCHandler<
	Body = unknown,
	Response = unknown,
	Params = unknown,
> = (request: {
	body: Body
	params: Params
}) => MaybePromise<Response>
type RPCRoute = {
	handler: RPCHandler
} & RPCOptions
type GenericRoute = RPCRoute

type RPCOptions = {
	body?: Schema
	response?: Schema
	params?: Schema
}

export class Wsx<
	const in out BasePath extends string = "",
	const out Routes extends RoutesBase = {},
> {
	plugin: Elysia
	router: Router<GenericRoute>
	_routes: Routes = {} as Routes

	constructor(options?: WsxOptions) {
		this.plugin = new Elysia()
		this.router = new Router()

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

				const request: GenericRequest = JSON.parse(message as string)
				const [action] = request
				if (action === actionTypes.rpc.request) {
					const [, id, path, body] = request
					const route = this.router.find(path)
					if (!route) {
						//todo
						return
					}
					const { params, store } = route

					const { body: bodySchema } = store
					if (bodySchema) {
						const validationResult = await validate(bodySchema, body)
						if (!validationResult.success) {
							console.error("validation failed", validationResult)
							return
						}
					}

					const rawResponse = store.handler({ body, params })
					const response = isPromise(rawResponse)
						? await rawResponse
						: rawResponse

					const rpcResponse: RpcResponse = [
						actionTypes.rpc.response,
						id,
						response,
					]
					ws.send(rpcResponse)
				}
			},
			close(ws, code, message) {
				if (options?.close) {
					options.close(ws, code, message)
				}
			},
		})
	}

	get handle() {
		return this.plugin.handle
	}

	listen(...options: Parameters<Elysia["listen"]>) {
		this.plugin.listen(...options)
		return this
	}

	rpc<
		const Path extends string,
		Options extends RPCOptions,
		Body = Options["body"] extends Schema ? Infer<Options["body"]> : unknown,
		Response = Options["response"] extends Schema
			? Infer<Options["response"]>
			: unknown,
		Params = Options["params"] extends Schema
			? Infer<Options["params"]>
			: unknown,
	>(
		path: Path,
		handler: RPCHandler<Body, Response, Params>,
		options?: Options,
	): Wsx<
		BasePath,
		Routes &
			CreateEden<
				`${BasePath}${Path extends "/" ? "/index" : Path}`,
				{
					rpc: {
						body: Body
						response: Response
						params: Params
					}
				}
			>
	> {
		this.router.add(path, {
			handler: handler as RPCHandler,
			body: options?.body,
			response: options?.response,
		})
		return this as any
	}
}

function isObject(x: unknown): x is object {
	return x !== null && typeof x === "object"
}

function isPromise(x: unknown): x is Promise<unknown> {
	return isObject(x) && x instanceof Promise
}
