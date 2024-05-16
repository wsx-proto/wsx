import { expect, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { Type } from "@sinclair/typebox"
import { Client } from "@wsx/client"
import { Wsx } from "@wsx/server"

const wsx = new Wsx()
	.route("/valid", ({ body }) => body, {
		body: Type.Object({ message: Type.String() }),
		response: Type.Object({ message: Type.String() }),
	})
	.listen(0)

const { port } = wsx.server!

const { routes } = await Client<typeof wsx>(`ws://localhost:${port}`)

test("valid", async () => {
	const message = faker.lorem.sentence()
	const response = await routes.valid.call({
		message,
	})
	console.log(response)
	expect(response.data).toBeObject()
	expect(response.data!.message).toBe(message)
})
