import { Type } from "@sinclair/typebox"
import { Client } from "@wsx/client"
import { Wsx } from "@wsx/server"

const port = 3000
export const app = new Wsx()
	.route(
		"/user/create",
		({ body }) => {
			console.log("create user", body)
			return `user ${body.name} created`
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
	.route("/user/ping", ({ ws, events }) => {
		console.log("ping", ws.id)
	})
	.route("/user/company/list", () => {})
	.listen(port)

console.info("Server started", { port })

const client = await Client<typeof app>(`localhost:${port}`)

client.user.pong.listen(({ body: { message } }) => {
	console.log("pong", message)
	return "ok"
})

const r1 = await client.user.create.call({ name: "Andrii" })
console.info(r1)

client.user.ping.emit()
