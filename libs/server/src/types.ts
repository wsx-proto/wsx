import type { Prettify, RpcResponse } from "@wsx/shared"
import type { Topic } from "./broadcast"

export type ConsumeTyping<in out Route extends Record<string, any>> = Omit<
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
						/**
						 * optional selector to target specific client, if not provided call will be sent to current client
						 */
						options?: { id?: string },
					): Promise<RpcResponse<Response>>
					/**
					 * send event without response
					 */
					emit(
						// biome-ignore lint/suspicious/noConfusingVoidType: void hack
						body: unknown extends Body ? void : Body,
						/**
						 * optional selector to target specific clients, if not provided emit will be sent to current client
						 */
						options?: SendOptions,
					): void
				} & Prettify<ConsumeTyping<Route[K]>>
			: Prettify<ConsumeTyping<Route[K]>>
	},
	"$body" | "$response" | "$type"
>

export type CallOptions = { id?: string }

export type EmitOptions = { id?: string } | { topic?: Topic }

export type SendOptions = CallOptions | EmitOptions

export type PrepareTyping<
	Path extends string,
	Property extends Record<string, unknown> = {},
> = Path extends `/${infer Rest}`
	? _PrepareTyping<Rest, Property>
	: Path extends ""
		? _PrepareTyping<"index", Property>
		: _PrepareTyping<Path, Property>

type _PrepareTyping<
	Path extends string,
	Property extends Record<string, unknown> = {},
> = Path extends `${infer Start}/${infer Rest}`
	? {
			[x in Start]: _PrepareTyping<Rest, Property>
		}
	: {
			[x in Path]: Property
		}

export type AppendTypingPrefix<
	Prefix extends string,
	Typing extends Record<string, unknown> = {},
> = Prefix extends ""
	? Typing
	: {
			[Key in Prefix extends `/${infer Path}` ? Path : Prefix]: Typing
		}
