Server for Wsx framework. RPC, Pub/Sub, routing and end-to-end typesafety for WebSockets
```ts
import { Wsx } from "@wsx/server"
import { Type } from "@sinclair/typebox"
import { db } from "./db" // your database service

export const app = new Wsx()
	.route(
	"/user/create",
	async ({ body: {email} }) => {
		const id = await db.createUser(email)
		return id
	},
	{
		body: Type.Object({ email: Type.String() }),
		response: Type.Number(),
	},
	)
	.listen(3000)
```

[More examples](https://github.com/MeowningMaster/wsx/tree/main/examples)

> [!IMPORTANT]  
> Don't forget to install [TypeSchema adapter](https://typeschema.com/) for your validator
