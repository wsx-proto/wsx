/// <reference lib="dom" />
import type { Wsx } from "@wsx/server"
import type { Prettify } from "@wsx/shared"

export namespace ClientNs {
	export type Create<App extends Wsx<any, any>> = App extends {
		_routes: infer Schema extends Record<string, any>
	}
		? Prettify<Sign<Schema>>
		: "Please install @wsx/server before using @wsx/client"

	export type Sign<in out Route extends Record<string, any>> = {
		[K in keyof Route]: Route[K] extends {
			body: infer Body
			response: infer Response
		}
			? {
					/**
					 * send event with response
					 */
					call(
						// biome-ignore lint/suspicious/noConfusingVoidType: void hack
						body: unknown extends Body ? void : Body,
					): Promise<RpcResponse<Response>>
					/**
					 * send event without response
					 */
					emit(
						// biome-ignore lint/suspicious/noConfusingVoidType: void hack
						body: unknown extends Body ? void : Body,
					): void
				} & Omit<Prettify<Sign<Route[K]>>, "body" | "response">
			: Prettify<Sign<Route[K]>>
	}

	export interface Config {
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
