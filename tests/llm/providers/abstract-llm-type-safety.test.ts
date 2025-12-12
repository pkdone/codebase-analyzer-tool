import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
  LLMErrorMsgRegExPattern,
  LLMContext,
  LLMOutputFormat,
  LLMResponseStatus,
} from "../../../src/llm/types/llm.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderSpecificConfig,
} from "../../../src/llm/providers/llm-provider.types";
import AbstractLLM from "../../../src/llm/providers/abstract-llm";
import { createMockErrorLogger } from "../../llm/test-helpers/mock-error-logger";
import { z } from "zod";

// Test-only constants
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
const GPT_EMBEDDINGS_GPT4 = "GPT_EMBEDDINGS_GPT4";

// Test models metadata
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [GPT_EMBEDDINGS_GPT4]: {
    modelKey: GPT_EMBEDDINGS_GPT4,
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

// Test concrete class that extends AbstractLLM to test type safety
class TypeSafetyTestLLM extends AbstractLLM {
  private mockResponseContent = "";

  constructor() {
    const modelsKeys: LLMModelKeysSet = {
      embeddingsModelKey: GPT_EMBEDDINGS_GPT4,
      primaryCompletionModelKey: GPT_COMPLETIONS_GPT4_32k,
    };
    const errorPatterns: LLMErrorMsgRegExPattern[] = [];
    const providerConfig: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    };

    super(
      modelsKeys,
      testModelsMetadata,
      errorPatterns,
      providerConfig,
      "test",
      createMockErrorLogger(),
    );
  }

  setMockResponse(content: string) {
    this.mockResponseContent = content;
  }

  protected async invokeProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: this.mockResponseContent,
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 20,
        maxTotalTokens: 100,
      },
    };
  }

  protected isLLMOverloaded(): boolean {
    return false;
  }

  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

describe("Abstract LLM Type Safety", () => {
  let testLLM: TypeSafetyTestLLM;
  let testContext: LLMContext;

  beforeEach(() => {
    testLLM = new TypeSafetyTestLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };
  });

  describe("Type inference with Zod schemas", () => {
    test("should preserve type when schema with object type is provided", async () => {
      const userSchema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      type UserType = z.infer<typeof userSchema>;

      testLLM.setMockResponse('{"name": "John Doe", "age": 30, "email": "john@example.com"}');

      const result = await testLLM.executeCompletionPrimary<UserType>("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // TypeScript should infer that result.generated is UserType
        // These assertions verify the type is correct at runtime
        expect(result.generated).toHaveProperty("name");
        expect(result.generated).toHaveProperty("age");
        expect(result.generated).toHaveProperty("email");
        expect(typeof result.generated.name).toBe("string");
        expect(typeof result.generated.age).toBe("number");
        expect(typeof result.generated.email).toBe("string");
      }
    });

    test("should preserve type when schema with array type is provided", async () => {
      const itemsSchema = z.array(z.object({ id: z.number(), value: z.string() }));

      type ItemsType = z.infer<typeof itemsSchema>;

      testLLM.setMockResponse('[{"id": 1, "value": "first"}, {"id": 2, "value": "second"}]');

      const result = await testLLM.executeCompletionPrimary<ItemsType>("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: itemsSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // TypeScript should infer that result.generated is ItemsType (array)
        expect(Array.isArray(result.generated)).toBe(true);
        expect(result.generated.length).toBe(2);
        expect(result.generated[0]).toHaveProperty("id");
        expect(result.generated[0]).toHaveProperty("value");
      }
    });

    test("should preserve type when schema with union type is provided", async () => {
      const unionSchema = z.union([
        z.object({ type: z.literal("success"), data: z.string() }),
        z.object({ type: z.literal("error"), message: z.string() }),
      ]);

      type UnionType = z.infer<typeof unionSchema>;

      testLLM.setMockResponse('{"type": "success", "data": "operation completed"}');

      const result = await testLLM.executeCompletionPrimary<UnionType>("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: unionSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // TypeScript should infer that result.generated is UnionType
        expect(result.generated).toHaveProperty("type");
        if ("data" in result.generated) {
          expect(result.generated.type).toBe("success");
          expect(typeof result.generated.data).toBe("string");
        }
      }
    });

    test("should preserve type when schema with nested object is provided", async () => {
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
          updatedAt: z.string(),
        }),
      });

      type NestedType = z.infer<typeof nestedSchema>;

      testLLM.setMockResponse(
        '{"user": {"id": 123, "profile": {"name": "Alice", "bio": "Developer"}}, "metadata": {"createdAt": "2024-01-01", "updatedAt": "2024-01-02"}}',
      );

      const result = await testLLM.executeCompletionPrimary<NestedType>(
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: nestedSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // TypeScript should infer that result.generated is NestedType
        expect(result.generated).toHaveProperty("user");
        expect(result.generated.user).toHaveProperty("id");
        expect(result.generated.user).toHaveProperty("profile");
        expect(result.generated.user.profile).toHaveProperty("name");
        expect(result.generated).toHaveProperty("metadata");
        expect(result.generated.metadata).toHaveProperty("createdAt");
      }
    });

    test("should handle type inference without schema (defaults to Record<string, unknown>)", async () => {
      testLLM.setMockResponse('{"key1": "value1", "key2": 42, "key3": true}');

      const result = await testLLM.executeCompletionPrimary<Record<string, unknown>>(
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Without schema, type should default to LLMGeneratedContent (which is string | Record<string, unknown>)
        // But since we're processing JSON, it should be Record<string, unknown>
        expect(typeof result.generated).toBe("object");
        expect(result.generated).not.toBeNull();
      }
    });
  });

  describe("Type safety through call chain", () => {
    test("should preserve type from schema through entire call chain", async () => {
      const productSchema = z.object({
        id: z.number(),
        name: z.string(),
        price: z.number().positive(),
        inStock: z.boolean(),
      });

      type ProductType = z.infer<typeof productSchema>;

      testLLM.setMockResponse('{"id": 1, "name": "Widget", "price": 19.99, "inStock": true}');

      // Call through executeCompletionPrimary which should preserve the type
      const result = await testLLM.executeCompletionPrimary<ProductType>(
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: productSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Verify the type is preserved - all properties should be correctly typed
        const product = result.generated;
        expect(typeof product.id).toBe("number");
        expect(typeof product.name).toBe("string");
        expect(typeof product.price).toBe("number");
        expect(typeof product.inStock).toBe("boolean");
        expect(product.price).toBeGreaterThan(0);
      }
    });

    test("should handle type inference with optional fields in schema", async () => {
      const schemaWithOptional = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      });

      type OptionalType = z.infer<typeof schemaWithOptional>;

      testLLM.setMockResponse(
        '{"required": "present", "optional": "also present", "nullable": null}',
      );

      const result = await testLLM.executeCompletionPrimary<OptionalType>(
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schemaWithOptional,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        expect(result.generated).toHaveProperty("required");
        expect(result.generated.required).toBe("present");
        // Optional and nullable fields should be handled correctly
        expect(result.generated.optional).toBe("also present");
        expect(result.generated.nullable).toBeNull();
      }
    });
  });
});
