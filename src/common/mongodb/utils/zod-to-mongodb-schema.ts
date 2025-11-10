import { ZodType, ZodTypeDef } from "zod";
import { zodToJsonSchema, Options, JsonSchema7Type } from "zod-to-json-schema";

export function toMongoJsonSchema(
  schema: ZodType<unknown, ZodTypeDef, unknown>,
  options?: string | Partial<Options>,
): Omit<JsonSchema7Type, "$schema"> {
  const jsonSchema = zodToJsonSchema(schema, options);
  const { $schema, ...remainingSchema } = jsonSchema;
  void $schema;
  return remainingSchema;
}
