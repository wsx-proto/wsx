import { beforeAll, expect, test } from "bun:test"
import { Client, type ClientType } from "@wsx/client"
import { Wsx } from "@wsx/server"

const errorMessage = "Unauthorized"

type Server = ReturnType<typeof Server>
const Server = () =>
	new Wsx()
		.route("/auth", ({ ws }) => {
			ws.data.authorized = true
		})
		.onHandle(({ ws }) => {
			if (!ws.data.authorized) {
				throw new Error("Unauthorized")
			}
		})
		.route("/protected", () => "ok")
		.listen(0)

let routes: ClientType<Server>
beforeAll(async () => {
	const wsx = Server()
	const { port } = wsx.server!
	const client = await Client<typeof wsx>(`ws://localhost:${port}`)
	routes = client.routes
})

test("valid", async () => {
	const response = await routes.protected.call()
	expect(response.status).toBe("fail")
	if (response.status !== "fail") {
		throw new Error("unreachable")
	}
	expect(response.message).toBe(errorMessage)

	await routes.auth.call()

	const response2 = await routes.protected.call()
	expect(response2.status).toBe("success")
	if (response2.status !== "success") {
		throw new Error("unreachable")
	}
	expect(response2.body).toBe("ok")
})
