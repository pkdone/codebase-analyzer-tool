import { ZodType, ZodTypeDef } from "zod";
import { zodToJsonSchema, Options, JsonSchema7Type } from "zod-to-json-schema";

/**
 * Converts a Zod schema to a JSON schema. Removes the $schema property which technologies like
 * MongoDB and VertexAI don't support
 */
export function zodToJsonSchemaNormalized(
  schema: ZodType<unknown, ZodTypeDef, unknown>,
  options?: string | Partial<Options>,
): Omit<JsonSchema7Type, "$schema"> {
  const jsonSchema = zodToJsonSchema(schema, options);
  const { $schema, ...remainingSchema } = jsonSchema;
  void $schema; // Avoid linting error
  return remainingSchema;
}
