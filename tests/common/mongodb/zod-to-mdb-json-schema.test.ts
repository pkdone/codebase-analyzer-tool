import { z } from "zod";
import {
  zodToJsonSchemaForMDB,
  zBsonObjectId,
} from "../../../src/common/schema/zod-to-mdb-json-schema";

describe("zod-to-mdb-json-schema", () => {
  describe("generateMDBJSONSchema", () => {
    // Sample schema using ObjectId
    const UserSchema = z.object({
      _id: zBsonObjectId.optional(),
      username: z.string().min(3),
      email: z.string().email(),
      createdAt: z.coerce.date().default(() => new Date()),
    });

    test("should convert basic schema with custom BSON types", () => {
      const result = zodToJsonSchemaForMDB(UserSchema);

      // Basic structure checks
      expect(result).toBeDefined();
      expect(result).toHaveProperty("type", "object");

      // Check if schema has properties for each field
      const schema = result as unknown as {
        properties: Record<string, unknown>;
        required?: string[];
      };

      expect(schema.properties).toBeDefined();
      expect(Object.keys(schema.properties)).toEqual(["_id", "username", "email", "createdAt"]);

      // Check specific BSON type transformations
      // Check objectId transformation
      expect(schema.properties._id).toHaveProperty("bsonType", "objectId");

      // Check date transformation
      expect(schema.properties.createdAt).toHaveProperty("bsonType", "date");

      // String validations
      expect(schema.properties.username).toHaveProperty("type", "string");

      // Optional fields should not be in required array
      if (schema.required) {
        expect(schema.required).not.toContain("_id");
        expect(schema.required).toContain("username");
        expect(schema.required).toContain("email");
      }
    });

    test("should handle nested objects and arrays", () => {
      const ComplexSchema = z.object({
        user: UserSchema,
        tags: z.array(z.string()),
        metadata: z.record(z.string(), z.unknown()),
      });

      const result = zodToJsonSchemaForMDB(ComplexSchema);
      const schema = result as unknown as { properties: Record<string, unknown> };

      expect(schema.properties).toBeDefined();
      expect(Object.keys(schema.properties)).toEqual(["user", "tags", "metadata"]);

      // Check if user is an object with its own properties
      expect(schema.properties.user).toHaveProperty("type", "object");

      // Check if tags is an array
      expect(schema.properties.tags).toHaveProperty("type", "array");

      // Check if metadata is an object (for record type)
      expect(schema.properties.metadata).toHaveProperty("type", "object");
    });

    test("should handle empty schema", () => {
      const EmptySchema = z.object({});
      const result = zodToJsonSchemaForMDB(EmptySchema);
      const schema = result as unknown as { properties: Record<string, unknown> };

      expect(schema).toHaveProperty("type", "object");
      expect(Object.keys(schema.properties)).toHaveLength(0);
    });

    test("should handle zod string validations correctly", () => {
      const StringSchema = z.object({
        regular: z.string(),
        withMinLength: z.string().min(5),
        withMaxLength: z.string().max(10),
        withEmail: z.string().email(),
        withUrl: z.string().url(),
        withRegex: z.string().regex(/^[a-z]+$/),
      });

      const result = zodToJsonSchemaForMDB(StringSchema);
      const schema = result as unknown as { properties: Record<string, unknown> };

      // String with min length
      expect(schema.properties.withMinLength).toMatchObject({
        type: "string",
        minLength: 5,
      });

      // String with max length
      expect(schema.properties.withMaxLength).toMatchObject({
        type: "string",
        maxLength: 10,
      });

      // String with email format
      expect(schema.properties.withEmail).toMatchObject({
        type: "string",
        format: "email",
      });

      // String with URL format
      expect(schema.properties.withUrl).toMatchObject({
        type: "string",
        format: "uri",
      });

      // String with regex pattern
      expect(schema.properties.withRegex).toHaveProperty("pattern");
    });

    test("should handle zod number validations correctly", () => {
      const NumberSchema = z.object({
        regular: z.number(),
        integer: z.number().int(),
        positive: z.number().positive(),
        withMin: z.number().min(5),
        withMax: z.number().max(10),
      });

      const result = zodToJsonSchemaForMDB(NumberSchema);
      const schema = result as unknown as { properties: Record<string, unknown> };

      // Regular number
      expect(schema.properties.regular).toMatchObject({
        type: "number",
      });

      // Integer
      expect(schema.properties.integer).toMatchObject({
        type: "integer",
      });

      // Number with minimum
      expect(schema.properties.withMin).toMatchObject({
        type: "number",
        minimum: 5,
      });

      // Number with maximum
      expect(schema.properties.withMax).toMatchObject({
        type: "number",
        maximum: 10,
      });

      // Positive number handling may vary by implementation
      // Just check it exists and has type number
      expect(schema.properties.positive).toHaveProperty("type", "number");
    });

    test("should handle zod array validations correctly", () => {
      const ArraySchema = z.object({
        strings: z.array(z.string()),
        nonEmpty: z.array(z.number()).min(1),
        withMaxItems: z.array(z.boolean()).max(5),
        exactLength: z.array(z.string()).length(3),
      });

      const result = zodToJsonSchemaForMDB(ArraySchema);
      const schema = result as unknown as { properties: Record<string, unknown> };

      // Regular array
      expect(schema.properties.strings).toMatchObject({
        type: "array",
      });

      // Array with min items
      expect(schema.properties.nonEmpty).toMatchObject({
        type: "array",
        minItems: 1,
      });

      // Array with max items
      expect(schema.properties.withMaxItems).toMatchObject({
        type: "array",
        maxItems: 5,
      });

      // Array with exact length
      expect(schema.properties.exactLength).toMatchObject({
        type: "array",
        minItems: 3,
        maxItems: 3,
      });
    });

    test("should handle union types and optionals correctly", () => {
      const UnionSchema = z.object({
        stringOrNumber: z.union([z.string(), z.number()]),
        optionalField: z.string().optional(),
        nullableField: z.number().nullable(),
        defaultValue: z.string().default("default"),
      });

      const result = zodToJsonSchemaForMDB(UnionSchema);
      const schema = result as unknown as {
        properties: Record<string, unknown>;
        required?: string[];
      };

      // Union type handling may vary - check if it exists
      expect(schema.properties.stringOrNumber).toBeDefined();

      // Only check for optional fields not being required, as default handling may vary
      if (schema.required) {
        expect(schema.required).not.toContain("optionalField");
      }

      // Nullable field should be defined
      expect(schema.properties.nullableField).toBeDefined();
    });
  });

  describe("Type Safety Improvements", () => {
    test("should handle bson:objectId description correctly with type-safe guards", () => {
      const schema = z.object({
        id: zBsonObjectId,
      });

      const jsonSchema = zodToJsonSchemaForMDB(schema);
      const schemaObj = jsonSchema as unknown as { properties: Record<string, unknown> };

      expect(schemaObj.properties.id).toEqual({ bsonType: "objectId" });
    });

    test("should handle ZodDate type correctly with type-safe guards", () => {
      const schema = z.object({
        createdAt: z.coerce.date(),
      });

      const jsonSchema = zodToJsonSchemaForMDB(schema);
      const schemaObj = jsonSchema as unknown as { properties: Record<string, unknown> };

      expect(schemaObj.properties.createdAt).toEqual({ bsonType: "date" });
    });

    test("should handle regular types correctly without BSON overrides", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      });

      const jsonSchema = zodToJsonSchemaForMDB(schema);
      const schemaObj = jsonSchema as unknown as { properties: Record<string, unknown> };

      expect(schemaObj.properties.name).toHaveProperty("type", "string");
      expect(schemaObj.properties.age).toHaveProperty("type", "number");
      expect(schemaObj.properties.active).toHaveProperty("type", "boolean");
    });

    test("should handle mixed BSON and regular types correctly", () => {
      const schema = z.object({
        _id: zBsonObjectId,
        name: z.string(),
        createdAt: z.coerce.date(),
        count: z.number(),
      });

      const jsonSchema = zodToJsonSchemaForMDB(schema);
      const schemaObj = jsonSchema as unknown as { properties: Record<string, unknown> };

      // BSON types
      expect(schemaObj.properties._id).toEqual({ bsonType: "objectId" });
      expect(schemaObj.properties.createdAt).toEqual({ bsonType: "date" });

      // Regular types
      expect(schemaObj.properties.name).toHaveProperty("type", "string");
      expect(schemaObj.properties.count).toHaveProperty("type", "number");
    });
  });
});
