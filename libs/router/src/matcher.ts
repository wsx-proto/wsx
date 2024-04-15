import type { Node } from "./node"

export interface FindResult<T> {
	store: T
	// biome-ignore lint/suspicious/noExplicitAny: permissive type
	params: Record<string, any>
}

export const matchRoute = <T>(
	url: string,
	urlLength: number,
	node: Node<T>,
	startIndex: number,
): FindResult<T> | null => {
	const part = node?.part
	const endIndex = startIndex + part.length

	// Only check the pathPart if its length is > 1 since the parent has
	// already checked that the url matches the first character
	if (part.length > 1) {
		if (endIndex > urlLength) return null

		if (part.length < 15) {
			// Using a loop is faster for short strings
			for (let i = 1, j = startIndex + 1; i < part.length; ++i, ++j)
				if (part.charCodeAt(i) !== url.charCodeAt(j)) return null
		} else if (url.substring(startIndex, endIndex) !== part) return null
	}

	if (endIndex === urlLength) {
		// Reached the end of the URL
		if (node.store !== null)
			return {
				store: node.store,
				params: {},
			}

		if (node.wildcardStore !== null)
			return {
				store: node.wildcardStore,
				params: { "*": "" },
			}

		return null
	}

	if (node.inert !== null) {
		const inert = node.inert.get(url.charCodeAt(endIndex))

		if (inert !== undefined) {
			const route = matchRoute(url, urlLength, inert, endIndex)

			if (route !== null) return route
		}
	}

	if (node.params !== null) {
		const param = node.params
		const slashIndex = url.indexOf("/", endIndex)

		if (slashIndex !== endIndex) {
			// Params cannot be empty
			if (slashIndex === -1 || slashIndex >= urlLength) {
				if (param.store !== null) {
					// This is much faster than using a computed property
					const params: Record<string, string> = {}

					params[param.paramName] = url.substring(endIndex, urlLength)

					return {
						store: param.store,
						params,
					}
				}
			} else if (param.inert !== null) {
				const route = matchRoute(url, urlLength, param.inert, slashIndex)

				if (route !== null) {
					route.params[param.paramName] = url.substring(endIndex, slashIndex)

					return route
				}
			}
		}
	}

	if (node.wildcardStore !== null)
		return {
			store: node.wildcardStore,
			params: {
				"*": url.substring(endIndex, urlLength),
			},
		}

	return null
}
