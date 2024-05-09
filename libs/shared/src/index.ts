import type { MaybePromise } from "./utility-types"

export * from "./utility-types"
export * as Proto from "./proto"
import type { Schema as AnySchema } from "@typeschema/main"

export type RPCHandler<
	Request extends { body: any; ws: any } = { body: unknown; ws: unknown },
	Response = unknown,
> = (request: Request) => MaybePromise<Response>

export type RPCRoute = {
	handler: RPCHandler
} & RPCOptions

export type RPCOptions = {
	body?: AnySchema
	response?: AnySchema
}

export type RpcResponse<Response = unknown> =
	| {
			data: Response
			error?: undefined
	  }
	| {
			data?: undefined
			error: unknown
	  }
