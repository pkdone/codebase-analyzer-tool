import "reflect-metadata";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { z } from "zod";
import {
  LLMOutputFormat,
  LLMPurpose,
  LLMResponseStatus,
  LLMModelQuality,
  type LLMFunctionResponse,
  type LLMContext,
} from "../../../src/common/llm/types/llm.types";

// Mock dependencies
jest.mock("../../../src/common/utils/logging", () => ({
  logOneLineWarning: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../src/common/llm/tracking/llm-stats");

/**
 * Test suite for type safety through the entire LLM call chain.
 * These tests verify that type information is preserved from schema definition
 * through all layers of the call stack without requiring unsafe casts.
 */
describe("LLM Call Chain Type Safety", () => {
  const mockContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
    modelQuality: LLMModelQuality.PRIMARY,
    outputFormat: LLMOutputFormat.JSON,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Type Flow Through Call Chain", () => {
    test("should preserve simple schema type through mock LLM function", () => {
      const _userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
      });

      // Mock LLM function that returns typed response
      const mockResponse: LLMFunctionResponse<z.infer<typeof _userSchema>> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: {
          id: 1,
          name: "Test User",
          email: "test@example.com",
        },
      };

      // Verify type inference
      expect(mockResponse.generated?.id).toBe(1);
      expect(mockResponse.generated?.name).toBe("Test User");

      // Compile-time type check
      if (mockResponse.generated) {
        const _id: number = mockResponse.generated.id;
        const _name: string = mockResponse.generated.name;
        expect(_id).toBeDefined();
        expect(_name).toBeDefined();
      }
    });

    test("should handle complex nested schemas in response", () => {
      const _complexSchema = z.object({
        metadata: z.object({
          version: z.number(),
          timestamp: z.string(),
        }),
        data: z.object({
          items: z.array(
            z.object({
              id: z.string(),
              count: z.number(),
            }),
          ),
          total: z.number(),
        }),
      });

      type ComplexType = z.infer<typeof _complexSchema>;

      const mockResponse: LLMFunctionResponse<ComplexType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: {
          metadata: {
            version: 1,
            timestamp: "2024-01-01T00:00:00Z",
          },
          data: {
            items: [
              { id: "item1", count: 5 },
              { id: "item2", count: 10 },
            ],
            total: 15,
          },
        },
      };

      expect(mockResponse.generated?.metadata.version).toBe(1);
      expect(mockResponse.generated?.data.items).toHaveLength(2);
      expect(mockResponse.generated?.data.total).toBe(15);
    });

    test("should handle TEXT format responses correctly", () => {
      const mockTextResponse: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: { ...mockContext, outputFormat: LLMOutputFormat.TEXT },
        generated: "This is a text response",
      };

      // Type should be string, not LLMGeneratedContent
      expect(typeof mockTextResponse.generated).toBe("string");

      // Compile-time check: should be able to use string methods
      if (mockTextResponse.generated) {
        const upperCase: string = mockTextResponse.generated.toUpperCase();
        expect(upperCase).toBe("THIS IS A TEXT RESPONSE");
      }
    });

    test("should handle optional fields in schema", () => {
      const _optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.number().nullable(),
      });

      type OptionalType = z.infer<typeof _optionalSchema>;

      const mockResponse: LLMFunctionResponse<OptionalType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: {
          required: "present",
          nullable: null,
        },
      };

      expect(mockResponse.generated?.required).toBe("present");
      expect(mockResponse.generated?.optional).toBeUndefined();
      expect(mockResponse.generated?.nullable).toBeNull();
    });
  });

  describe("Union and Intersection Types", () => {
    test("should handle union types in schema", () => {
      const _unionSchema = z.union([
        z.object({ type: z.literal("success"), data: z.string() }),
        z.object({ type: z.literal("error"), message: z.string() }),
      ]);

      type UnionType = z.infer<typeof _unionSchema>;

      const successResponse: LLMFunctionResponse<UnionType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: {
          type: "success",
          data: "operation completed",
        },
      };

      if (successResponse.generated?.type === "success") {
        expect(successResponse.generated.data).toBe("operation completed");
      }

      const errorResponse: LLMFunctionResponse<UnionType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: {
          type: "error",
          message: "something went wrong",
        },
      };

      if (errorResponse.generated?.type === "error") {
        expect(errorResponse.generated.message).toBe("something went wrong");
      }
    });

    test("should handle discriminated union types", () => {
      const _discriminatedSchema = z.discriminatedUnion("status", [
        z.object({ status: z.literal("pending"), queuePosition: z.number() }),
        z.object({ status: z.literal("completed"), result: z.string() }),
        z.object({ status: z.literal("failed"), error: z.string() }),
      ]);

      type DiscriminatedType = z.infer<typeof _discriminatedSchema>;

      const response: LLMFunctionResponse<DiscriminatedType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: {
          status: "completed",
          result: "Success!",
        },
      };

      if (response.generated?.status === "completed") {
        // TypeScript should narrow the type automatically
        const _result: string = response.generated.result;
        expect(_result).toBe("Success!");
      }
    });
  });

  describe("Response Status Handling", () => {
    test("should handle null generated content gracefully", () => {
      const _schema = z.object({ value: z.string() });
      type SchemaType = z.infer<typeof _schema>;

      const responseWithoutGenerated: LLMFunctionResponse<SchemaType> = {
        status: LLMResponseStatus.EXCEEDED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        // generated is undefined for non-COMPLETED status
      };

      expect(responseWithoutGenerated.status).toBe(LLMResponseStatus.EXCEEDED);
      expect(responseWithoutGenerated.generated).toBeUndefined();
    });

    test("should handle error responses", () => {
      const _schema = z.object({ data: z.string() });
      type SchemaType = z.infer<typeof _schema>;

      const errorResponse: LLMFunctionResponse<SchemaType> = {
        status: LLMResponseStatus.ERRORED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        error: new Error("API error"),
      };

      expect(errorResponse.status).toBe(LLMResponseStatus.ERRORED);
      expect(errorResponse.error).toBeInstanceOf(Error);
      expect(errorResponse.generated).toBeUndefined();
    });
  });

  describe("Compile-Time Type Safety", () => {
    test("should prevent incorrect type assignments at compile time", () => {
      const _stringSchema = z.object({
        name: z.string(),
        count: z.number(),
      });

      type StringSchemaType = z.infer<typeof _stringSchema>;

      // Valid assignment
      const validResponse: LLMFunctionResponse<StringSchemaType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: mockContext,
        generated: {
          name: "test",
          count: 42,
        },
      };

      expect(validResponse.generated?.name).toBe("test");

      // The following would be compile-time errors (commented for test):
      // const invalidResponse: LLMFunctionResponse<StringSchemaType> = {
      //   status: LLMResponseStatus.COMPLETED,
      //   request: "test",
      //   modelKey: "test-model",
      //   context: mockContext,
      //   generated: {
      //     name: 123, // Error: Type 'number' is not assignable to type 'string'
      //     count: "42", // Error: Type 'string' is not assignable to type 'number'
      //   },
      // };
    });

    test("should maintain type information through null handling", () => {
      const _schema = z.object({
        value: z.string(),
      });

      type SchemaType = z.infer<typeof _schema>;

      // Response can be null (from executeCompletion)
      const response: SchemaType | null = {
        value: "test",
      };

      // TypeScript correctly infers the type
      expect(response).not.toBeNull();
      const _value: string = response.value;
      expect(_value).toBe("test");

      const nullResponse: SchemaType | null = null;
      expect(nullResponse).toBeNull();
    });
  });

  describe("Array Schema Types", () => {
    test("should handle array of objects correctly", () => {
      const _arraySchema = z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          active: z.boolean(),
        }),
      );

      type ArrayType = z.infer<typeof _arraySchema>;

      const response: LLMFunctionResponse<ArrayType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: [
          { id: "1", name: "First", active: true },
          { id: "2", name: "Second", active: false },
        ],
      };

      expect(response.generated).toHaveLength(2);
      if (response.generated) {
        expect(response.generated[0].id).toBe("1");
        expect(response.generated[1].active).toBe(false);
      }
    });

    test("should handle empty arrays", () => {
      const _arraySchema = z.array(z.string());
      type ArrayType = z.infer<typeof _arraySchema>;

      const response: LLMFunctionResponse<ArrayType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        generated: [],
      };

      expect(response.generated).toEqual([]);
      expect(Array.isArray(response.generated)).toBe(true);
    });
  });
});
