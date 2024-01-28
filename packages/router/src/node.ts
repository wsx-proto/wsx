export interface ParamNode<T> {
	paramName: string
	store: T | null
	inert: Node<T> | null
}

export interface Node<T> {
	part: string
	store: T | null
	inert: Map<number, Node<T>> | null
	params: ParamNode<T> | null
	wildcardStore: T | null
}

export const createNode = <T>(part: string, inert?: Node<T>[]): Node<T> => ({
	part,
	store: null,
	inert:
		inert !== undefined
			? new Map(inert.map((child) => [child.part.charCodeAt(0), child]))
			: null,
	params: null,
	wildcardStore: null,
})

export const cloneNode = <T>(node: Node<T>, part: string) => ({
	...node,
	part,
})

export const createParamNode = <T>(paramName: string): ParamNode<T> => ({
	paramName,
	store: null,
	inert: null,
})
