import type { RpcResponse } from "@wsx/shared"
import type { Prettify } from "elysia/types"

export namespace ServerNs {
	export type Sign<in out Route extends Record<string, any>> = Omit<
		{
			[K in keyof Route]: Route[K] extends {
				$type: "event"
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
				: Prettify<Sign<Route[K]>>
		},
		"$body" | "$response" | "$type"
	>
}

import type { ServerWebSocket } from "bun"
import type { ElysiaWS } from "elysia/ws"

export type ServerWs<
	Data extends Record<string, unknown> = Record<string, never>,
> = Pick<
	ElysiaWS<ServerWebSocket<Data>>,
	"id" | "data" | "close" | "terminate" | "cork" | "remoteAddress"
>

export type ServerWsInternal<
	Data extends Record<string, unknown> = Record<string, never>,
> = Pick<
	ElysiaWS<ServerWebSocket<Data>>,
	"id" | "data" | "close" | "terminate" | "cork" | "remoteAddress" | "send"
>
