import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMContext,
  LLMOutputFormat,
  LLMResponseStatus,
} from "../../../../src/common/llm/types/llm.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../src/common/llm/providers/llm-provider.types";
import AbstractLLM from "../../../../src/common/llm/providers/abstract-llm";
import { createMockErrorLogger } from "../../helpers/llm/mock-error-logger";
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

// Stub class for manifest implementation field (not actually used in tests)
class StubLLM extends AbstractLLM {
  constructor() {
    super({
      manifest: {
        providerName: "Stub",
        modelFamily: "stub",
        envSchema: z.object({}),
        models: {
          embeddings: {
            modelKey: GPT_EMBEDDINGS_GPT4,
            urnEnvKey: "STUB_EMBED",
            purpose: LLMPurpose.EMBEDDINGS,
            maxTotalTokens: 8191,
            dimensions: 1536,
          },
          primaryCompletion: {
            modelKey: GPT_COMPLETIONS_GPT4_32k,
            urnEnvKey: "STUB_COMPLETE",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 32768,
          },
        },
        errorPatterns: [],
        providerSpecificConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        implementation: StubLLM as any,
      },
      providerParams: {},
      resolvedModels: {
        embeddings: "stub-embed",
        primaryCompletion: "stub-complete",
      },
      errorLogger: createMockErrorLogger(),
    });
  }
  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, maxTotalTokens: 0 },
    };
  }
  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: "",
      tokenUsage: { promptTokens: 0, completionTokens: 0, maxTotalTokens: 0 },
    };
  }
  protected isLLMOverloaded(): boolean {
    return false;
  }
  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

// Helper function to create ProviderInit for tests
function createTestProviderInit(): ProviderInit {
  const manifest: LLMProviderManifest = {
    providerName: "Test Provider",
    modelFamily: "test",
    envSchema: z.object({}),
    models: {
      embeddings: {
        modelKey: GPT_EMBEDDINGS_GPT4,
        urnEnvKey: "TEST_EMBEDDINGS_MODEL",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: testModelsMetadata[GPT_EMBEDDINGS_GPT4].maxTotalTokens,
        dimensions: testModelsMetadata[GPT_EMBEDDINGS_GPT4].dimensions,
      },
      primaryCompletion: {
        modelKey: GPT_COMPLETIONS_GPT4_32k,
        urnEnvKey: "TEST_PRIMARY_MODEL",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: testModelsMetadata[GPT_COMPLETIONS_GPT4_32k].maxCompletionTokens,
        maxTotalTokens: testModelsMetadata[GPT_COMPLETIONS_GPT4_32k].maxTotalTokens,
      },
    },
    errorPatterns: [],
    providerSpecificConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    },
    implementation: StubLLM as any,
  };

  return {
    manifest,
    providerParams: {},
    resolvedModels: {
      embeddings: testModelsMetadata[GPT_EMBEDDINGS_GPT4].urn,
      primaryCompletion: testModelsMetadata[GPT_COMPLETIONS_GPT4_32k].urn,
    },
    errorLogger: createMockErrorLogger(),
  };
}

// Test concrete class that extends AbstractLLM to test type safety
class TypeSafetyTestLLM extends AbstractLLM {
  private mockResponseContent = "";

  constructor() {
    super(createTestProviderInit());
  }

  setMockResponse(content: string) {
    this.mockResponseContent = content;
  }

  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: [0.1, 0.2, 0.3],
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 0,
        maxTotalTokens: 100,
      },
    };
  }

  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
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

      testLLM.setMockResponse('{"name": "John Doe", "age": 30, "email": "john@example.com"}');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Type narrowing required for union types
        if (typeof result.generated === "object" && !Array.isArray(result.generated)) {
          const data = result.generated as Record<string, any>;
          expect(data).toHaveProperty("name");
          expect(data).toHaveProperty("age");
          expect(data).toHaveProperty("email");
          expect(typeof data.name).toBe("string");
          expect(typeof data.age).toBe("number");
          expect(typeof data.email).toBe("string");
        }
      }
    });

    test("should preserve type when schema with array type is provided", async () => {
      const itemsSchema = z.array(z.object({ id: z.number(), value: z.string() }));

      type ItemsType = z.infer<typeof itemsSchema>;

      testLLM.setMockResponse('[{"id": 1, "value": "first"}, {"id": 2, "value": "second"}]');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: itemsSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // TypeScript should infer that result.generated is ItemsType (array)
        const generated = result.generated as unknown as ItemsType;
        expect(Array.isArray(generated)).toBe(true);
        expect(generated.length).toBe(2);
        expect(generated[0]).toHaveProperty("id");
        expect(generated[0]).toHaveProperty("value");
      }
    });

    test("should preserve type when schema with union type is provided", async () => {
      const unionSchema = z.union([
        z.object({ type: z.literal("success"), data: z.string() }),
        z.object({ type: z.literal("error"), message: z.string() }),
      ]);

      testLLM.setMockResponse('{"type": "success", "data": "operation completed"}');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: unionSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Type narrowing required for union types
        if (typeof result.generated === "object" && !Array.isArray(result.generated)) {
          const data = result.generated as Record<string, any>;
          expect(data).toHaveProperty("type");
          if ("data" in data) {
            expect(data.type).toBe("success");
            expect(typeof data.data).toBe("string");
          }
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

      testLLM.setMockResponse(
        '{"user": {"id": 123, "profile": {"name": "Alice", "bio": "Developer"}}, "metadata": {"createdAt": "2024-01-01", "updatedAt": "2024-01-02"}}',
      );

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: nestedSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Type narrowing required for union types
        if (typeof result.generated === "object" && !Array.isArray(result.generated)) {
          const data = result.generated as Record<string, any>;
          expect(data).toHaveProperty("user");
          expect(data.user).toHaveProperty("id");
          expect(data.user).toHaveProperty("profile");
          expect(data.user.profile).toHaveProperty("name");
          expect(data).toHaveProperty("metadata");
          expect(data.metadata).toHaveProperty("createdAt");
        }
      }
    });

    test("should handle type inference without schema (defaults to Record<string, unknown>)", async () => {
      testLLM.setMockResponse('{"key1": "value1", "key2": 42, "key3": true}');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

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

      testLLM.setMockResponse('{"id": 1, "name": "Widget", "price": 19.99, "inStock": true}');

      // Call through executeCompletionPrimary which should preserve the type
      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: productSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Type narrowing required for union types
        if (typeof result.generated === "object" && !Array.isArray(result.generated)) {
          const data = result.generated as Record<string, any>;
          expect(typeof data.id).toBe("number");
          expect(typeof data.name).toBe("string");
          expect(typeof data.price).toBe("number");
          expect(typeof data.inStock).toBe("boolean");
          expect(data.price).toBeGreaterThan(0);
        }
      }
    });

    test("should handle type inference with optional fields in schema", async () => {
      const schemaWithOptional = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      });

      // Type is inferred from schema - no need to declare it

      testLLM.setMockResponse(
        '{"required": "present", "optional": "also present", "nullable": null}',
      );

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithOptional,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Type narrowing required for union types
        if (typeof result.generated === "object" && !Array.isArray(result.generated)) {
          const data = result.generated as Record<string, any>;
          expect(data).toHaveProperty("required");
          expect(data.required).toBe("present");
          // Optional and nullable fields should be handled correctly
          expect(data.optional).toBe("also present");
          expect(data.nullable).toBeNull();
        }
      }
    });
  });

  describe("Type narrowing in formatAndValidateResponse", () => {
    test("should use type narrowing when jsonSchema is provided", async () => {
      const testSchema = z.object({
        status: z.string(),
        count: z.number(),
      });

      testLLM.setMockResponse('{"status": "active", "count": 42}');

      // When jsonSchema is provided, type narrowing should work correctly
      // The completionOptions should be properly narrowed within formatAndValidateResponse
      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: testSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Type narrowing required for union types
        if (typeof result.generated === "object" && !Array.isArray(result.generated)) {
          const data = result.generated as Record<string, any>;
          expect(data.status).toBe("active");
          expect(data.count).toBe(42);
        }
      }
    });

    test("should handle JSON processing without schema using type narrowing", async () => {
      testLLM.setMockResponse('{"key": "value", "number": 123}');

      // When no jsonSchema is provided, type narrowing should still work
      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // Without schema, should default to Record<string, unknown>
        expect(typeof result.generated).toBe("object");
        expect(result.generated).not.toBeNull();
      }
    });
  });
});
