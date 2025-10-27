import { z } from "zod";
import { ignoreOverride } from "zod-to-json-schema";
import type { JsonSchema7Type } from "zod-to-json-schema";
import { ObjectId, Decimal128 } from "bson";
import { toMongoJsonSchema } from "./utils/json-schema-utils";
import { isJsonObject } from "../utils/type-guards";

/**
 * Recursively traverse a JSON Schema object and replace unsupported keywords for MongoDB.
 * Currently handles conversion of `const: <value>` to `enum: [<value>]` since MongoDB
 * does not support the JSON Schema `const` keyword (error: Unknown $jsonSchema keyword: const).
 */
function sanitizeMongoUnsupportedKeywords(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeMongoUnsupportedKeywords(item));
  }
  if (isJsonObject(schema)) {
    // If const present, replace with enum single value array
    if (Object.hasOwn(schema, "const")) {
      const constVal = schema.const;
      // Only add enum if enum not already defined to avoid overwriting
      if (!Object.hasOwn(schema, "enum")) {
        schema.enum = [constVal];
      }
      delete schema.const; // Remove unsupported keyword
    }
    // Recurse into known container properties
    for (const key of Object.keys(schema)) {
      schema[key] = sanitizeMongoUnsupportedKeywords(schema[key]);
    }
    return schema;
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

export function zodToJsonSchemaForMDB(schema: z.ZodObject<z.ZodRawShape>) {
  const raw = toMongoJsonSchema(schema, mongoSchemaOptions);
  // Sanitize unsupported keywords before returning
  return sanitizeMongoUnsupportedKeywords(raw) as typeof raw;
}
