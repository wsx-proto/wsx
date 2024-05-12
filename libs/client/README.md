Client for Wsx framework. RPC, Pub/Sub, routing and end-to-end typesafety for WebSockets
```ts
import { Client } from "@wsx/client"
// app is an instance of Wsx
import type { app } from "@my-project/server"

const { routes: {user} } = await Client<typeof app>('localhost:3000')
const newUserId = await user.create.call({ email: "meowningmaster@gmail.com" })
console.info(newUserId)
```

[More examples](https://github.com/MeowningMaster/wsx/tree/main/examples)