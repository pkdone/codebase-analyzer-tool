import { z } from "zod";
import { ignoreOverride } from "zod-to-json-schema";
import { ObjectId, Decimal128 } from "bson";
import { ZodType, ZodTypeDef } from "zod";
import { zodToJsonSchema, Options, JsonSchema7Type } from "zod-to-json-schema";
import { isJsonObject } from "../utils/type-guards";

/**
 * Recursively traverse a JSON Schema object and replace unsupported keywords for MongoDB.
 * Handles:
 * - Conversion of `const: <value>` to `enum: [<value>]` (MongoDB doesn't support `const`)
 * - Removal of `default` keyword (MongoDB doesn't support `default` in $jsonSchema)
 */
function sanitizeMongoUnsupportedKeywords(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeMongoUnsupportedKeywords(item));
  }
  if (isJsonObject(schema)) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema)) {
      if (key === "const") {
        // Only add enum if enum not already defined to avoid overwriting
        if (!Object.hasOwn(sanitized, "enum")) {
          sanitized.enum = [value];
        }
        // Skip adding const to sanitized object
      } else if (key === "default") {
        // Skip default keyword - MongoDB doesn't support it in $jsonSchema validation
      } else {
        sanitized[key] = sanitizeMongoUnsupportedKeywords(value);
      }
    }
    return sanitized;
  }
  return schema;
}

export const zBsonObjectId = z.instanceof(ObjectId).describe("bson:objectId");
export const zBsonDecimal128 = z.instanceof(Decimal128).describe("bson:decimal128");
export const zBsonDate = z.coerce.date();

function hasDescription(obj: unknown): obj is { description: string } {
  return typeof obj === "object" && obj !== null && Object.hasOwn(obj, "description");
}

function hasTypeName(obj: unknown): obj is { typeName: z.ZodFirstPartyTypeKind } {
  return typeof obj === "object" && obj !== null && Object.hasOwn(obj, "typeName");
}

const mongoSchemaOptions = {
  target: "jsonSchema7" as const,
  $refStrategy: "none" as const,
  override: (def: unknown): JsonSchema7Type | typeof ignoreOverride => {
    if (hasDescription(def)) {
      if (def.description === "bson:objectId") return { bsonType: "objectId" } as JsonSchema7Type;
      if (def.description === "bson:decimal128") return { bsonType: "decimal" } as JsonSchema7Type;
    }
    if (hasTypeName(def) && def.typeName === z.ZodFirstPartyTypeKind.ZodDate) {
      return { bsonType: "date" } as JsonSchema7Type;
    }
    return ignoreOverride;
  },
};

function toMongoJsonSchema(
  schema: ZodType<unknown, ZodTypeDef, unknown>,
  options?: string | Partial<Options>,
): Omit<JsonSchema7Type, "$schema"> {
  const jsonSchema = zodToJsonSchema(schema, options);
  const { $schema, ...remainingSchema } = jsonSchema;
  void $schema;
  return remainingSchema;
}

export function zodToJsonSchemaForMDB(schema: z.ZodObject<z.ZodRawShape>) {
  const raw = toMongoJsonSchema(schema, mongoSchemaOptions);
  return sanitizeMongoUnsupportedKeywords(raw) as typeof raw;
}
