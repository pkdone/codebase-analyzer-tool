import { z } from "zod";
import { ignoreOverride } from "zod-to-json-schema";
import type { JsonSchema7Type } from "zod-to-json-schema";
import { ObjectId, Decimal128 } from "bson";
import { toMongoJsonSchema } from "./utils/json-schema-utils";

export const zBsonObjectId = z.instanceof(ObjectId).describe("bson:objectId");
export const zBsonDecimal128 = z.instanceof(Decimal128).describe("bson:decimal128");
export const zBsonDate = z.coerce.date();

/**
 * Type guard to check if an object has a description property
 */
function hasDescription(obj: unknown): obj is { description: string } {
  return typeof obj === "object" && obj !== null && "description" in obj;
}

/**
 * Type guard to check if an object has a typeName property
 */
function hasTypeName(obj: unknown): obj is { typeName: z.ZodFirstPartyTypeKind } {
  return typeof obj === "object" && obj !== null && "typeName" in obj;
}

// Use the appropriate type based on the zod-to-json-schema library requirements
const mongoSchemaOptions = {
  target: "jsonSchema7" as const,
  $refStrategy: "none" as const,
  override: (def: unknown): JsonSchema7Type | typeof ignoreOverride => {
    // Check for BSON-specific descriptions
    if (hasDescription(def)) {
      if (def.description === "bson:objectId") return { bsonType: "objectId" } as JsonSchema7Type;
      if (def.description === "bson:decimal128")
        return { bsonType: "decimal" } as JsonSchema7Type;
    }

    // Check for ZodDate type
    if (hasTypeName(def) && def.typeName === z.ZodFirstPartyTypeKind.ZodDate) {
      return { bsonType: "date" } as JsonSchema7Type;
    }

    return ignoreOverride;
  },
};

export function zodToJsonSchemaForMDB(schema: z.ZodObject<z.ZodRawShape>) {
  return toMongoJsonSchema(schema, mongoSchemaOptions);
}
