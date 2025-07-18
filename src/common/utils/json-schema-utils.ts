import { ZodType, ZodTypeDef } from "zod";
import { zodToJsonSchema, Options } from "zod-to-json-schema";

export function zodToJsonSchemaNormalized(
  schema: ZodType<unknown, ZodTypeDef, unknown>,
  options?: string | Partial<Options>,
) {
  // Generate the JSON schema
  const jsonSchema = zodToJsonSchema(schema, options);

  // Remove the $schema property which technologies like MongoDB and VertexAI don't support
  const { $schema, ...remainingSchema } = jsonSchema;
  void $schema; // Avoid linting error
  return remainingSchema;
}
