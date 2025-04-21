import { beforeAll, expect, mock, test } from "bun:test"
import { faker } from "@faker-js/faker"
import { Type } from "@sinclair/typebox"
import { Compile } from "@sinclair/typemap"
import { Client, type ClientType } from "@wsx/client"
import { Wsx } from "@wsx/server"

let serverMessage: string
let clientMessage: string

const onRequest = mock((message: string) => void message)
const onHandle = mock((message: string) => void message)
const onResponse = mock((message: string) => void message)
const onError = mock((message: string) => void message)

type Server = ReturnType<typeof Server>
const Server = () =>
	new Wsx()
		.onRequest(({ body }) => onRequest(body))
		.onHandle(({ body }) => onHandle(body))
		.onResponse((_, response) => onResponse(response))
		.onError((_, error) => onError(error))
		.route("/success", () => serverMessage, {
			body: Compile(Type.String()),
			response: Compile(Type.String()),
		})
		.route("/fail", () => {
			throw serverMessage
		})
		.listen(0)

let routes: ClientType<Server>
beforeAll(async () => {
	serverMessage = faker.lorem.sentence()
	clientMessage = faker.lorem.sentence()

	const wsx = Server()
	const { port } = wsx.server!
	const client = await Client<typeof wsx>(`ws://localhost:${port}`)
	routes = client.routes
})

test("success", async () => {
	const response = await routes.success.call(clientMessage)
	expect(response.status).toBe("success")
	expect(response.body).toBe(serverMessage)
	expect(onRequest).toBeCalledWith(clientMessage)
	expect(onHandle).toBeCalledWith(clientMessage)
	expect(onResponse).toBeCalledWith(serverMessage)
})

test("error", async () => {
	const response = await routes.fail.call()
	expect(response.status).toBe("error")
	expect(onError).toBeCalledWith(serverMessage)
})
