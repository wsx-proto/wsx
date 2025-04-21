Server for Wsx framework. RPC, Pub/Sub, routing and end-to-end typesafety for WebSockets
```ts
import { Wsx } from "@wsx/server"
import { z } from "zod"
import { db } from "./db" // your database service

export const app = new Wsx()
	.route(
	"/user/create",
	async ({ body: {email} }) => {
		const id = await db.createUser(email)
		return id
	},
	{
		body: z.object({ email: z.string() }),
		response: z.number().int(),
	},
	)
	.listen(3000)
```

[More examples](https://github.com/MeowningMaster/wsx/tree/main/examples)

> [!TIP]  
> Supports [Standard Schema](https://github.com/standard-schema/standard-schema) validators
