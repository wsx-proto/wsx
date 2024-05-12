Client for WSX framework. RPC, Pub/Sub, routing and end-to-end typesafety for WebSockets
```ts
import { Client } from "@wsx/client"
// app is an instance of Wsx
import type { app } from "@my-project/server"

const client = await Client<typeof app>('localhost:3000')
const newUserId = await client.user.create.call({ email: "meowningmaster@gmail.com" })
console.info(newUserId)
```