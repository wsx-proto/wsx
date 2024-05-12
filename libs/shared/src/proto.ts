export type ActionType = typeof actionTypes
export const actionTypes = {
	rpc: {
		request: 1,
		response: 2,
	},
} as const

export type RpcRequest = [
	action: ActionType["rpc"]["request"],
	id: number,
	path: string,
	withResponse: boolean,
	body: unknown,
]

export type RpcResponse = [
	action: ActionType["rpc"]["response"],
	id: number,
	body: unknown,
]
