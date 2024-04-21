import { Elysia, type CreateEden } from "elysia"
import { Router } from "@wsx/router"
import { type Schema, type Infer, validate } from "@typeschema/main"

export type WsxOptions = Parameters<Elysia["ws"]>[1]

type ActionType = typeof actionTypes
const actionTypes = {
	rpc: {
		request: 1,
		response: 2,
	},
} as const

export type WsxRequest = [
	action: ActionType["rpc"]["request"],
	id: number,
	path: string,
	body: unknown,
]

export type WsxResponse = [
	action: ActionType["rpc"]["response"],
	id: number,
	body: unknown,
]

export type RoutesBase = Record<string, unknown>

type RPCHandler<Body = unknown, Response = unknown> = (
	body: Body,
) => Response | Promise<Response>
type RPCRoute = {
	handler: RPCHandler
} & RPCOptions
type GenericRoute = RPCRoute

type RPCOptions = {
	body?: Schema
	response?: Schema
}

export class Wsx<
	const in out BasePath extends string = "",
	// biome-ignore lint/complexity/noBannedTypes: better type hints
	const out Routes extends RoutesBase = {},
> {
	plugin: Elysia
	router: Router<GenericRoute>

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

				const request: WsxRequest = JSON.parse(message as string)
				const [action] = request
				if (action === actionTypes.rpc.request) {
					const [, id, path, body] = request
					const route = this.router.find(path)
					if (!route) {
						//todo
						return
					}

					const { body: bodySchema } = route.store
					if (bodySchema) {
						const validationResult = await validate(bodySchema, body)
						if (!validationResult.success) {
							console.error("validation failed", validationResult)
							return
						}
					}

					const rawResponse = route.store.handler(body)
					const response = isPromise(rawResponse)
						? await rawResponse
						: rawResponse

					ws.send([actionTypes.rpc.response, id, response])
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

	get listen() {
		return this.plugin.listen.bind(this.plugin)
	}

	rpc<
		const Path extends string,
		Options extends RPCOptions,
		Payload = Options["body"] extends Schema ? Infer<Options["body"]> : unknown,
	>(
		path: Path,
		handler: (message: Payload) => void,
		options?: Options,
	): Wsx<
		BasePath,
		Routes &
			CreateEden<
				`${BasePath}${Path extends "/" ? "/index" : Path}`,
				{
					message: {
						payload: Payload
					}
				}
			>
	> {
		this.router.add(path, {
			handler: handler as RPCHandler,
			body: options?.body,
			response: options?.response,
		})
		// biome-ignore lint/suspicious/noExplicitAny: ts is limited
		return this as any
	}
}

function isObject(x: unknown): x is object {
	return x !== null && typeof x === "object"
}

function isPromise(x: unknown): x is Promise<unknown> {
	return isObject(x) && x instanceof Promise
}
