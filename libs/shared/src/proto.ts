export type ActionType = typeof actionTypes
export const actionTypes = {
	emit: 1,
	rpc: {
		request: 2,
		response: {
			success: 3,
			fail: 4,
			error: 5,
		},
	},
} as const

type OneOf<T extends Record<PropertyKey, unknown>> = T[keyof T]

export function isRpcResponse(
	action: [actionType: number, ...rest: any],
): action is OneOf<RpcResponse> {
	const [actionType] = action
	return (
		actionType === actionTypes.rpc.response.success ||
		actionType === actionTypes.rpc.response.fail ||
		actionType === actionTypes.rpc.response.error
	)
}

export type GenericAction =
	| Emit
	| RpcRequest
	| RpcResponse["success"]
	| RpcResponse["fail"]
	| RpcResponse["error"]

export type Emit = [action: ActionType["emit"], path: string, body: unknown]

export type RpcRequest = [
	action: ActionType["rpc"]["request"],
	id: number,
	path: string,
	body: unknown,
]

export type RpcResponse = {
	success: [
		action: ActionType["rpc"]["response"]["success"],
		id: number,
		body: unknown,
	]
	fail: [
		action: ActionType["rpc"]["response"]["fail"],
		id: number,
		message: string,
		body: unknown,
	]
	error: [
		action: ActionType["rpc"]["response"]["error"],
		id: number,
		message: string,
		body: unknown,
		code?: number,
	]
}
