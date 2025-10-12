import { ZodType, ZodTypeDef } from "zod";
import { zodToJsonSchema, Options, JsonSchema7Type } from "zod-to-json-schema";

/**
 * Converts a Zod schema to a MongoDB-compatible JSON schema format.
 * Removes the $schema property which MongoDB and some other technologies don't support.
 */
export function toMongoJsonSchema(
  schema: ZodType<unknown, ZodTypeDef, unknown>,
  options?: string | Partial<Options>,
): Omit<JsonSchema7Type, "$schema"> {
  const jsonSchema = zodToJsonSchema(schema, options);
  const { $schema, ...remainingSchema } = jsonSchema;
  void $schema; // Avoid linting error
  return remainingSchema;
}
