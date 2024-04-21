export * from "./utility-types"

export type ActionType = typeof actionTypes
export const actionTypes = {
	rpc: {
		request: 1,
		response: 2,
	},
} as const

/**
 * From client to server
 */
export type GenericRequest = RpcRequest

export type RpcRequest = [
	action: ActionType["rpc"]["request"],
	id: number,
	path: string,
	body: unknown,
]

/**
 * From server to client
 */
export type GenericResponse = RpcResponse

export type RpcResponse = [
	action: ActionType["rpc"]["response"],
	id: number,
	body: unknown,
]
