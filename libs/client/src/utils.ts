import type { ClientNs } from "./types"

export const isNumericString = (message: string) =>
	message.trim().length !== 0 && !Number.isNaN(Number(message))

export const processHeaders = (
	h: ClientNs.Config["headers"],
	path: string,
	options: RequestInit = {},
	headers: Record<string, string> = {},
): Record<string, string> => {
	if (Array.isArray(h)) {
		for (const value of h)
			if (!Array.isArray(value))
				headers = processHeaders(value, path, options, headers)
			else {
				const key = value[0]
				if (typeof key === "string")
					headers[key.toLowerCase()] = value[1] as string
				else
					for (const [k, value] of key)
						headers[k.toLowerCase()] = value as string
			}

		return headers
	}

	if (!h) return headers

	switch (typeof h) {
		case "function": {
			const v = h(path, options)
			if (v) return processHeaders(v, path, options, headers)
			return headers
		}

		case "object":
			if (h instanceof Headers) {
				h.forEach((value, key) => {
					headers[key.toLowerCase()] = value
				})
				return headers
			}

			for (const [key, value] of Object.entries(h))
				headers[key.toLowerCase()] = value as string
			return headers

		default:
			return headers
	}
}
