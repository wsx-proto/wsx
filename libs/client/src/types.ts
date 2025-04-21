import type { Wsx } from "@wsx/server"
import type { Prettify, RPCHandler, RpcResponse } from "@wsx/shared"

/**
 * Construct client type for Wsx server
 */
export type ClientType<App extends Wsx<any, any>> = App extends Wsx<
	any,
	infer Routes,
	infer Events
>
	? Prettify<Sign<Routes & Events>>
	: "Please install @wsx/server before using @wsx/client"

export type Sign<in out Route extends Record<string, any>> = Omit<
	{
		[K in keyof Route]: Prettify<Sign<Route[K]>> &
			(Route[K] extends {
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
					}
				: Record<string, never>) &
			(Route[K] extends {
				$type: "event"
				$body: infer Body
				$response: infer Response
			}
				? {
						/**
						 * handle server-sent events
						 */
						listen(
							handler: RPCHandler<{ body: Body; ws: ClientWs }, Response>,
						): void
						/**
						 * stop handling server-sent events
						 */
						unlisten(): void
					}
				: Record<string, never>)
	},
	"$body" | "$response" | "$type"
>

/**
 * Wsx client configuration
 */
export interface ClientConfig {
	keepDomain?: boolean
}

/**
 * Wsx client WebSocket
 */
export type ClientWs = Pick<WebSocket, "url" | "close">
