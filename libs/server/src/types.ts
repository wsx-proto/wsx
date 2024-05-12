import type { Prettify, RpcResponse } from "@wsx/shared"

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
					): Promise<RpcResponse<Response>>
					/**
					 * send event without response
					 */
					emit(
						// biome-ignore lint/suspicious/noConfusingVoidType: void hack
						body: unknown extends Body ? void : Body,
					): void
				} & Prettify<ConsumeTyping<Route[K]>>
			: Prettify<ConsumeTyping<Route[K]>>
	},
	"$body" | "$response" | "$type"
>

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
