import { Redis, type RedisOptions } from "ioredis"
import type { WsxSocket } from "../socket"
import { genId } from "../utils/gen-id"
import { Broadcast, broadcastSymbols } from "./broadcast"
import type { Topic } from "./topic"

/**
 * Redis broadcast. Shares actions via Redis Pub/Sub
 */
export class Rediscast extends Broadcast {
	private id: string = genId()
	redis: Redis
	prefix: string

	constructor({
		redis,
		prefix = "wsx__",
	}: { redis: RedisOptions; prefix?: string }) {
		super()
		this.redis = new Redis(redis)
		this.prefix = prefix

		this.redis.on("message", (channel, message) => {
			const key = this.unredisKey(channel)
			const topic = this.topics.get(key)
			if (topic) {
				this[broadcastSymbols.publish](topic, JSON.parse(message))
			}
		})
	}

	private redisKey(key: string) {
		return `${this.prefix}${key}`
	}

	private unredisKey(redisKey: string) {
		return redisKey.slice(this.prefix.length)
	}

	async create(key: string) {
		const redisKey = this.redisKey(key)
		const topic = super.create(redisKey)
		await this.redis.ssubscribe(redisKey)
		return topic
	}

	remove(topic: string) {
		super.remove(topic)
		this.redis.sunsubscribe(this.redisKey(topic))
	}

	async [broadcastSymbols.publish](
		topic: Topic,
		data: unknown,
		except?: WsxSocket,
	) {
		super[broadcastSymbols.publish](topic, data, except)
		const redisKey = this.redisKey(topic.key)
		await this.redis.spublish(redisKey, JSON.stringify(data))
	}
}
