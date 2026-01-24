import { z } from "zod";
import { parseAndValidateLLMJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import {
  LLMOutputFormat,
  LLMPurpose,
  type LLMContext,
  type LLMCompletionOptions,
} from "../../../../src/common/llm/types/llm-request.types";

describe("Simplified Type Chain - parseAndValidateLLMJson", () => {
  const mockContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
  };

  describe("Type inference with provided schema", () => {
    it("should infer type from simple object schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const content = JSON.stringify({ name: "Alice", age: 30 });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Type check: result.data should be inferred as { name: string; age: number }
        const typedData: z.infer<typeof schema> = result.data;
        expect(typedData.name).toBe("Alice");
        expect(typedData.age).toBe(30);
      }
    });

    it("should infer type from nested object schema", () => {
      const schema = z.object({
        user: z.object({
          id: z.string(),
          profile: z.object({
            email: z.string(),
          }),
        }),
      });

      const content = JSON.stringify({
        user: { id: "123", profile: { email: "test@example.com" } },
      });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Type check: nested structure should be properly typed
        const typedData: z.infer<typeof schema> = result.data;
        expect(typedData.user.id).toBe("123");
        expect(typedData.user.profile.email).toBe("test@example.com");
      }
    });

    it("should infer type from array schema", () => {
      const schema = z.object({
        items: z.array(
          z.object({
            name: z.string(),
            value: z.number(),
          }),
        ),
      });

      const content = JSON.stringify({
        items: [
          { name: "item1", value: 10 },
          { name: "item2", value: 20 },
        ],
      });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Type check: array items should be properly typed
        const typedData: z.infer<typeof schema> = result.data;
        expect(typedData.items).toHaveLength(2);
        expect(typedData.items[0].name).toBe("item1");
        expect(typedData.items[0].value).toBe(10);
      }
    });

    it("should infer type with optional fields", () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const content = JSON.stringify({ required: "value" });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Type check: optional field should be string | undefined
        const typedData: z.infer<typeof schema> = result.data;
        expect(typedData.required).toBe("value");
        expect(typedData.optional).toBeUndefined();

        // TypeScript should allow accessing optional without null check
        const optionalValue: string | undefined = typedData.optional;
        expect(optionalValue).toBeUndefined();
      }
    });

    it("should infer union types correctly", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      const content = JSON.stringify({ value: "text" });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Type check: union type should be inferred
        const typedData: z.infer<typeof schema> = result.data;
        const unionValue: string | number = typedData.value;
        expect(unionValue).toBe("text");
      }
    });
  });

  describe("Type inference without schema (defaults to unknown)", () => {
    it("should default to unknown when no schema provided", () => {
      const content = JSON.stringify({ any: "data", here: 123 });
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Type is now 'unknown' - consumers must cast for property access.
        // This is the correct type-safe behavior: without a schema, we don't
        // know the shape at compile time.
        const typedData = result.data as Record<string, unknown>;
        expect(typedData.any).toBe("data");
        expect(typedData.here).toBe(123);
      }
    });

    it("should handle arbitrary JSON structure without schema", () => {
      const content = JSON.stringify({
        nested: {
          deeply: {
            structure: [1, 2, 3],
          },
        },
      });
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Type is 'unknown' - cast to access properties
        const typedData = result.data as Record<string, unknown>;
        expect(typedData.nested).toBeDefined();
      }
    });
  });

  describe("Validation failures preserve type information", () => {
    it("should return failure when data does not match schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      // Invalid: age is a string instead of number
      const content = JSON.stringify({ name: "Alice", age: "thirty" });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      // Type narrowing: if success is false, error is present
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.type).toBe("validation");
      }
    });

    it("should handle missing required fields", () => {
      const schema = z.object({
        required1: z.string(),
        required2: z.number(),
      });

      // Invalid: missing required2
      const content = JSON.stringify({ required1: "value" });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("Transform steps are tracked", () => {
    it("should track applied transforms in successful validation", () => {
      const schema = z.object({
        name: z.string(),
        value: z.string().optional(),
      });

      // Content with null (will be transformed to undefined)
      const content = JSON.stringify({ name: "test", value: null });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // Should have applied transforms
        expect(result.repairs.length).toBeGreaterThan(0);
        expect(result.data.name).toBe("test");
        expect(result.data.value).toBeUndefined();
      }
    });

    it("should return empty mutation steps when no transforms needed", () => {
      const schema = z.object({
        name: z.string(),
      });

      const content = JSON.stringify({ name: "test" });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // No transforms should be needed
        expect(result.repairs).toEqual([]);
        expect(result.data.name).toBe("test");
      }
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle non-string content", () => {
      const schema = z.object({ data: z.string() });
      const content = { not: "a string" } as unknown as string;
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("not a string");
      }
    });

    it("should handle content without JSON structure", () => {
      const schema = z.object({ data: z.string() });
      const content = "This is plain text without any JSON";
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("no JSON structure");
      }
    });

    it("should handle malformed JSON", () => {
      const schema = z.object({ data: z.string() });
      const content = '{ "data": "value", }'; // Trailing comma
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      // Should either succeed (after sanitization) or fail gracefully
      if (result.success) {
        expect(result.data.data).toBe("value");
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("Generic type parameter flow", () => {
    // This test verifies compile-time type safety
    it("should maintain type safety through generic parameter", () => {
      const userSchema = z.object({
        username: z.string(),
        email: z.string().email(),
      });

      // Type is preserved through the generic parameter S
      type UserType = z.infer<typeof userSchema>;

      const content = JSON.stringify({
        username: "john_doe",
        email: "john@example.com",
      });

      const options: LLMCompletionOptions<typeof userSchema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      };

      const result = parseAndValidateLLMJson(content, mockContext, options);

      if (result.success) {
        // This assignment should compile without type assertions
        const user: UserType = result.data;
        expect(user.username).toBe("john_doe");
        expect(user.email).toBe("john@example.com");

        // TypeScript should catch type errors at compile time
        // @ts-expect-error - accessing non-existent property should fail
        const nonExistent = user.nonExistentProperty;
        expect(nonExistent).toBeUndefined();
      }
    });
  });
});
