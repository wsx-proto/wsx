import { Type } from "@sinclair/typebox"
import { Wsx } from "@wsx/wsx"

const app = new Wsx()
	.rpc(
		"/hi",
		(message) => {
			console.log("hi", message)
			return "hi"
		},
		{
			body: Type.Object({ number: Type.Number() }),
		},
	)
	.rpc("/hello", (message) => console.log(`hello${message}`))

const port = 3000
app.listen(port)

console.info("Server started", { port })
