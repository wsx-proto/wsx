import type { MaybePromise } from "@wsx/shared"
import { type WsxSocket, socketSymbols } from "../socket"
import * as symbols from "./symbols"
import { Topic } from "./topic"
export { symbols as broadcastSymbols }

/**
 * General broadcast implementation
 */
export class Broadcast {
	topics: Map<string, Topic> = new Map()

	topic(key: string): MaybePromise<Topic> {
		const topic = this.topics.get(key)
		if (topic) return topic
		return this.create(key)
	}

	create(key: string): MaybePromise<Topic> {
		const topic = new Topic(this, key)
		this.topics.set(key, topic)
		return topic
	}

	remove(topic: string) {
		this.topics.delete(topic)
	}

	[symbols.publish](
		topic: Topic,
		data: unknown,
		except?: WsxSocket,
	): MaybePromise<void> {
		for (const socket of topic.sockets) {
			if (socket === except) continue
			socket[socketSymbols.send](data)
		}
	}
}

/**
 * Local broadcast. Shares actions only across the same server instance
 */
export class Localcast extends Broadcast {
	topic(key: string): Topic {
		return super.topic(key) as Topic
	}

	create(key: string): Topic {
		return super.create(key) as Topic
	}
}
