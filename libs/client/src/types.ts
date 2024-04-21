/// <reference lib="dom" />
import type { Wsx } from "@wsx/server"
import type { Prettify } from "@wsx/shared"
import type { MaybeArray } from "@wsx/shared"

export namespace ClientNs {
	export type Create<App extends Wsx<any, any>> = App extends {
		_routes: infer Schema extends Record<string, any>
	}
		? Prettify<Sign<Schema>>
		: "Please install @wsx/server before using @wsx/client"

	export type Sign<in out Route extends Record<string, any>> = {
		[K in keyof Route as K extends `:${string}`
			? string
			: K]: Route[K] extends {
			body: infer Body
			response: infer Response
		}
			? (
					// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
					body: unknown extends Body ? void : Body,
				) => Promise<RpcResponse<Response>>
			: CreateParams<Route[K]>
	}

	type CreateParams<Route extends Record<string, any>> = Extract<
		keyof Route,
		`:${string}`
	> extends string
		? Prettify<Sign<Route>>
		: never

	export interface Config {
		headers?: MaybeArray<
			| RequestInit["headers"]
			// biome-ignore lint/suspicious/noConfusingVoidType: da void
			| ((path: string, options: RequestInit) => RequestInit["headers"] | void)
		>
		keepDomain?: boolean
	}

	type RpcResponse<Response = unknown> =
		| {
				data: Response
				error?: undefined
		  }
		| {
				data?: undefined
				error: unknown
		  }
}
