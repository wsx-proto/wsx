import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { MaybePromise } from "./utility-types"

export function standardValidate<T extends StandardSchemaV1>(
	schema: T,
	input: StandardSchemaV1.InferInput<T>,
): MaybePromise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<T>>> {
	return schema["~standard"].validate(input)
}

export type { StandardSchemaV1 } from "@standard-schema/spec"
