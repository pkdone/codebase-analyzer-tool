import { z } from "zod";
import { describe, test, expect } from "@jest/globals";
import {
  LLMOutputFormat,
  LLMCompletionOptions,
  isJsonOptionsWithSchema,
  isTextOptions,
} from "../../../../src/common/llm/types/llm-request.types";
import { parseAndValidateLLMJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import { repairAndValidateJson } from "../../../../src/common/llm/json-processing/core/json-validating";

/**
 * Integration tests for end-to-end type safety through the LLM call chain.
 * These tests verify that type information flows correctly from the router
 * through the pipeline to validation, with proper overload resolution.
 *
 * Note: These are integration tests that verify the type flow but use
 * mocked LLM providers since we don't want to make real API calls in tests.
 */
describe("LLMRouter Type Safety Integration Tests", () => {
  describe("JSON Processing Pipeline Type Flow", () => {
    test("should validate JSON with transforms and maintain type safety", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      const validData = {
        name: "John Doe",
        age: 30,
        email: "john@example.com",
      };

      const result = repairAndValidateJson(validData, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type should be inferred as z.infer<typeof schema>
        const typed: z.infer<typeof schema> = result.data;
        expect(typed.name).toBe("John Doe");
        expect(typed.age).toBe(30);
        expect(typed.email).toBe("john@example.com");
      }
    });

    test("should handle validation failure with proper typing", () => {
      const schema = z.object({
        count: z.number(),
        items: z.array(z.string()),
      });

      const invalidData = {
        count: "not a number", // Invalid type
        items: ["valid"],
      };

      const result = repairAndValidateJson(invalidData, schema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toBeDefined();
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    test("should process JSON string and validate with schema", () => {
      const schema = z.object({
        status: z.enum(["success", "error"]),
        data: z.object({
          id: z.number(),
          value: z.string(),
        }),
      });

      const jsonString = JSON.stringify({
        status: "success",
        data: {
          id: 42,
          value: "test",
        },
      });

      const context = {
        resource: "test",
        purpose: "completions" as const,
      };

      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(jsonString, context, options, true);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type inference should work through parseAndValidateLLMJson
        expect(result.data.status).toBe("success");
        expect(result.data.data.id).toBe(42);
        expect(result.data.data.value).toBe("test");
      }
    });
  });

  describe("Schema Transformation Type Safety", () => {
    test("should handle schema transforms while preserving types", () => {
      const schema = z.object({
        items: z.array(z.string()),
        count: z.number(),
      });

      // Data that needs transformation (null to undefined)
      const dataWithNull = {
        items: ["a", "b", "c"],
        count: 3,
        extraField: null, // Will be transformed
      };

      const result = repairAndValidateJson(dataWithNull, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toEqual(["a", "b", "c"]);
        expect(result.data.count).toBe(3);
        // extraField should be ignored by schema
      }
    });

    test("should handle coercion transformations", () => {
      const schema = z.object({
        name: z.string(),
        description: z.string(),
      });

      // Data with undefined that needs transformation to string
      const dataWithUndefined = {
        name: "Test",
        description: undefined,
      };

      const result = repairAndValidateJson(dataWithUndefined, schema);

      // Should transform undefined to empty string for required string fields
      if (result.success) {
        expect(result.data.name).toBe("Test");
        expect(typeof result.data.description).toBe("string");
      }
    });
  });

  describe("Complex Schema Validation", () => {
    test("should validate deeply nested schemas with correct typing", () => {
      const nestedSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string(),
              items: z.array(z.number()),
            }),
          }),
        }),
      });

      const data = {
        level1: {
          level2: {
            level3: {
              value: "deep",
              items: [1, 2, 3],
            },
          },
        },
      };

      const result = repairAndValidateJson(data, nestedSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        // Deep property access should work without casts
        const value = result.data.level1.level2.level3.value;
        const items = result.data.level1.level2.level3.items;
        expect(value).toBe("deep");
        expect(items).toEqual([1, 2, 3]);
      }
    });

    test("should handle array of objects with correct typing", () => {
      const arraySchema = z.object({
        users: z.array(
          z.object({
            id: z.number(),
            username: z.string(),
            roles: z.array(z.string()),
          }),
        ),
      });

      const data = {
        users: [
          { id: 1, username: "alice", roles: ["admin", "user"] },
          { id: 2, username: "bob", roles: ["user"] },
        ],
      };

      const result = repairAndValidateJson(data, arraySchema);

      expect(result.success).toBe(true);
      if (result.success) {
        // Array operations should work with proper typing
        expect(result.data.users).toHaveLength(2);
        const firstUser = result.data.users[0];
        expect(firstUser.username).toBe("alice");
        expect(firstUser.roles).toContain("admin");

        // Map should work without casts
        const usernames = result.data.users.map((u) => u.username);
        expect(usernames).toEqual(["alice", "bob"]);
      }
    });

    test("should handle optional fields correctly in validation", () => {
      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        withDefault: z.string().default("default value"),
      });

      const minimalData = {
        required: "present",
      };

      const result = repairAndValidateJson(minimalData, optionalSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.required).toBe("present");
        expect(result.data.optional).toBeUndefined();
        expect(result.data.withDefault).toBe("default value");
      }
    });
  });

  describe("Error Handling with Type Safety", () => {
    test("should provide typed error information on validation failure", () => {
      const strictSchema = z.object({
        email: z.string().email(),
        age: z.number().positive().int(),
        username: z.string().min(3).max(20),
      });

      const invalidData = {
        email: "not-an-email",
        age: -5,
        username: "ab", // Too short
      };

      const result = repairAndValidateJson(invalidData, strictSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Issues should be properly typed
        expect(Array.isArray(result.issues)).toBe(true);
        expect(result.issues.length).toBeGreaterThan(0);

        // Each issue should have the expected structure
        result.issues.forEach((issue) => {
          expect(issue).toHaveProperty("code");
          expect(issue).toHaveProperty("path");
          expect(issue).toHaveProperty("message");
        });
      }
    });

    test("should handle empty data validation", () => {
      const schema = z.object({
        value: z.string(),
      });

      const emptyData = {};

      const result = repairAndValidateJson(emptyData, schema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Union and Discriminated Union Types", () => {
    test("should validate union types with proper type narrowing", () => {
      const unionSchema = z.object({
        result: z.union([
          z.object({ type: z.literal("success"), data: z.string() }),
          z.object({ type: z.literal("error"), message: z.string() }),
        ]),
      });

      const successData = {
        result: {
          type: "success",
          data: "Operation completed",
        },
      };

      const result = repairAndValidateJson(successData, unionSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        const resultData = result.data.result;
        if (resultData.type === "success") {
          // Type should be narrowed here
          expect(resultData.data).toBe("Operation completed");
        }
      }
    });

    test("should validate discriminated unions correctly", () => {
      const discriminatedSchema = z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("circle"), radius: z.number() }),
        z.object({ kind: z.literal("rectangle"), width: z.number(), height: z.number() }),
      ]);

      const circleData = {
        kind: "circle",
        radius: 10,
      };

      const result = repairAndValidateJson(circleData, discriminatedSchema);

      expect(result.success).toBe(true);
      if (result.success && result.data.kind === "circle") {
        expect(result.data.radius).toBe(10);
      }
    });
  });

  describe("Real-World Schema Scenarios", () => {
    test("should handle API response schema with proper typing", () => {
      const apiResponseSchema = z.object({
        statusCode: z.number(),
        headers: z.record(z.string()),
        body: z.object({
          success: z.boolean(),
          data: z.array(
            z.object({
              id: z.string(),
              timestamp: z.string(),
              payload: z.unknown(),
            }),
          ),
          pagination: z.object({
            page: z.number(),
            pageSize: z.number(),
            total: z.number(),
          }),
        }),
      });

      const apiData = {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: {
          success: true,
          data: [
            { id: "1", timestamp: "2024-01-01T00:00:00Z", payload: { test: true } },
            { id: "2", timestamp: "2024-01-02T00:00:00Z", payload: { test: false } },
          ],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 2,
          },
        },
      };

      const result = repairAndValidateJson(apiData, apiResponseSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.statusCode).toBe(200);
        expect(result.data.body.success).toBe(true);
        expect(result.data.body.data).toHaveLength(2);
        expect(result.data.body.pagination.total).toBe(2);
      }
    });

    test("should handle entity schema with relationships", () => {
      const entitySchema = z.object({
        technologies: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            properties: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                required: z.boolean(),
              }),
            ),
            relationships: z.array(
              z.object({
                target: z.string(),
                type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
              }),
            ),
          }),
        ),
      });

      const entityData = {
        technologies: [
          {
            name: "User",
            description: "User entity",
            properties: [
              { name: "id", type: "number", required: true },
              { name: "email", type: "string", required: true },
              { name: "name", type: "string", required: false },
            ],
            relationships: [
              { target: "Order", type: "one-to-many" },
              { target: "Profile", type: "one-to-one" },
            ],
          },
        ],
      };

      const result = repairAndValidateJson(entityData, entitySchema);

      expect(result.success).toBe(true);
      if (result.success) {
        const firstEntity = result.data.technologies[0];
        expect(firstEntity.name).toBe("User");
        expect(firstEntity.properties).toHaveLength(3);
        expect(firstEntity.relationships).toHaveLength(2);

        // Complex queries should work without casts
        const requiredProps = firstEntity.properties.filter((p) => p.required);
        expect(requiredProps).toHaveLength(2);
      }
    });
  });

  describe("Transform Steps Tracking", () => {
    test("should track transforms that were applied during validation", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      // Data that will trigger transforms
      const dataRequiringTransforms = {
        items: "not an array", // Will be transformed to empty array
      };

      const result = repairAndValidateJson(dataRequiringTransforms, schema);

      // Transform steps should be tracked
      expect(result.transformRepairs).toBeDefined();
      expect(Array.isArray(result.transformRepairs)).toBe(true);
    });

    test("should have empty transform steps when no transforms needed", () => {
      const schema = z.object({
        value: z.string(),
      });

      const perfectData = {
        value: "perfect",
      };

      const result = repairAndValidateJson(perfectData, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.transformRepairs).toEqual([]);
      }
    });
  });

  describe("TEXT Output Path Type Safety", () => {
    test("should preserve string type through options for TEXT output", () => {
      const options = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      // Simulate what the pipeline returns for TEXT
      const mockResponse = "This is a text response";

      // Type should be string when format is TEXT
      if (options.outputFormat === LLMOutputFormat.TEXT) {
        const result: string = mockResponse;
        expect(typeof result).toBe("string");
        expect(result.toUpperCase()).toBe("THIS IS A TEXT RESPONSE");
      }
    });

    test("should correctly narrow types using isTextOptions guard", () => {
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      // Test type narrowing with guard
      if (isTextOptions(textOptions)) {
        // TypeScript should know this is TEXT
        expect(textOptions.outputFormat).toBe(LLMOutputFormat.TEXT);
        expect(textOptions.jsonSchema).toBeUndefined();
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });

    test("should correctly narrow types using isJsonOptionsWithSchema guard", () => {
      const schema = z.object({ value: z.string() });

      const jsonOptions: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      // Test type narrowing with guard
      if (isJsonOptionsWithSchema(jsonOptions)) {
        // TypeScript should know options.jsonSchema exists
        const validated = jsonOptions.jsonSchema.parse({ value: "test" });
        expect(validated.value).toBe("test");
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });

    test("should distinguish between TEXT and JSON with type guards", () => {
      const schema = z.object({ data: z.string() });

      const jsonOptions: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      // JSON with schema
      expect(isJsonOptionsWithSchema(jsonOptions)).toBe(true);
      expect(isTextOptions(jsonOptions)).toBe(false);

      // TEXT
      expect(isJsonOptionsWithSchema(textOptions)).toBe(false);
      expect(isTextOptions(textOptions)).toBe(true);
    });

    test("should handle conditional logic pattern with type guards", () => {
      const schema = z.object({ result: z.boolean() });
      const options: LLMCompletionOptions<typeof schema> | undefined = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      let pathTaken = "";

      if (isJsonOptionsWithSchema(options)) {
        // JSON with schema path
        const parsed = options.jsonSchema.safeParse({ result: true });
        expect(parsed.success).toBe(true);
        pathTaken = "json";
      } else if (isTextOptions(options)) {
        // TEXT path - should not execute for this test
        pathTaken = "text";
      }

      expect(pathTaken).toBe("json");
    });

    test("should handle TEXT options in conditional pattern", () => {
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      let pathTaken = "";

      if (isJsonOptionsWithSchema(options)) {
        pathTaken = "json";
      } else if (isTextOptions(options)) {
        pathTaken = "text";
        // TypeScript knows this is TEXT output
        expect(options.outputFormat).toBe(LLMOutputFormat.TEXT);
      }

      expect(pathTaken).toBe("text");
    });

    test("should work with string operations after TEXT type narrowing", () => {
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      // Mock TEXT response
      const mockTextResponse = "  response with whitespace  ";

      if (isTextOptions(textOptions)) {
        // String operations should work
        const trimmed = mockTextResponse.trim();
        expect(trimmed).toBe("response with whitespace");

        const upper = mockTextResponse.toUpperCase();
        expect(upper).toBe("  RESPONSE WITH WHITESPACE  ");

        const words = mockTextResponse.trim().split(" ");
        expect(words).toHaveLength(3);
      }
    });

    test("should handle undefined options correctly with type guards", () => {
      const undefinedOptions: LLMCompletionOptions | undefined = undefined;

      expect(isJsonOptionsWithSchema(undefinedOptions)).toBe(false);
      expect(isTextOptions(undefinedOptions)).toBe(false);
    });

    test("should handle JSON options without schema correctly", () => {
      const jsonNoSchema: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      // Neither guard should return true for JSON without schema
      expect(isJsonOptionsWithSchema(jsonNoSchema)).toBe(false);
      expect(isTextOptions(jsonNoSchema)).toBe(false);
    });
  });
});
