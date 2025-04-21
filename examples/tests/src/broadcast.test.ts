import { beforeAll, expect, mock, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { Type } from "@sinclair/typebox"
import { Compile } from "@sinclair/typemap"
import { Client } from "@wsx/client"
import { Localcast, type Topic, Wsx } from "@wsx/server"

let clientA: TestClient
let clientB: TestClient
let clientC: TestClient
let topic: Topic

type Server = ReturnType<typeof Server>
const Server = () =>
	new Wsx()
		.event("/rec", { body: Compile(Type.String()) })
		.route("/sub", ({ ws }) => {
			topic.subscribe(ws)
		})
		.route(
			"/pub",
			({ body: message, events }) => {
				events.rec.emit(message, { topic })
			},
			{ body: Compile(Type.String()) },
		)
		.listen(0)

type TestClient = Awaited<ReturnType<typeof TestClient>>
const TestClient = (url: string) => Client<Server>(url)

beforeAll(async () => {
	const wsx = Server()
	const { port } = wsx.server!
	const url = `ws://localhost:${port}`

	clientA = await TestClient(url)
	clientB = await TestClient(url)
	clientC = await TestClient(url)

	const localcast = new Localcast()
	topic = localcast.topic("test")
})

test("valid", async () => {
	const recMockA = mock((message: string) => message)
	const recMockB = mock((message: string) => message)
	const recMockC = mock((message: string) => message)

	await clientA.routes.sub.call()
	clientA.routes.rec.listen(({ body }) => recMockA(body))

	await clientB.routes.sub.call()
	clientB.routes.rec.listen(({ body }) => recMockB(body))

	await clientC.routes.sub.call()
	clientC.routes.rec.listen(({ body }) => recMockC(body))

	const message = faker.lorem.sentence()
	await clientB.routes.pub.call(message)

	expect(recMockA).toBeCalledWith(message)
	expect(recMockB).toBeCalledTimes(0)
	expect(recMockC).toBeCalledWith(message)
})
