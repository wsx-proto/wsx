import { Redis, type RedisOptions } from "ioredis"
import type { WsxSocket } from "../socket"
import { genId } from "../utils/gen-id"
import { Broadcast, broadcastSymbols } from "./broadcast"
import type { Topic } from "./topic"

type TransportMessage = [senderId: string, data: unknown]

/**
 * Redis broadcast. Shares actions via Redis Pub/Sub
 */
export class Rediscast extends Broadcast {
	private id: string = genId()
	private subscriber: Redis
	private publicator: Redis

	constructor(redisOptions: RedisOptions) {
		super()
		this.subscriber = new Redis(redisOptions)
		this.publicator = new Redis(redisOptions)

		this.subscriber.on("message", (channel, message) => {
			const topic = this.topics.get(channel)
			if (topic) {
				const [senderId, data] = JSON.parse(message) as TransportMessage
				if (senderId === this.id) {
					return
				}
				super[broadcastSymbols.publish](topic, data)
			}
		})
	}

	async create(key: string): Promise<Topic> {
		const topic = super.create(key)
		await this.subscriber.subscribe(key)
		return topic
	}

	remove(topic: string): void {
		super.remove(topic)
		this.subscriber.unsubscribe(topic)
	}

	async [broadcastSymbols.publish](
		topic: Topic,
		data: unknown,
		except?: WsxSocket,
	): Promise<void> {
		super[broadcastSymbols.publish](topic, data, except)
		const message = JSON.stringify([this.id, data] satisfies TransportMessage)
		await this.publicator.publish(topic.key, message)
	}
}
