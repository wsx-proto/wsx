import { Elysia } from "elysia"

const app = new Elysia()
app.ws("/", {
	open(ws) {
		console.log("open", ws.id)
	},
	message(ws, message) {
		console.log("message", message)
		ws.send(message)
	},
	close(ws, code, message) {
		console.log("close", ws.id, code, message)
	},
})

app.listen(3000)
