import { ZodType, ZodTypeDef } from "zod";
import { zodToJsonSchema, Options, JsonSchema7Type } from "zod-to-json-schema";
import { isJsonObject } from "../../utils/type-guards";

/**
 * Recursively removes unsupported keywords from JSON Schema.
 * Providers like Vertex AI don't support certain keywords (e.g., 'const').
 *
 * @param schema - The schema object to sanitize
 * @param unsupportedKeywords - Array of keyword names to remove (defaults to ['const'])
 * @returns The sanitized schema with unsupported keywords removed
 */
export function sanitizeSchemaForProvider(
  schema: unknown,
  unsupportedKeywords: string[] = ["const"],
): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeSchemaForProvider(item, unsupportedKeywords));
  }

  if (isJsonObject(schema)) {
    const sanitized: Record<string, unknown> = {};
    const schemaObj = schema;

    for (const [key, value] of Object.entries(schemaObj)) {
      if (unsupportedKeywords.includes(key)) continue;
      sanitized[key] = sanitizeSchemaForProvider(value, unsupportedKeywords);
    }

    return sanitized;
  }

  return schema;
}

/**
 * Converts Zod schema to JSON Schema without $schema property.
 * This is a generic utility that can be used by any LLM provider that needs
 * JSON Schema without the $schema metadata field.
 *
 * @param zodSchema - The Zod schema to convert
 * @param options - Optional configuration for the conversion
 * @returns JSON Schema object without $schema property
 */
export function zodToJsonSchemaWithoutMeta(
  zodSchema: ZodType<unknown, ZodTypeDef, unknown>,
  options?: string | Partial<Options>,
): Omit<JsonSchema7Type, "$schema"> {
  const jsonSchema = zodToJsonSchema(zodSchema, options);
  const { $schema: _removed, ...remainingSchema } = jsonSchema;
  return remainingSchema;
}
