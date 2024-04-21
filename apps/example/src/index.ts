import { Type } from "@sinclair/typebox"
import { Wsx } from "@wsx/server"

const app = new Wsx()
	.rpc(
		"/hi",
		(body) => {
			console.log("hi", body)
			return "hi"
		},
		{
			body: Type.Object({ number: Type.Number() }),
		},
	)
	.rpc("/hello", (body) => console.log(`hello${body}`))

const port = 3000
app.listen(port)

console.info("Server started", { port })
