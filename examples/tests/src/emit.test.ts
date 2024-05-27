import { beforeAll, expect, mock, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { Type } from "@sinclair/typebox"
import { Client, type ClientType } from "@wsx/client"
import { Wsx } from "@wsx/server"

const onEmit = mock((message: string) => void message)

type Server = ReturnType<typeof Server>
const Server = () =>
	new Wsx()
		.route("/some", ({ body }) => onEmit(body), { body: Type.String() })
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
	routes.some.emit(message)
	await Bun.sleep(100)
	expect(onEmit).toBeCalledWith(message)
})
