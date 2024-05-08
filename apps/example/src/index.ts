import { Type } from "@sinclair/typebox"
import { Client } from "@wsx/client"
import { Wsx } from "@wsx/server"

const port = 3000
export const app = new Wsx()
	.rpc(
		"/hi",
		({ body }) => {
			console.log("hi", body)
			return "hi"
		},
		{
			body: Type.Object({ number: Type.Number() }),
		},
	)
	.rpc("/hi/:id/bye/:name", ({ params }) => params, {
		params: Type.Object({ id: Type.String(), name: Type.String() }),
	})
	.rpc("/hi/world", () => console.log("hi world"))
	.listen(port)

console.info("Server started", { port })

const client = await Client<typeof app>("localhost:3000")
const r1 = await client.hi.rpc({ number: 5 })
console.info(r1)

const r2 = await client.hi.id(5).bye.name("c").rpc()
console.info(r2)

// import readline from "node:readline"
// const rl = readline.createInterface({
// 	input: process.stdin,
// 	output: process.stdout,
// })

// rl.question("Send?", async (name) => {})
