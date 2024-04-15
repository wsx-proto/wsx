import { type FindResult, matchRoute } from "./matcher"
import { type Node, cloneNode, createNode, createParamNode } from "./node"

export class Router<T> {
	root: Node<T> | undefined
	history: [path: string, store: T][] = []

	private static regex = {
		static: /:.+?(?=\/|$)/,
		params: /:.+?(?=\/|$)/g,
	}

	add(path: string, store: T): FindResult<T>["store"] {
		if (typeof path !== "string")
			throw new TypeError("Route path must be a string")

		// biome-ignore lint/style/noParameterAssign: faster
		if (path === "") path = "/"
		// biome-ignore lint/style/noParameterAssign: faster
		else if (path[0] !== "/") path = `/${path}`

		this.history.push([path, store])

		const isWildcard = path[path.length - 1] === "*"
		if (isWildcard) {
			// Slice off trailing '*'
			// biome-ignore lint/style/noParameterAssign: faster
			path = path.slice(0, -1)
		}

		const inertParts = path.split(Router.regex.static)
		const paramParts = path.match(Router.regex.params) || []

		if (inertParts[inertParts.length - 1] === "") inertParts.pop()

		let node: Node<T>

		if (!this.root) node = this.root = createNode<T>("/")
		else node = this.root

		let paramPartsIndex = 0

		for (let i = 0; i < inertParts.length; ++i) {
			let part = inertParts[i]

			if (i > 0) {
				// Set param on the node
				const param = paramParts[paramPartsIndex++].slice(1)

				if (node.params === null) node.params = createParamNode(param)
				else if (node.params.paramName !== param)
					throw new Error(
						// biome-ignore lint/style/useTemplate: more readable
						`Cannot create route "${path}" with parameter "${param}" ` +
							"because a route already exists with a different parameter name " +
							`("${node.params.paramName}") in the same location`,
					)

				const params = node.params

				if (params.inert === null) {
					node = params.inert = createNode(part)
					continue
				}

				node = params.inert
			}

			for (let j = 0; ; ) {
				if (j === part.length) {
					if (j < node.part.length) {
						// Move the current node down
						const childNode = cloneNode(node, node.part.slice(j))
						Object.assign(node, createNode(part, [childNode]))
					}
					break
				}

				if (j === node.part.length) {
					// Add static child
					if (node.inert === null) node.inert = new Map()
					else if (node.inert.has(part.charCodeAt(j))) {
						// Re-run loop with existing static node
						// biome-ignore lint/style/noNonNullAssertion: really not-null
						node = node.inert.get(part.charCodeAt(j))!
						part = part.slice(j)
						j = 0
						continue
					}

					// Create new node
					const childNode = createNode<T>(part.slice(j))
					node.inert.set(part.charCodeAt(j), childNode)
					node = childNode

					break
				}

				if (part[j] !== node.part[j]) {
					// Split the node
					const existingChild = cloneNode(node, node.part.slice(j))
					const newChild = createNode<T>(part.slice(j))

					Object.assign(
						node,
						createNode(node.part.slice(0, j), [existingChild, newChild]),
					)

					node = newChild

					break
				}

				++j
			}
		}

		if (paramPartsIndex < paramParts.length) {
			// The final part is a parameter
			const param = paramParts[paramPartsIndex]
			const paramName = param.slice(1)

			if (node.params === null) node.params = createParamNode(paramName)
			else if (node.params.paramName !== paramName)
				throw new Error(
					// biome-ignore lint/style/useTemplate: more readable
					`Cannot create route "${path}" with parameter "${paramName}" ` +
						"because a route already exists with a different parameter name " +
						`("${node.params.paramName}") in the same location`,
				)

			if (node.params.store === null) node.params.store = store

			// biome-ignore lint/style/noNonNullAssertion: really not-null
			return node.params.store!
		}

		if (isWildcard) {
			// The final part is a wildcard
			if (node.wildcardStore === null) node.wildcardStore = store

			// biome-ignore lint/style/noNonNullAssertion: really not-null
			return node.wildcardStore!
		}

		// The final part is static
		if (node.store === null) node.store = store

		// biome-ignore lint/style/noNonNullAssertion: really not-null
		return node.store!
	}

	find(url: string): FindResult<T> | null {
		const root = this.root
		if (!root) return null

		return matchRoute(url, url.length, root, 0)
	}
}

export default Router
