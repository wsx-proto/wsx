import { beforeAll, expect, mock, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { Type } from "@sinclair/typebox"
import { Client } from "@wsx/client"
import { Wsx } from "@wsx/server"

const onEmit = mock((message: string) => void message)

async function initialize() {
	const wsx = new Wsx()
		.route("/some", ({ body }) => onEmit(body), { body: Type.String() })
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
	routes.some.emit(message)
	await Bun.sleep(10)
	expect(onEmit).toBeCalledWith(message)
})
