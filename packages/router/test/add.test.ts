import { Router } from "../src"

import { describe, expect, it } from "bun:test"

const router = new Router()
router.add("/v1/genres", "/g")
router.add("/v1/genres/:id", "/g/:id")
router.add("/v1/statuse", "/s")
router.add("/v1/statuse/:id", "/s/:id")

describe("Add", () => {
	it("Clean up path mangling", () => {
		expect(router.find("/v1/statuse/1")).toEqual({
			store: "/s/:id",
			params: {
				id: "1",
			},
		})
	})
})
