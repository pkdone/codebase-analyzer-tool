import "reflect-metadata";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { z } from "zod";
import {
  LLMOutputFormat,
  LLMPurpose,
  type LLMExecutionContext,
} from "../../../src/common/llm/types/llm-request.types";
import {
  LLMResponseStatus,
  type LLMFunctionResponse,
  isCompletedResponse,
  isErrorResponse,
} from "../../../src/common/llm/types/llm-response.types";

// Mock dependencies
jest.mock("../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../src/common/llm/tracking/llm-execution-stats");

/**
 * Test suite for type safety through the entire LLM call chain.
 * These tests verify that type information is preserved from schema definition
 * through all layers of the call stack without requiring unsafe casts.
 */
describe("LLM Call Chain Type Safety", () => {
  const mockContext: LLMExecutionContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
    modelKey: "test-model",
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

      // Verify type inference (generated is required for COMPLETED responses)
      expect(mockResponse.generated.id).toBe(1);
      expect(mockResponse.generated.name).toBe("Test User");

      // Compile-time type check
      const _id: number = mockResponse.generated.id;
      const _name: string = mockResponse.generated.name;
      expect(_id).toBeDefined();
      expect(_name).toBeDefined();
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

      expect(mockResponse.generated.metadata.version).toBe(1);
      expect(mockResponse.generated.data.items).toHaveLength(2);
      expect(mockResponse.generated.data.total).toBe(15);
    });

    test("should handle TEXT format responses correctly", () => {
      const mockTextResponse: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: { ...mockContext, outputFormat: LLMOutputFormat.TEXT },
        generated: "This is a text response",
      };

      // Type should be string, not LLMResponsePayload
      expect(typeof mockTextResponse.generated).toBe("string");

      // Compile-time check: should be able to use string methods
      const upperCase: string = mockTextResponse.generated.toUpperCase();
      expect(upperCase).toBe("THIS IS A TEXT RESPONSE");
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

      expect(mockResponse.generated.required).toBe("present");
      expect(mockResponse.generated.optional).toBeUndefined();
      expect(mockResponse.generated.nullable).toBeNull();
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

      if (successResponse.generated.type === "success") {
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

      if (errorResponse.generated.type === "error") {
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

      if (response.generated.status === "completed") {
        // TypeScript should narrow the type automatically
        const _result: string = response.generated.result;
        expect(_result).toBe("Success!");
      }
    });
  });

  describe("Response Status Handling", () => {
    test("should handle status-only responses without generated content", () => {
      // With the discriminated union, EXCEEDED responses are LLMStatusResponse
      // which doesn't have a `generated` field at all
      const responseWithoutGenerated: LLMFunctionResponse = {
        status: LLMResponseStatus.EXCEEDED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
      };

      expect(responseWithoutGenerated.status).toBe(LLMResponseStatus.EXCEEDED);
      expect(isCompletedResponse(responseWithoutGenerated)).toBe(false);
    });

    test("should handle error responses", () => {
      const errorResponse: LLMFunctionResponse = {
        status: LLMResponseStatus.ERRORED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
        error: new Error("API error"),
      };

      expect(errorResponse.status).toBe(LLMResponseStatus.ERRORED);
      expect(isErrorResponse(errorResponse)).toBe(true);
      if (isErrorResponse(errorResponse)) {
        expect(errorResponse.error).toBeInstanceOf(Error);
      }
      expect(isCompletedResponse(errorResponse)).toBe(false);
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

      expect(validResponse.generated.name).toBe("test");

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
      expect(response.generated[0].id).toBe("1");
      expect(response.generated[1].active).toBe(false);
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

  describe("Compile-Time Type Assertions", () => {
    test("should fail at compile time for incorrect schema usage", () => {
      // These tests document the compile-time safety we now have
      const _strictSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      type StrictType = z.infer<typeof _strictSchema>;

      // Valid usage
      const validData: StrictType = {
        name: "Alice",
        age: 30,
      };

      expect(validData.name).toBe("Alice");

      // The following would fail at compile time (commented out):
      // const invalidData: StrictType = {
      //   name: 123,        // Error: Type 'number' is not assignable to type 'string'
      //   age: "30",        // Error: Type 'string' is not assignable to type 'number'
      // };

      // const missingField: StrictType = {
      //   name: "Bob",      // Error: Property 'age' is missing
      // };
    });

    test("should enforce type safety in function returns", () => {
      const _resultSchema = z.object({
        success: z.boolean(),
        data: z.string(),
      });

      type ResultType = z.infer<typeof _resultSchema>;

      // Function that returns strongly-typed result using type guard
      const processResult = (result: LLMFunctionResponse<ResultType>): string => {
        if (isCompletedResponse(result)) {
          // TypeScript knows the exact shape of generated after type guard
          return result.generated.data;
        }
        return "";
      };

      const mockResult: LLMFunctionResponse<ResultType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test",
        context: mockContext,
        generated: {
          success: true,
          data: "result",
        },
      };

      expect(processResult(mockResult)).toBe("result");
    });

    test("should support type narrowing with discriminated unions", () => {
      const _unionSchema = z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("string"), value: z.string() }),
        z.object({ kind: z.literal("number"), value: z.number() }),
      ]);

      type UnionType = z.infer<typeof _unionSchema>;

      const response: LLMFunctionResponse<UnionType> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test",
        context: mockContext,
        generated: {
          kind: "string",
          value: "text",
        },
      };

      // TypeScript should support type narrowing
      if (response.generated.kind === "string") {
        // In this branch, TypeScript knows value is string
        const _stringValue: string = response.generated.value;
        expect(_stringValue).toBe("text");
      }
    });
  });
});
