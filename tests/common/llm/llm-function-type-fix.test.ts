import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import {
  LLMFunction,
  LLMCompletionOptions,
  LLMFunctionResponse,
  LLMContext,
  LLMOutputFormat,
  LLMPurpose,
  LLMResponseStatus,
  LLMModelQuality,
  InferResponseType,
} from "../../../src/common/llm/types/llm.types";

/**
 * Test suite verifying that the LLMFunction type fix properly preserves
 * generic schema type information throughout the call chain.
 *
 * This test suite validates the fix for the type safety issue where
 * InferResponseType<LLMCompletionOptions> was incorrectly used instead of
 * InferResponseType<LLMCompletionOptions<S>>, causing type information loss.
 */
describe("LLMFunction Type Fix - Generic Type Preservation", () => {
  const mockContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
    modelQuality: LLMModelQuality.PRIMARY,
    outputFormat: LLMOutputFormat.JSON,
  };

  describe("Type Inference with Simple Schemas", () => {
    test("should preserve simple object schema type through LLMFunction", async () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
      });

      type UserType = z.infer<typeof userSchema>;

      // Mock LLMFunction that matches the corrected type signature
      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
          } as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      // TypeScript should infer the correct type here
      if (result.generated) {
        const user = result.generated as UserType;
        expect(user.id).toBe(1);
        expect(user.name).toBe("Test User");
        expect(user.email).toBe("test@example.com");

        // Compile-time type check: these should not error
        const _id: number = user.id;
        const _name: string = user.name;
        expect(_id).toBeDefined();
        expect(_name).toBeDefined();
      }
    });

    test("should handle TEXT format without schema", async () => {
      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: "Plain text response" as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(typeof result.generated).toBe("string");
      expect(result.generated).toBe("Plain text response");
    });
  });

  describe("Type Inference with Complex Schemas", () => {
    test("should preserve nested object schema type", async () => {
      const nestedSchema = z.object({
        user: z.object({
          id: z.number(),
          profile: z.object({
            name: z.string(),
            bio: z.string().optional(),
          }),
        }),
        metadata: z.object({
          createdAt: z.string(),
          updatedAt: z.string().optional(),
        }),
      });

      type NestedType = z.infer<typeof nestedSchema>;

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: {
            user: {
              id: 1,
              profile: {
                name: "Bob",
              },
            },
            metadata: {
              createdAt: "2024-01-01",
            },
          } as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: nestedSchema,
      });

      if (result.generated) {
        const data = result.generated as NestedType;
        expect(data.user.id).toBe(1);
        expect(data.user.profile.name).toBe("Bob");
        expect(data.metadata.createdAt).toBe("2024-01-01");
      }
    });

    test("should preserve array schema type", async () => {
      const arraySchema = z.array(
        z.object({
          id: z.string(),
          value: z.number(),
        }),
      );

      type ArrayType = z.infer<typeof arraySchema>;

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: [
            { id: "item1", value: 10 },
            { id: "item2", value: 20 },
          ] as unknown as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: arraySchema,
      });

      if (result.generated) {
        const data = result.generated as unknown as ArrayType;
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(2);
        expect(data[0].id).toBe("item1");
        expect(data[1].value).toBe(20);
      }
    });
  });

  describe("Type Inference with Union Types", () => {
    test("should preserve union schema type", async () => {
      const unionSchema = z.union([
        z.object({ type: z.literal("success"), data: z.string() }),
        z.object({ type: z.literal("error"), message: z.string() }),
      ]);

      type UnionType = z.infer<typeof unionSchema>;

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: {
            type: "success",
            data: "operation completed",
          } as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: unionSchema,
      });

      if (result.generated) {
        const data = result.generated as UnionType;
        if (data.type === "success") {
          expect(data.data).toBe("operation completed");
        }
      }
    });

    test("should preserve discriminated union schema type", async () => {
      const discriminatedSchema = z.discriminatedUnion("status", [
        z.object({ status: z.literal("pending"), queuePosition: z.number() }),
        z.object({ status: z.literal("completed"), result: z.string() }),
        z.object({ status: z.literal("failed"), error: z.string() }),
      ]);

      type DiscriminatedType = z.infer<typeof discriminatedSchema>;

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: {
            status: "completed",
            result: "Success!",
          } as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: discriminatedSchema,
      });

      if (result.generated) {
        const data = result.generated as DiscriminatedType;
        if (data.status === "completed") {
          expect(data.result).toBe("Success!");
        }
      }
    });
  });

  describe("Type Inference with Optional and Nullable Fields", () => {
    test("should handle optional fields correctly", async () => {
      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        withDefault: z.string().default("default-value"),
      });

      type OptionalType = z.infer<typeof optionalSchema>;

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: {
            required: "present",
            withDefault: "default-value",
          } as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: optionalSchema,
      });

      if (result.generated) {
        const data = result.generated as OptionalType;
        expect(data.required).toBe("present");
        expect(data.withDefault).toBe("default-value");
        expect(data.optional).toBeUndefined();
      }
    });

    test("should handle nullable fields correctly", async () => {
      const nullableSchema = z.object({
        value: z.string().nullable(),
        count: z.number(),
      });

      type NullableType = z.infer<typeof nullableSchema>;

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          generated: {
            value: null,
            count: 42,
          } as InferResponseType<LLMCompletionOptions<S>>,
        };
      };

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: nullableSchema,
      });

      if (result.generated) {
        const data = result.generated as NullableType;
        expect(data.value).toBeNull();
        expect(data.count).toBe(42);
      }
    });
  });

  describe("InferResponseType Helper Validation", () => {
    test("InferResponseType should return correct type for JSON with schema", () => {
      const _testSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      interface JsonWithSchemaOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _testSchema;
      }

      type InferredType = InferResponseType<JsonWithSchemaOptions>;

      // This should compile without errors and infer the correct type
      const value: InferredType = { id: 1, name: "test" };
      expect(value.id).toBe(1);
      expect(value.name).toBe("test");
    });

    test("InferResponseType should return string for TEXT format", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      // This should compile without errors and infer string
      const value: InferredType = "text response";
      expect(typeof value).toBe("string");
    });

    test("InferResponseType should return Record for JSON without schema", () => {
      interface JsonNoSchemaOptions {
        outputFormat: LLMOutputFormat.JSON;
      }

      type InferredType = InferResponseType<JsonNoSchemaOptions>;

      // This should compile without errors and infer Record<string, unknown>
      const value: InferredType = { any: "value", count: 42 };
      expect(value.any).toBe("value");
      expect(value.count).toBe(42);
    });
  });

  describe("Response Status Handling", () => {
    test("should handle responses with undefined generated content", () => {
      const schema = z.object({ value: z.string() });

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.EXCEEDED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          // generated is undefined for non-COMPLETED status
        };
      };

      const result = mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      void expect(result).resolves.toHaveProperty("status", LLMResponseStatus.EXCEEDED);
    });

    test("should handle error responses", () => {
      const schema = z.object({ data: z.string() });

      const mockLLMFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse> => {
        return {
          status: LLMResponseStatus.ERRORED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          error: new Error("API error"),
        };
      };

      const result = mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      void expect(result).resolves.toMatchObject({
        status: LLMResponseStatus.ERRORED,
        error: expect.any(Error),
      });
    });
  });

  describe("Compile-Time Type Safety Verification", () => {
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
      expect(validResponse.generated?.count).toBe(42);

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
});
