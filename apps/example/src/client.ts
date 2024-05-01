import { Client } from "@wsx/client"
import type { app } from "./index"

import readline from "node:readline"

const client = await Client<typeof app>("localhost:3000")

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

rl.question("Send?", async (name) => {
	const response = await client.hi.rpc({ number: 5 })
	console.info(response)
})
