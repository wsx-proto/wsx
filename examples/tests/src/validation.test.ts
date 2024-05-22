import { beforeAll, expect, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { type Static, Type } from "@sinclair/typebox"
import { Client, type ClientType } from "@wsx/client"
import { Wsx } from "@wsx/server"

type ValidBody = Static<typeof ValidBody>
const ValidBody = Type.Object({ message: Type.String() })

type Server = ReturnType<typeof Server>
const Server = () =>
	new Wsx()
		.route("/validate", ({ body }) => body, {
			body: ValidBody,
			response: Type.Object({ message: Type.String() }),
		})
		.listen(0)

let routes: ClientType<Server>
beforeAll(async () => {
	const wsx = Server()
	const { port } = wsx.server!
	const client = await Client<typeof wsx>(`ws://localhost:${port}`)
	routes = client.routes
})

test("valid", async () => {
	const message = faker.lorem.sentence()
	const response = await routes.validate.call({
		message,
	})
	expect(response.status).toBe("success")
	expect((response.body as ValidBody).message).toBe(message)
})

test("invalid", async () => {
	const response = await routes.validate.call({
		message: 5 as any,
	})
	expect(response.status).toBe("fail")
	expect((response as { message: string }).message).toBe("Validation failed")
})
