export type UnionToIntersect<U> = (
	U extends any
		? (arg: U) => any
		: never
) extends (arg: infer I) => void
	? I
	: never

export type UnionToTuple<T> = UnionToIntersect<
	T extends any ? (t: T) => T : never
> extends (_: any) => infer W
	? [...UnionToTuple<Exclude<T, W>>, W]
	: []

export type IsAny<T> = 0 extends 1 & T ? true : false

export type IsNever<T> = [T] extends [never] ? true : false

export type IsUnknown<T> = IsAny<T> extends true
	? false
	: unknown extends T
		? true
		: false

export type AnyTypedRoute = {
	body?: unknown
	headers?: unknown
	query?: unknown
	params?: unknown
	response: Record<number, unknown>
}

export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

export type MaybeArray<T> = T | T[]
export type MaybePromise<T> = T | Promise<T>
