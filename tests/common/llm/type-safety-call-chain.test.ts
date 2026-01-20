import "reflect-metadata";
import { z } from "zod";
import { parseAndValidateLLMJson } from "../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../src/common/llm/types/llm-request.types";

/**
 * Test suite to verify end-to-end type safety improvements in the JSON validation call chain.
 *
 * This test suite validates that:
 * 1. parseAndValidateLLMJson correctly infers return types from provided Zod schemas
 * 2. Type information flows properly through the call chain without unnecessary casts
 * 3. The improvements address the issues identified in requirement23.result
 */
describe("Type Safety Call Chain Improvements", () => {
  const context = { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS };

  describe("parseAndValidateLLMJson type inference", () => {
    it("should infer return type from simple object schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const json = '{"name": "Alice", "age": 30}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type should be inferred as { name: string; age: number }
        const data: z.infer<typeof schema> = result.data;
        expect(data.name).toBe("Alice");
        expect(data.age).toBe(30);

        // TypeScript should enforce type safety
        expect(typeof data.name).toBe("string");
        expect(typeof data.age).toBe("number");
      }
    });

    it("should infer return type from complex nested schema", () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            email: z.string().email(),
          }),
          settings: z.object({
            theme: z.enum(["light", "dark"]),
            notifications: z.boolean(),
          }),
        }),
        metadata: z.object({
          created: z.string(),
          updated: z.string().optional(),
        }),
      });

      const json = JSON.stringify({
        user: {
          profile: { name: "Bob", email: "bob@example.com" },
          settings: { theme: "dark", notifications: true },
        },
        metadata: { created: "2024-01-01" },
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type should be deeply inferred
        const data: z.infer<typeof schema> = result.data;
        expect(data.user.profile.name).toBe("Bob");
        expect(data.user.settings.theme).toBe("dark");
        expect(data.metadata.created).toBe("2024-01-01");
        expect(data.metadata.updated).toBeUndefined();

        // TypeScript enforces nested type safety
        expect(typeof data.user.profile.email).toBe("string");
        expect(typeof data.user.settings.notifications).toBe("boolean");
      }
    });

    it("should infer return type from array schema", () => {
      const schema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            tags: z.array(z.string()),
          }),
        ),
      });

      const json = JSON.stringify({
        items: [
          { id: 1, name: "Item 1", tags: ["tag1", "tag2"] },
          { id: 2, name: "Item 2", tags: ["tag3"] },
        ],
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(Array.isArray(data.items)).toBe(true);
        expect(data.items).toHaveLength(2);
        expect(data.items[0].id).toBe(1);
        expect(data.items[0].tags).toHaveLength(2);

        // TypeScript knows items is an array of specific type
        expect(typeof data.items[0].name).toBe("string");
        expect(Array.isArray(data.items[0].tags)).toBe(true);
      }
    });

    it("should infer return type from discriminated union schema", () => {
      const schema = z.discriminatedUnion("type", [
        z.object({
          type: z.literal("success"),
          data: z.object({ result: z.string() }),
        }),
        z.object({
          type: z.literal("error"),
          error: z.object({ message: z.string(), code: z.number() }),
        }),
      ]);

      const successJson = JSON.stringify({
        type: "success",
        data: { result: "Operation completed" },
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(successJson, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.type).toBe("success");

        // TypeScript narrows the union type based on discriminator
        if (data.type === "success") {
          expect(data.data.result).toBe("Operation completed");
        }
      }
    });

    it("should infer return type with optional and nullable fields", () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
        optionalNullable: z.string().optional().nullable(),
        withDefault: z.string().default("default-value"),
      });

      const json = JSON.stringify({
        required: "value",
        nullable: null,
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type is correctly inferred from the schema
        // Note: Fields with .default() are applied during Zod validation
        expect(result.data.required).toBe("value");
        expect(result.data.optional).toBeUndefined();
        expect(result.data.nullable).toBeNull();
        expect(result.data.withDefault).toBe("default-value");

        // TypeScript understands optional vs nullable
        expect(typeof result.data.required).toBe("string");
        expect(result.data.nullable === null || typeof result.data.nullable === "string").toBe(
          true,
        );
      }
    });

    it("should return unknown when no schema provided", () => {
      const json = '{"key": "value", "number": 42, "nested": {"prop": true}}';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type is unknown when no schema is provided - callers must cast or use a schema
        const data = result.data as Record<string, unknown>;
        expect(data.key).toBe("value");
        expect(data.number).toBe(42);
        expect(typeof data.nested).toBe("object");
      }
    });

    it("should preserve type through schema transforms", () => {
      const schema = z.object({
        name: z.string(),
        value: z.string().optional(),
      });

      // JSON with null that will be transformed to undefined
      const json = '{"name": "test", "value": null}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.name).toBe("test");
        expect(data.value).toBeUndefined();

        // Type is preserved even after transforms
        expect(typeof data.name).toBe("string");
      }
    });

    it("should work with readonly arrays in schema", () => {
      const schema = z.object({
        items: z.array(z.string()).readonly(),
      });

      const json = '{"items": ["a", "b", "c"]}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.items).toEqual(["a", "b", "c"]);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    it("should infer return type from intersection schema", () => {
      const baseSchema = z.object({
        id: z.number(),
        name: z.string(),
      });
      const extendedSchema = z.object({
        metadata: z.object({
          created: z.string(),
          updated: z.string(),
        }),
      });
      const schema = z.intersection(baseSchema, extendedSchema);

      const json = JSON.stringify({
        id: 1,
        name: "Test",
        metadata: { created: "2024-01-01", updated: "2024-01-02" },
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.id).toBe(1);
        expect(data.name).toBe("Test");
        expect(data.metadata.created).toBe("2024-01-01");
      }
    });

    it("should handle recursive schema types", () => {
      interface TreeNode {
        value: string;
        children?: TreeNode[];
      }

      const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
        z.object({
          value: z.string(),
          children: z.array(treeNodeSchema).optional(),
        }),
      );

      const json = JSON.stringify({
        value: "root",
        children: [{ value: "child1", children: [{ value: "grandchild1" }] }, { value: "child2" }],
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: treeNodeSchema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: TreeNode = result.data;
        expect(data.value).toBe("root");
        expect(data.children).toHaveLength(2);
        expect(data.children![0].children).toHaveLength(1);
        expect(data.children![0].children![0].value).toBe("grandchild1");
      }
    });
  });

  describe("type safety validation scenarios", () => {
    it("should maintain type safety through success path", () => {
      const schema = z.object({
        status: z.literal("success"),
        result: z.object({
          count: z.number(),
          message: z.string(),
        }),
      });

      const json = JSON.stringify({
        status: "success",
        result: { count: 10, message: "Completed" },
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      // Type guard ensures correct typing in both branches
      if (result.success) {
        // result.data should be typed according to schema
        const data: z.infer<typeof schema> = result.data;
        expect(data.status).toBe("success");
        expect(data.result.count).toBe(10);
        expect(result.repairs).toBeDefined();
      } else {
        // result.error should be available
        expect(result.error).toBeDefined();
      }
    });

    it("should maintain type safety through failure path", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const invalidJson = '{"name": "Alice", "age": "not-a-number"}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(invalidJson, context, completionOptions);

      // Type guard ensures proper handling
      if (result.success) {
        // This branch should not execute
        expect(true).toBe(false);
      } else {
        // error is available and typed
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("validation");
      }

      expect(result.success).toBe(false);
    });

    it("should handle complex real-world schema without type loss", () => {
      // Simulate a real schema like sourceSummarySchema or appSummaryCategorySchemas
      const realWorldSchema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        databaseIntegration: z.object({
          mechanism: z.enum(["NONE", "JDBC", "ORM", "DDL"]),
          description: z.string(),
          codeExample: z.string(),
        }),
        dependencies: z.array(z.string()).optional(),
        integrationPoints: z
          .array(
            z.object({
              type: z.string(),
              description: z.string(),
              details: z.string().optional(),
            }),
          )
          .optional(),
      });

      const json = JSON.stringify({
        purpose: "Database access layer",
        implementation: "Uses JPA repositories",
        databaseIntegration: {
          mechanism: "ORM",
          description: "JPA/Hibernate",
          codeExample: "@Repository interface UserRepo...",
        },
        dependencies: ["spring-data-jpa", "hibernate-core"],
        integrationPoints: [
          {
            type: "REST",
            description: "Exposes user data via REST API",
          },
        ],
      });

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: realWorldSchema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        // All nested types should be preserved
        const data: z.infer<typeof realWorldSchema> = result.data;
        expect(data.purpose).toBe("Database access layer");
        expect(data.databaseIntegration.mechanism).toBe("ORM");
        expect(data.dependencies).toHaveLength(2);
        expect(data.integrationPoints).toHaveLength(1);
        expect(data.integrationPoints![0].type).toBe("REST");

        // TypeScript understands the complete structure
        expect(typeof data.implementation).toBe("string");
        expect(Array.isArray(data.dependencies)).toBe(true);
      }
    });
  });

  describe("validation failure with type preservation", () => {
    it("should fail validation but preserve transform information", () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().min(0).max(150),
      });

      const json = '{"name": "Alice", "email": "invalid-email", "age": 25}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.type).toBe("validation");
      }
    });

    it("should apply transforms but still fail if schema not satisfied", () => {
      const schema = z.object({
        required: z.string(),
        mustBeNumber: z.number(),
      });

      // Has null that will be transformed, but still missing required field
      const json = '{"required": "value"}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("edge cases with type inference", () => {
    it("should handle schema with optional fields", () => {
      const schema = z
        .object({
          value: z.string().optional(),
        })
        .passthrough();
      const json = '{"value": "test"}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(typeof data).toBe("object");
        expect(data.value).toBe("test");
      }
    });

    it("should handle literal types in schema", () => {
      const schema = z.object({
        status: z.literal("active"),
        type: z.literal(42),
      });

      const json = '{"status": "active", "type": 42}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.status).toBe("active");
        expect(data.type).toBe(42);
      }
    });

    it("should handle tuple schema", () => {
      const schema = z.tuple([z.string(), z.number(), z.boolean()]);
      const json = '["text", 42, true]';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data[0]).toBe("text");
        expect(data[1]).toBe(42);
        expect(data[2]).toBe(true);
      }
    });

    it("should handle union of primitives", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number(), z.boolean()]),
      });

      const json = '{"value": "text"}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.value).toBe("text");
      }
    });

    it("should handle enum schema", () => {
      const schema = z.object({
        role: z.enum(["admin", "user", "guest"]),
      });

      const json = '{"role": "admin"}';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.role).toBe("admin");
      }
    });
  });

  describe("performance and mutation tracking", () => {
    it("should track mutation steps without losing type information", () => {
      const schema = z.object({
        name: z.string(),
        value: z.string().optional(),
      });

      // JSON that requires transforms (null -> undefined)
      const json = '```json\n{"name": "test", "value": null}\n```';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        expect(data.name).toBe("test");
        expect(data.value).toBeUndefined();

        // Mutation steps should be tracked
        expect(Array.isArray(result.repairs)).toBe(true);
        expect(result.repairs.length).toBeGreaterThan(0);
      }
    });

    it("should maintain type safety through multiple transforms", () => {
      const schema = z.object({
        name: z.string(),
        count: z.number(),
        items: z.array(z.string()),
      });

      // JSON with null that can be transformed to  undefined
      const json = '```json\n{"name": "test", "count": 10, "items": ["a", "b"]}\n```';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(json, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data: z.infer<typeof schema> = result.data;
        // Type is preserved throughout transforms
        expect(typeof data.name).toBe("string");
        expect(typeof data.count).toBe("number");
        expect(Array.isArray(data.items)).toBe(true);
      }
    });
  });
});
