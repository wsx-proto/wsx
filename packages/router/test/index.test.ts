import { Router } from "../src"

import { describe, expect, it } from "bun:test"

const router = new Router()
router.add("/abc", "/abc")
router.add("/id/:id/book", "book")
router.add("/id/:id/bowl", "bowl")

router.add("/", "/")
router.add("/id/:id", "/id/:id")
router.add("/id/:id/abc/def", "/id/:id/abc/def")
router.add("/id/:id/abd/efd", "/id/:id/abd/efd")
router.add("/id/:id/name/:name", "/id/:id/name/:name")
router.add("/id/:id/name/a", "/id/:id/name/a")
router.add("/dynamic/:name/then/static", "/dynamic/:name/then/static")
router.add("/deep/nested/route", "/deep/nested/route")
router.add("/rest/*", "/rest/*")

describe("Raikiri", () => {
	it("match root", () => {
		expect(router.find("/")).toEqual({
			store: "/",
			params: {},
		})
	})

	it("get path parameter", () => {
		expect(router.find("/id/1")).toEqual({
			store: "/id/:id",
			params: {
				id: "1",
			},
		})
	})

	it("get multiple path parameters", () => {
		expect(router.find("/id/1/name/name")).toEqual({
			store: "/id/:id/name/:name",
			params: {
				id: "1",
				name: "name",
			},
		})
	})

	it("get deep static route", () => {
		expect(router.find("/deep/nested/route")).toEqual({
			store: "/deep/nested/route",
			params: {},
		})
	})

	it("match wildcard", () => {
		expect(router.find("/rest/a/b/c")).toEqual({
			store: "/rest/*",
			params: {
				"*": "a/b/c",
			},
		})
	})

	it("handle mixed dynamic and static", () => {
		expect(router.find("/dynamic/param/then/static")).toEqual({
			store: "/dynamic/:name/then/static",
			params: {
				name: "param",
			},
		})
	})

	it("handle static path in dynamic", () => {
		expect(router.find("/id/1/name/a")).toEqual({
			store: "/id/:id/name/a",
			params: {
				id: "1",
			},
		})
	})

	it("handle dynamic as fallback", () => {
		expect(router.find("/id/1/name/ame")).toEqual({
			store: "/id/:id/name/:name",
			params: {
				id: "1",
				name: "ame",
			},
		})
	})

	it("wildcard on root path", () => {
		const router = new Router()

		router.add("/a/b", "ok")
		router.add("/*", "all")

		expect(router.find("/a/b/c/d")).toEqual({
			store: "all",
			params: {
				"*": "a/b/c/d",
			},
		})

		expect(router.find("/")).toEqual({
			store: "all",
			params: {
				"*": "",
			},
		})
	})

	it("can overwrite wildcard", () => {
		const router = new Router()

		router.add("/", "ok")
		router.add("/*", "all")

		expect(router.find("/a/b/c/d")).toEqual({
			store: "all",
			params: {
				"*": "a/b/c/d",
			},
		})

		expect(router.find("/")).toEqual({
			store: "ok",
			params: {},
		})
	})

	it("handle trailing slash", () => {
		const router = new Router()

		router.add("/abc/def", "A")
		router.add("/abc/def/", "A")

		expect(router.find("/abc/def")).toEqual({
			store: "A",
			params: {},
		})

		expect(router.find("/abc/def/")).toEqual({
			store: "A",
			params: {},
		})
	})

	it("handle static prefix wildcard", () => {
		const router = new Router()
		router.add("/a/b", "ok")
		router.add("/*", "all")

		expect(router.find("/a/b/c/d")).toEqual({
			store: "all",
			params: {
				"*": "a/b/c/d",
			},
		})

		expect(router.find("/")).toEqual({
			store: "all",
			params: {
				"*": "",
			},
		})
	})

	// ? https://github.com/SaltyAom/raikiri/issues/2
	// Migrate from mei to ei should work
	it("dynamic root", () => {
		const router = new Router()
		router.add("/", "root")
		router.add("/:param", "it worked")

		expect(router.find("/")).toEqual({
			store: "root",
			params: {},
		})

		expect(router.find("/bruh")).toEqual({
			store: "it worked",
			params: {
				param: "bruh",
			},
		})
	})

	it("handle wildcard without static fallback", () => {
		const router = new Router()
		router.add("/public/*", "foo")
		router.add("/public-aliased/*", "foo")

		expect(router.find("/public/takodachi.png")?.params["*"]).toBe(
			"takodachi.png",
		)
		expect(router.find("/public/takodachi/ina.png")?.params["*"]).toBe(
			"takodachi/ina.png",
		)
	})

	it("restore mangled path", () => {
		const router = new Router()

		router.add("/users/:userId", "/users/:userId")
		router.add("/game", "/game")
		router.add("/game/:gameId/state", "/game/:gameId/state")
		router.add("/game/:gameId", "/game/:gameId")

		expect(router.find("/game/1/state")?.store).toBe("/game/:gameId/state")
		expect(router.find("/game/1")?.store).toBe("/game/:gameId")
	})

	it("should be a ble to register param after same prefix", () => {
		const router = new Router()

		router.add("/api/abc/view/:id", "/api/abc/view/:id")
		router.add("/api/abc/:type", "/api/abc/:type")

		expect(router.find("/api/abc/type")).toEqual({
			store: "/api/abc/:type",
			params: {
				type: "type",
			},
		})

		expect(router.find("/api/abc/view/1")).toEqual({
			store: "/api/abc/view/:id",
			params: {
				id: "1",
			},
		})
	})

	it("use exact match for part", () => {
		const router = new Router()

		router.add("/api/search/:term", "/api/search/:term")
		router.add("/api/abc/view/:id", "/api/abc/view/:id")
		router.add("/api/abc/:type", "/api/abc/:type")

		expect(router.find("/api/abc/type")?.store).toBe("/api/abc/:type")
		expect(router.find("/api/awd/type")).toBe(null)
	})

	it("not error on not found", () => {
		const router = new Router()

		router.add("/api/abc/:type", "/api/abc/:type")

		expect(router.find("/api")).toBe(null)
		expect(router.find("/api/awd/type")).toBe(null)
	})
})
