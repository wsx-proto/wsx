import { beforeAll, expect, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { type Static, Type } from "@sinclair/typebox"
import { Client } from "@wsx/client"
import { Wsx } from "@wsx/server"

type ValidBody = Static<typeof ValidBody>
const ValidBody = Type.Object({ message: Type.String() })

async function initialize() {
	const wsx = new Wsx()
		.route("/validate", ({ body }) => body, {
			body: ValidBody,
			response: Type.Object({ message: Type.String() }),
		})
		.listen(0)

	const { port } = wsx.server!

	return await Client<typeof wsx>(`ws://localhost:${port}`)
}

let routes: Awaited<ReturnType<typeof initialize>>["routes"]
beforeAll(async () => {
	const client = await initialize()
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
