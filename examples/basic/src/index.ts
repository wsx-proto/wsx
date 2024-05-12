import { Type } from "@sinclair/typebox"
import { Client } from "@wsx/client"
import { Wsx } from "@wsx/server"

const port = 3000
export const app = new Wsx()
	.route(
		"/user/create",
		({ body, ws }) => {
			console.log("create user", body)
			return ws.id
		},
		{
			body: Type.Object({ name: Type.String() }),
			response: Type.String(),
		},
	)
	.route("/user/get", ({ body: { id } }) => console.log(id), {
		body: Type.Object({ id: Type.String() }),
	})
	.event("/user/pong", {
		body: Type.Object({ message: Type.String() }),
		response: Type.String(),
	})
	.route("/user/ping", async ({ ws, events }) => {
		console.log("server ping", ws.id)
		const response = await events.user.pong.call({ message: "hello" })
		console.log("server pong", response)
	})
	.route("/user/company/list", () => {})
	.listen(port)

console.info("Server started", { port })

const {
	routes: { user },
	raw,
} = await Client<typeof app>(`localhost:${port}`)

user.pong.listen(({ body: { message } }) => {
	console.log("client pong", message)
	setImmediate(() => raw.close())
	return "ok"
})

const id = await user.create.call({ name: "Andrii" })
console.info(id)

user.ping.emit()
