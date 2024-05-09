/// <reference lib="dom" />
import type { Wsx } from "@wsx/server"
import type { Prettify, RPCHandler, RpcResponse } from "@wsx/shared"

export namespace ClientNs {
	export type Create<App extends Wsx<any, any>> = App extends {
		$routes: infer Schema extends Record<string, any>
	}
		? Prettify<Sign<Schema>>
		: "Please install @wsx/server before using @wsx/client"

	export type Sign<in out Route extends Record<string, any>> = Omit<
		{
			[K in keyof Route]: Route[K] extends {
				$type: "route"
				$body: infer Body
				$response: infer Response
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
					} & Prettify<Sign<Route[K]>>
				: Route[K] extends {
							$type: "event"
							$body: infer Body
							$response: infer Response
						}
					? {
							/**
							 * handle server-send events
							 */
							listen(handler: RPCHandler<Body, Response>): {
								close(): void
							}
						} & Prettify<Sign<Route[K]>>
					: Prettify<Sign<Route[K]>>
		},
		"$body" | "$response" | "$type"
	>

	export interface Config {
		keepDomain?: boolean
	}
}
