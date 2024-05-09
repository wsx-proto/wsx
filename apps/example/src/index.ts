import { Type } from "@sinclair/typebox"
import { Client } from "@wsx/client"
import { Wsx } from "@wsx/server"

const port = 3000
export const app = new Wsx()
	.event("/lol", Type.Object({ lol: Type.String() }))
	.route(
		"/user/create",
		({ body }) => {
			console.log("create user", body)
			return "user created"
		},
		{
			body: Type.Object({ name: Type.String() }),
			response: Type.String(),
		},
	)
	.route("/user/get", ({ body: { id } }) => console.log(id), {
		body: Type.Object({ id: Type.String() }),
	})
	.route("/user/ping", () => {
		console.log("ping")
	})
	.route("/user/company/list", () => {})
	.listen(port)

console.info("Server started", { port })

const { user } = await Client<typeof app>(`localhost:${port}`)
const r1 = await user.create.call({ name: "Andrii" })
console.info(r1)

user.ping.emit()
