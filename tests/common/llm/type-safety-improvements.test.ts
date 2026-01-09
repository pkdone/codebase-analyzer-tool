import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import {
  LLMOutputFormat,
  LLMPurpose,
  InferResponseType,
} from "../../../src/common/llm/types/llm.types";
import { processJson } from "../../../src/common/llm/json-processing/core/json-processing";

// Mock dependencies
jest.mock("../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../src/common/llm/tracking/llm-telemetry-tracker");
jest.mock("../../../src/common/llm/utils/manifest-loader");

/**
 * Test suite for type safety improvements across the LLM call chain.
 * These tests verify that type information is preserved end-to-end through
 * the JSON validation pipeline without requiring unsafe type assertions.
 */
describe("Type Safety Improvements", () => {
  describe("LLMRouter - Generic Implementation", () => {
    test("should preserve type information through generic implementation", () => {
      // This is a compile-time test - if it compiles, the types are working correctly
      const _testSchema = z.object({
        name: z.string(),
        count: z.number(),
      });

      interface TestOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _testSchema;
      }

      // Verify InferResponseType correctly extracts the schema type
      type InferredType = InferResponseType<TestOptions>;

      // This should compile without errors
      const testValue: InferredType = { name: "test", count: 42 };
      expect(testValue.name).toBe("test");
      expect(testValue.count).toBe(42);
    });

    test("should infer string type for TEXT output format", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      // InferResponseType should now resolve to string (not LLMGeneratedContent)
      type InferredType = InferResponseType<TextOptions>;

      // Should be string type, allowing direct string operations
      const textValue: InferredType = "some text";
      expect(textValue).toBe("some text");

      // Verify it's actually typed as string (compile-time check)
      const upperCased: string = textValue.toUpperCase();
      expect(upperCased).toBe("SOME TEXT");
    });

    test("should handle options without schema - JSON format", () => {
      interface NoSchemaOptions {
        outputFormat: LLMOutputFormat.JSON;
      }

      // Without schema, should default to Record<string, unknown>
      type InferredType = InferResponseType<NoSchemaOptions>;

      // Should accept Record<string, unknown>
      const jsonValue: InferredType = { key: "value" };
      expect(jsonValue).toEqual({ key: "value" });
    });

    test("should differentiate TEXT from JSON format in type inference", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      interface JsonOptions {
        outputFormat: LLMOutputFormat.JSON;
      }

      type TextType = InferResponseType<TextOptions>;
      type JsonType = InferResponseType<JsonOptions>;

      // TEXT should be string
      const textResult: TextType = "text response";
      expect(typeof textResult).toBe("string");

      // JSON should be Record<string, unknown>
      const jsonResult: JsonType = { result: "data" };
      expect(typeof jsonResult).toBe("object");

      // These types should be different at compile time
      // The following would be compile errors (uncomment to verify):
      // const wrongAssignment1: TextType = { object: "value" };
      // const wrongAssignment2: JsonType = "string value";
    });

    test("should work with template strings for TEXT format without casting", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      const response: InferredType = "LLM response";

      // Should work in template strings without 'as string' cast
      const formatted = `Result: ${response}`;
      expect(formatted).toBe("Result: LLM response");
    });
  });

  describe("processJson - Type Preservation", () => {
    test("should preserve types when schema is provided", () => {
      const testSchema = z.object({
        purpose: z.string(),
        count: z.number().optional(),
      });

      const context = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const jsonContent = '{"purpose": "test purpose", "count": 5}';

      const result = processJson(
        jsonContent,
        context,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
        false, // disable logging
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Type should be inferred from schema
        expect(result.data.purpose).toBe("test purpose");
        expect(result.data.count).toBe(5);
      }
    });

    test("should return Record<string, unknown> when no schema provided", () => {
      const context = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const jsonContent = '{"anyKey": "anyValue", "number": 123}';

      const result = processJson(
        jsonContent,
        context,
        {
          outputFormat: LLMOutputFormat.JSON,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Should be Record<string, unknown>
        expect(result.data).toEqual({ anyKey: "anyValue", number: 123 });
      }
    });

    test("should handle schema validation failure gracefully", () => {
      const strictSchema = z.object({
        required: z.string(),
        mustBeNumber: z.number(),
      });

      const context = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      // Missing required field
      const jsonContent = '{"required": "test"}';

      const result = processJson(
        jsonContent,
        context,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: strictSchema,
        },
        false,
      );

      expect(result.success).toBe(false);
    });
  });

  // Note: Full runtime validation tests for file-summarizer are in
  // tests/features/capture/file-summarizer-schema-validation.test.ts

  // Note: Full runtime tests for insights-completion-executor type inference are covered
  // by integration tests and existing component tests

  describe("End-to-End Type Safety", () => {
    test("should maintain type safety through entire call chain", () => {
      // This test verifies that types flow correctly from schema definition
      // through to the final return type without unsafe assertions

      const _userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
        roles: z.array(z.string()).optional(),
      });

      interface UserOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _userSchema;
      }

      // InferResponseType should produce the correct type
      type InferredUser = InferResponseType<UserOptions>;

      // Should compile without errors and maintain all type information
      const user: InferredUser = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        roles: ["admin", "user"],
      };

      expect(user.id).toBe(1);
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");
      expect(user.roles).toEqual(["admin", "user"]);
    });

    test("should handle optional fields in inferred types", () => {
      const _profileSchema = z.object({
        username: z.string(),
        bio: z.string().optional(),
        age: z.number().optional(),
      });

      interface ProfileOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _profileSchema;
      }

      type InferredProfile = InferResponseType<ProfileOptions>;

      // Should accept profiles with or without optional fields
      const minimalProfile: InferredProfile = {
        username: "testuser",
      };

      const fullProfile: InferredProfile = {
        username: "testuser",
        bio: "Test bio",
        age: 25,
      };

      expect(minimalProfile.username).toBe("testuser");
      expect(fullProfile.bio).toBe("Test bio");
    });

    test("should handle nested object types", () => {
      const _addressSchema = z.object({
        street: z.string(),
        city: z.string(),
        country: z.string(),
      });

      const _personSchema = z.object({
        name: z.string(),
        address: _addressSchema,
        secondaryAddresses: z.array(_addressSchema).optional(),
      });

      interface PersonOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _personSchema;
      }

      type InferredPerson = InferResponseType<PersonOptions>;

      const person: InferredPerson = {
        name: "Jane Smith",
        address: {
          street: "123 Main St",
          city: "Boston",
          country: "USA",
        },
        secondaryAddresses: [
          {
            street: "456 Oak Ave",
            city: "Cambridge",
            country: "USA",
          },
        ],
      };

      expect(person.address.city).toBe("Boston");
      expect(person.secondaryAddresses?.[0].street).toBe("456 Oak Ave");
    });
  });

  describe("Type Safety Regression Prevention", () => {
    test("should prevent unsafe casts by maintaining strong types", () => {
      // This test documents the improvement - previously unsafe casts are no longer needed
      const _schema = z.object({
        value: z.string(),
      });

      interface Options {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _schema;
      }

      // Type is correctly inferred without needing 'as' assertions
      type Inferred = InferResponseType<Options>;

      const result: Inferred = { value: "test" };

      // TypeScript ensures type safety at compile time
      expect(result.value).toBe("test");

      // The following would be a compile-time error (uncomment to verify):
      // const invalid: Inferred = { wrongKey: "test" };
    });

    test("should catch type mismatches at compile time", () => {
      const _strictSchema = z.object({
        id: z.number(),
        status: z.enum(["active", "inactive"]),
      });

      interface StrictOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _strictSchema;
      }

      type StrictInferred = InferResponseType<StrictOptions>;

      // Valid assignment
      const valid: StrictInferred = { id: 1, status: "active" };
      expect(valid.status).toBe("active");

      // The following would be compile-time errors (commented out for test):
      // const invalidStatus: StrictInferred = { id: 1, status: "pending" };
      // const invalidType: StrictInferred = { id: "one", status: "active" };
    });

    test("should eliminate need for double validation", () => {
      // Previously, file-summarizer.ts needed double validation due to weak typing
      // Now with generic LLMCompletionOptions, single validation is sufficient
      const _schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
      });

      interface OptionsWithSchema {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _schema;
      }

      type InferredType = InferResponseType<OptionsWithSchema>;

      // The type is correctly inferred without additional validation
      const result: InferredType = {
        purpose: "Test purpose",
        implementation: "Test implementation",
      };

      expect(result.purpose).toBe("Test purpose");
      expect(result.implementation).toBe("Test implementation");

      // No need for 'as unknown as SomeType' or additional safeParse()
    });

    test("should work with picked schemas", () => {
      // File-summarizer uses .pick() to optimize prompts
      const fullSchema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        complexity: z.number().optional(),
        dependencies: z.array(z.string()).optional(),
      });

      const _pickedSchema = fullSchema.pick({
        purpose: true,
        implementation: true,
      });

      interface PickedOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _pickedSchema;
      }

      type PickedType = InferResponseType<PickedOptions>;

      const result: PickedType = {
        purpose: "Purpose",
        implementation: "Implementation",
      };

      expect(result.purpose).toBe("Purpose");

      // Compile-time check: picked fields are present
      const _p: string = result.purpose;
      const _i: string = result.implementation;
      expect(_p).toBeDefined();
      expect(_i).toBeDefined();

      // Compile-time check: unpicked fields are not present
      // The following would be compile-time errors:
      // const _c: number | undefined = result.complexity;
      // const _d: string[] | undefined = result.dependencies;
    });
  });

  describe("Generic LLMCompletionOptions Benefits", () => {
    test("should maintain type through generic parameter", () => {
      const _testSchema = z.object({
        count: z.number(),
        items: z.array(z.string()),
      });

      // LLMCompletionOptions is now generic over schema type
      interface GenericOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _testSchema;
      }

      type ResultType = InferResponseType<GenericOptions>;

      const data: ResultType = {
        count: 5,
        items: ["a", "b", "c"],
      };

      expect(data.count).toBe(5);
      expect(data.items).toHaveLength(3);
    });

    test("should work with default generic parameter", () => {
      // LLMCompletionOptions<S extends z.ZodType = z.ZodType>
      // The default allows backward compatibility
      interface DefaultOptions {
        outputFormat: LLMOutputFormat.JSON;
      }

      // Without explicit schema, should default to Record<string, unknown>
      type DefaultType = InferResponseType<DefaultOptions>;

      const result: DefaultType = { any: "data", here: 123 };
      expect(result.any).toBe("data");
      expect(result.here).toBe(123);
    });
  });
});
