import { beforeAll, expect, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { Client, type ClientType } from "@wsx/client"
import { Wsx } from "@wsx/server"
import { z } from "zod"

type ValidBody = z.infer<typeof ValidBody>
const ValidBody = z.object({ message: z.string() })

type Server = ReturnType<typeof Server>
const Server = () =>
	new Wsx()
		.route("/validate", ({ body }) => body, {
			body: ValidBody,
			response: z.object({ message: z.string() }),
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
		// @ts-expect-error
		message: 5,
	})
	expect(response.status).toBe("fail")
	expect((response as { message: string }).message).toBe("Validation failed")
})
