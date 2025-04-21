import { beforeAll, describe, expect, mock, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { Type } from "@sinclair/typebox"
import { Compile } from "@sinclair/typemap"
import { Client } from "@wsx/client"
import { Rediscast, type Topic, Wsx } from "@wsx/server"

describe.skipIf(!Bun.env.REDIS_HOST)("Rediscast", () => {
	const redisOptions: ConstructorParameters<typeof Rediscast>[0] = {
		host: Bun.env.REDIS_HOST,
		port: Bun.env.REDIS_PORT ? Number.parseInt(Bun.env.REDIS_PORT) : undefined,
		password: Bun.env.REDIS_PASSWORD,
	}

	let clientA1: TestClient
	let clientA2: TestClient
	let clientB: TestClient

	type Server = ReturnType<typeof Server>
	const Server = (topic: Topic) =>
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
		const broadcastA = new Rediscast(redisOptions)
		const broadcastB = new Rediscast(redisOptions)

		const topicKey = "test"
		const wsxA = Server(await broadcastA.topic(topicKey))
		const wsxB = Server(await broadcastB.topic(topicKey))
		const urlA = `ws://localhost:${wsxA.server!.port}`
		const urlB = `ws://localhost:${wsxB.server!.port}`

		clientA1 = await TestClient(urlA)
		clientA2 = await TestClient(urlA)
		clientB = await TestClient(urlB)
	})

	test("valid", async () => {
		const recMockA1 = mock((message: string) => message)
		const recMockA2 = mock((message: string) => message)
		const recMockB = mock((message: string) => message)

		await clientA1.routes.sub.call()
		await clientA2.routes.sub.call()
		await clientB.routes.sub.call()

		clientA1.routes.rec.listen(({ body }) => recMockA1(body))
		clientA2.routes.rec.listen(({ body }) => recMockA2(body))
		clientB.routes.rec.listen(({ body }) => recMockB(body))

		const message = faker.lorem.sentence()
		await clientA2.routes.pub.call(message)

		await Bun.sleep(100)

		expect(recMockA1).toBeCalledWith(message)
		expect(recMockA2).toBeCalledTimes(0)
		expect(recMockB).toBeCalledWith(message)
	})
})
