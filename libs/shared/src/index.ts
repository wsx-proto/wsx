import type { MaybePromise } from "./utility-types"

export * from "./utility-types"
export * as Proto from "./proto"
import type { Schema as AnySchema } from "@typeschema/main"

export type RPCHandler<
	Request extends { body: any; ws: any } = { body: unknown; ws: unknown },
	Response = unknown,
> = (request: Request) => MaybePromise<Response>

export type ServerRpcHandler = RPCHandler<
	{ body: unknown; ws: unknown; events: unknown },
	unknown
>

export type RPCOptions = {
	body?: AnySchema
	response?: AnySchema
}

export type RpcResponse<Response = unknown> =
	| {
			status: "success"
			body: Response
	  }
	| {
			status: "fail"
			message: string
			body: unknown
	  }
	| {
			status: "error"
			message: string
			code?: number
			body?: unknown
	  }

export function isObject(x: unknown): x is object {
	return x !== null && typeof x === "object"
}

export function isPromise(x: unknown): x is Promise<unknown> {
	return isObject(x) && x instanceof Promise
}

export const subprotocol = "wsx-wip"
