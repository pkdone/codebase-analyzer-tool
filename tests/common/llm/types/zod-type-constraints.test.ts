import { z } from "zod";
import type { LLMCompletionOptions } from "../../../../src/common/llm/types/llm-request.types";
import { LLMOutputFormat } from "../../../../src/common/llm/types/llm-request.types";
import type { ValidationWithTransformsResult } from "../../../../src/common/llm/json-processing/core/json-validating";
import type { GeneratedPrompt } from "../../../../src/common/prompts/types";

/**
 * Type-level tests for ZodType<unknown> constraints.
 *
 * These tests verify compile-time type safety. A test "passes" if the file
 * compiles without type errors. The runtime assertions serve as documentation
 * and verify that the types work correctly at runtime as well.
 */
describe("ZodType<unknown> type constraints", () => {
  describe("LLMCompletionOptions", () => {
    it("should default to unknown when no schema is specified", () => {
      // When no generic is provided, the inferred type should be z.ZodType<unknown>
      // This means consumers must handle the untyped data explicitly
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      // This test passes at compile time - the options type is
      // LLMCompletionOptions<z.ZodType<unknown>>
      expect(options).toBeDefined();
      expect(options.outputFormat).toBe(LLMOutputFormat.JSON);
    });

    it("should preserve specific schema types when provided", () => {
      const userSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const options: LLMCompletionOptions<typeof userSchema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      };

      // TypeScript infers the schema type correctly
      expect(options.jsonSchema).toBeDefined();
      expect(options.jsonSchema).toBe(userSchema);
    });

    it("should allow complex nested schema types", () => {
      const addressSchema = z.object({
        street: z.string(),
        city: z.string(),
        country: z.string(),
      });

      const personSchema = z.object({
        name: z.string(),
        addresses: z.array(addressSchema),
        metadata: z.record(z.string(), z.unknown()),
      });

      const options: LLMCompletionOptions<typeof personSchema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: personSchema,
      };

      expect(options.jsonSchema).toBeDefined();
    });
  });

  describe("GeneratedPrompt", () => {
    it("should default to unknown when no schema is specified", () => {
      // When GeneratedPrompt is used without a type parameter,
      // schema should be typed as z.ZodType<unknown>
      const prompt: GeneratedPrompt = {
        prompt: "Analyze this code...",
        schema: z.string(),
      };

      expect(prompt).toBeDefined();
      expect(prompt.prompt).toBe("Analyze this code...");
    });

    it("should preserve specific schema types when provided", () => {
      const responseSchema = z.object({ result: z.boolean() });

      const prompt: GeneratedPrompt<typeof responseSchema> = {
        prompt: "Check if valid...",
        schema: responseSchema,
      };

      // The schema type is preserved
      expect(prompt.schema).toBeDefined();
      expect(prompt.schema).toBe(responseSchema);
    });

    it("should allow optional metadata", () => {
      const schema = z.object({ value: z.number() });

      const promptWithMetadata: GeneratedPrompt<typeof schema> = {
        prompt: "Calculate...",
        schema,
        metadata: { hasComplexSchema: true },
      };

      const promptWithoutMetadata: GeneratedPrompt<typeof schema> = {
        prompt: "Calculate...",
        schema,
      };

      expect(promptWithMetadata.metadata?.hasComplexSchema).toBe(true);
      expect(promptWithoutMetadata.metadata).toBeUndefined();
    });
  });

  describe("ValidationWithTransformsResult", () => {
    /**
     * Helper to create a test result and verify type narrowing works.
     * This function simulates what a real validation function would return.
     */
    function createSuccessResult<T>(data: T): ValidationWithTransformsResult<T> {
      return {
        success: true,
        data,
        transformRepairs: [],
      };
    }

    function createFailureResult<T>(issues: z.ZodIssue[]): ValidationWithTransformsResult<T> {
      return {
        success: false,
        issues,
        transformRepairs: ["someTransform"],
      };
    }

    it("should provide typed data on successful validation", () => {
      interface UserType {
        name: string;
        age: number;
      }

      const result = createSuccessResult<UserType>({ name: "Test", age: 25 });

      // Type narrowing via success check
      if (result.success) {
        // TypeScript should know data is { name: string; age: number }
        const name: string = result.data.name;
        const age: number = result.data.age;
        expect(name).toBe("Test");
        expect(age).toBe(25);
      } else {
        // This branch should never execute, but verifies type narrowing
        expect(result.issues).toBeDefined();
      }
    });

    it("should provide issues on failed validation", () => {
      interface UserType {
        name: string;
        age: number;
      }

      const result = createFailureResult<UserType>([
        {
          code: z.ZodIssueCode.invalid_type,
          expected: "number",
          received: "string",
          path: ["age"],
          message: "Expected number, received string",
        },
      ]);

      if (!result.success) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].path).toEqual(["age"]);
        expect(result.transformRepairs).toContain("someTransform");
      } else {
        // This branch should never execute, but verifies type narrowing
        expect(result.data).toBeDefined();
      }
    });

    it("should work with complex nested types", () => {
      interface ComplexType {
        items: { id: number; value: string }[];
        metadata: Record<string, unknown>;
      }

      const result = createSuccessResult<ComplexType>({
        items: [{ id: 1, value: "first" }],
        metadata: { key: "value" },
      });

      if (result.success) {
        expect(result.data.items[0].id).toBe(1);
        expect(result.data.items[0].value).toBe("first");
        expect(result.data.metadata.key).toBe("value");
      } else {
        expect(result.issues).toBeDefined();
      }
    });
  });

  describe("type constraint consistency", () => {
    it("should use consistent ZodType<unknown> constraint across all generic interfaces", () => {
      // This test verifies that using z.ZodType<unknown> as the constraint
      // allows for proper type inference with specific schemas

      const schema = z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      });

      // All these should compile and work correctly with the same schema
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const prompt: GeneratedPrompt<typeof schema> = {
        prompt: "Analyze...",
        schema,
      };

      type ResultType = z.infer<typeof schema>;

      // Create via helper to enable type narrowing
      function getValidationResult(): ValidationWithTransformsResult<ResultType> {
        return {
          success: true,
          data: { id: 1, name: "test", active: true },
          transformRepairs: [],
        };
      }

      const validationResult = getValidationResult();

      // Verify type inference works
      expect(options.jsonSchema).toBe(schema);
      expect(prompt.schema).toBe(schema);
      if (validationResult.success) {
        expect(validationResult.data.id).toBe(1);
      }
    });
  });
});
