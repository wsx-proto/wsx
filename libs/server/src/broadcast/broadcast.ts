import { Topic } from "./topic"

/**
 * General broadcast implementation
 */
export class Broadcast {
	topics: Map<string, Topic> = new Map()

	topic(key: string): Topic {
		const topic = this.topics.get(key)
		if (topic) return topic
		return this.create(key)
	}

	create(key: string): Topic {
		const topic = new Topic(this, key)
		this.topics.set(key, topic)
		return topic
	}

	remove(topic: string) {
		this.topics.delete(topic)
	}
}

/**
 * Local broadcast. Shares actions only across the same server instance
 */
export class Localcast extends Broadcast {}
