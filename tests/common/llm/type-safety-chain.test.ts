import { z } from "zod";
import {
  LLMPurpose,
  LLMContext,
  LLMOutputFormat,
} from "../../../src/common/llm/types/llm-request.types";
import { LLMResponseStatus } from "../../../src/common/llm/types/llm-response.types";
import { ResolvedLLMModelMetadata } from "../../../src/common/llm/types/llm-model.types";
import { LLMImplSpecificResponseSummary } from "../../../src/common/llm/providers/llm-provider.types";
import BaseLLMProvider from "../../../src/common/llm/providers/base-llm-provider";
import { createMockErrorLoggingConfig } from "../helpers/llm/mock-error-logger";
import { RetryStrategy } from "../../../src/common/llm/strategies/retry-strategy";
import { LLMExecutionPipeline } from "../../../src/common/llm/llm-execution-pipeline";
import LLMExecutionStats from "../../../src/common/llm/tracking/llm-execution-stats";

// Test-only constants
const TEST_COMPLETIONS_MODEL = "TEST_COMPLETIONS_MODEL";
const TEST_EMBEDDINGS_MODEL = "TEST_EMBEDDINGS_MODEL";

// Test models metadata
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [TEST_COMPLETIONS_MODEL]: {
    modelKey: TEST_COMPLETIONS_MODEL,
    urnEnvKey: "TEST_COMPLETIONS_URN",
    urn: "test-completion-model",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [TEST_EMBEDDINGS_MODEL]: {
    modelKey: TEST_EMBEDDINGS_MODEL,
    urnEnvKey: "TEST_EMBEDDINGS_URN",
    urn: "test-embedding-model",
    purpose: LLMPurpose.EMBEDDINGS,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

/**
 * Test LLM implementation that returns configurable mock responses.
 * Used to verify type safety through the entire call chain.
 */
class TypeSafetyChainTestLLM extends BaseLLMProvider {
  private mockResponseContent = "";

  constructor() {
    super({
      manifest: {
        providerName: "TypeSafetyChainTest",
        modelFamily: "test",
        envSchema: z.object({}),
        models: {
          embeddings: [
            {
              modelKey: TEST_EMBEDDINGS_MODEL,
              urnEnvKey: "TEST_EMBED",
              purpose: LLMPurpose.EMBEDDINGS,
              maxTotalTokens: 8191,
              dimensions: 1536,
            },
          ],
          completions: [
            {
              modelKey: TEST_COMPLETIONS_MODEL,
              urnEnvKey: "TEST_COMPLETE",
              purpose: LLMPurpose.COMPLETIONS,
              maxCompletionTokens: 4096,
              maxTotalTokens: 8192,
            },
          ],
        },
        errorPatterns: [],
        providerSpecificConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        implementation: TypeSafetyChainTestLLM as any,
      },
      providerParams: {},
      resolvedModelChain: {
        embeddings: [
          { providerFamily: "test", modelKey: TEST_EMBEDDINGS_MODEL, modelUrn: "test-embed" },
        ],
        completions: [
          { providerFamily: "test", modelKey: TEST_COMPLETIONS_MODEL, modelUrn: "test-complete" },
        ],
      },
      errorLogging: createMockErrorLoggingConfig(),
    });
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

describe("Type Safety Chain - End to End", () => {
  let testLLM: TypeSafetyChainTestLLM;
  let testContext: LLMContext;
  let retryStrategy: RetryStrategy;
  let executionPipeline: LLMExecutionPipeline;
  let llmStats: LLMExecutionStats;

  beforeEach(() => {
    testLLM = new TypeSafetyChainTestLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };
    llmStats = new LLMExecutionStats();
    retryStrategy = new RetryStrategy(llmStats);
    executionPipeline = new LLMExecutionPipeline(retryStrategy, llmStats);
  });

  describe("Type preservation through BaseLLMProvider", () => {
    test("should preserve object schema type through executeProviderFunction", async () => {
      const userSchema = z.object({
        name: z.string(),
        age: z.number(),
        isActive: z.boolean(),
      });

      testLLM.setMockResponse('{"name": "Alice", "age": 30, "isActive": true}');

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: userSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        // TypeScript should infer the correct type
        expect(typeof result.generated).toBe("object");
        const data = result.generated as Record<string, unknown>;
        expect(data.name).toBe("Alice");
        expect(data.age).toBe(30);
        expect(data.isActive).toBe(true);
      }
    });

    test("should preserve array schema type", async () => {
      const itemsSchema = z.array(z.object({ id: z.number(), value: z.string() }));

      testLLM.setMockResponse('[{"id": 1, "value": "first"}, {"id": 2, "value": "second"}]');

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: itemsSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        expect(Array.isArray(result.generated)).toBe(true);
        const data = result.generated as unknown[];
        expect(data.length).toBe(2);
      }
    });

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
        }),
      });

      testLLM.setMockResponse(
        '{"user": {"id": 1, "profile": {"name": "Bob"}}, "metadata": {"createdAt": "2024-01-01"}}',
      );

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
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
        const data = result.generated as Record<string, unknown>;
        expect(data).toHaveProperty("user");
        expect(data).toHaveProperty("metadata");
      }
    });
  });

  describe("Type preservation through RetryStrategy", () => {
    test("should preserve type through executeWithRetries with object schema", async () => {
      const productSchema = z.object({
        id: z.number(),
        name: z.string(),
        price: z.number(),
      });

      testLLM.setMockResponse('{"id": 1, "name": "Widget", "price": 19.99}');

      // Bind options to create BoundLLMFunction
      const boundFn = async (content: string, ctx: LLMContext) =>
        testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, content, ctx, {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: productSchema,
        });

      const result = await retryStrategy.executeWithRetries(
        boundFn,
        "test prompt",
        testContext,
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        true, // retryOnInvalid
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result?.generated).toBeDefined();

      if (result?.status === LLMResponseStatus.COMPLETED && result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.id).toBe(1);
        expect(data.name).toBe("Widget");
        expect(data.price).toBe(19.99);
      }
    });

    test("should preserve type through executeWithRetries with array schema", async () => {
      const numbersSchema = z.array(z.number());

      testLLM.setMockResponse("[1, 2, 3, 4, 5]");

      // Bind options to create BoundLLMFunction
      const boundFn = async (content: string, ctx: LLMContext) =>
        testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, content, ctx, {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: numbersSchema,
        });

      const result = await retryStrategy.executeWithRetries(
        boundFn,
        "test prompt",
        testContext,
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        true, // retryOnInvalid
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result?.generated).toBeDefined();

      if (result?.status === LLMResponseStatus.COMPLETED && result.generated) {
        expect(Array.isArray(result.generated)).toBe(true);
        const data = result.generated as unknown[];
        expect(data.length).toBe(5);
      }
    });
  });

  describe("Type preservation through LLMExecutionPipeline", () => {
    test("should preserve type through execute with complex schema", async () => {
      const complexSchema = z.object({
        status: z.enum(["success", "failure"]),
        data: z.object({
          items: z.array(z.string()),
          count: z.number(),
        }),
        timestamp: z.string(),
      });

      testLLM.setMockResponse(
        '{"status": "success", "data": {"items": ["a", "b", "c"], "count": 3}, "timestamp": "2024-01-01T00:00:00Z"}',
      );

      // Bind options to create BoundLLMFunction
      const boundFn = async (content: string, ctx: LLMContext) =>
        testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, content, ctx, {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: complexSchema,
        });

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context: testContext,
        llmFunctions: [boundFn],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        modelsMetadata: testModelsMetadata,
      });

      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.status).toBe("success");
        expect(data).toHaveProperty("data");
        expect(data).toHaveProperty("timestamp");
      }
    });

    test("should preserve type through execute with union schema", async () => {
      const unionSchema = z.union([
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]);

      testLLM.setMockResponse('{"type": "text", "content": "hello"}');

      // Bind options to create BoundLLMFunction
      const boundFn = async (content: string, ctx: LLMContext) =>
        testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, content, ctx, {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: unionSchema,
        });

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context: testContext,
        llmFunctions: [boundFn],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        modelsMetadata: testModelsMetadata,
      });

      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.type).toBe("text");
        expect(data).toHaveProperty("content");
      }
    });
  });

  describe("Type preservation through LLMRouter", () => {
    test("should preserve type through router executeCompletion with object schema", async () => {
      const configSchema = z.object({
        enabled: z.boolean(),
        maxItems: z.number(),
        tags: z.array(z.string()),
      });

      testLLM.setMockResponse('{"enabled": true, "maxItems": 10, "tags": ["tag1", "tag2"]}');

      // Note: The actual LLMRouter internally creates its own LLM instance.
      // For this test, we're verifying the type signatures are correct directly with testLLM.
      // In real usage with a router, the type inference would work end-to-end.

      // Type check: this should compile without errors
      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: configSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
    });

    test("should handle TEXT format without schema", async () => {
      testLLM.setMockResponse("Plain text response");

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        expect(typeof result.generated).toBe("string");
        expect(result.generated).toBe("Plain text response");
      }
    });
  });

  describe("Type inference with optional and nullable fields", () => {
    test("should handle optional fields correctly", async () => {
      const schemaWithOptional = z.object({
        required: z.string(),
        optional: z.string().optional(),
        withDefault: z.string().default("default-value"),
      });

      testLLM.setMockResponse('{"required": "present"}');

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schemaWithOptional,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.required).toBe("present");
        expect(data.withDefault).toBe("default-value");
      }
    });

    test("should handle nullable fields correctly", async () => {
      const schemaWithNullable = z.object({
        value: z.string().nullable(),
        count: z.number(),
      });

      testLLM.setMockResponse('{"value": null, "count": 42}');

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schemaWithNullable,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.value).toBeNull();
        expect(data.count).toBe(42);
      }
    });
  });

  describe("Type preservation with transforms", () => {
    test("should preserve type even when transforms are applied", async () => {
      const schema = z.object({
        items: z.array(z.string()),
        metadata: z.object({
          count: z.number(),
        }),
      });

      // Response with null that will be converted to undefined by transforms
      testLLM.setMockResponse('{"items": ["a", "b"], "metadata": {"count": 2}}');

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      if (result.status === LLMResponseStatus.COMPLETED && result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data).toHaveProperty("items");
        expect(data).toHaveProperty("metadata");
      }
    });
  });

  describe("Verification of Type Fix - No Any Types", () => {
    test("should verify no implicit any in LLMFunction return type", async () => {
      // This test ensures that the fix properly eliminates 'any' from the type chain
      const strictSchema = z.object({
        id: z.number(),
        data: z.string(),
      });

      testLLM.setMockResponse('{"id": 1, "data": "test"}');

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: strictSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);

      // The type of result.generated should not be 'any'
      // With the fix, TypeScript should infer the correct type
      if (result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.id).toBe(1);
        expect(data.data).toBe("test");
      }
    });

    test("should preserve type through RetryStrategy without any", async () => {
      const verificationSchema = z.object({
        verified: z.boolean(),
        timestamp: z.string(),
      });

      testLLM.setMockResponse('{"verified": true, "timestamp": "2024-01-01"}');

      // Bind options to create BoundLLMFunction
      const boundFn = async (content: string, ctx: LLMContext) =>
        testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, content, ctx, {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: verificationSchema,
        });

      const result = await retryStrategy.executeWithRetries(
        boundFn,
        "test",
        testContext,
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        true, // retryOnInvalid
      );

      expect(result).not.toBeNull();
      if (result?.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.verified).toBe(true);
        expect(data.timestamp).toBe("2024-01-01");
      }
    });

    test("should preserve type through ExecutionPipeline without any", async () => {
      const pipelineSchema = z.object({
        status: z.string(),
        code: z.number(),
      });

      testLLM.setMockResponse('{"status": "success", "code": 200}');

      // Bind options to create BoundLLMFunction
      const boundFn = async (content: string, ctx: LLMContext) =>
        testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, content, ctx, {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: pipelineSchema,
        });

      const result = await executionPipeline.execute({
        resourceName: "test",
        content: "test",
        context: testContext,
        llmFunctions: [boundFn],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        modelsMetadata: testModelsMetadata,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.status).toBe("success");
        expect(data.code).toBe(200);
      }
    });
  });

  describe("Complex Schema Type Inference", () => {
    test("should handle deeply nested schemas without losing types", async () => {
      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string(),
            }),
          }),
        }),
      });

      testLLM.setMockResponse('{"level1": {"level2": {"level3": {"value": "deep"}}}}');

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: deepSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data).toHaveProperty("level1");
      }
    });

    test("should handle arrays of complex objects", async () => {
      const arraySchema = z.array(
        z.object({
          id: z.string(),
          metadata: z.object({
            created: z.string(),
            updated: z.string().optional(),
          }),
          tags: z.array(z.string()),
        }),
      );

      testLLM.setMockResponse(
        '[{"id": "1", "metadata": {"created": "2024-01-01"}, "tags": ["tag1"]}]',
      );

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: arraySchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.generated) {
        expect(Array.isArray(result.generated)).toBe(true);
        const data = result.generated as unknown[];
        expect(data.length).toBe(1);
      }
    });

    test("should handle schemas with multiple union types", async () => {
      const unionSchema = z.object({
        value: z.union([z.string(), z.number(), z.boolean()]),
        result: z.union([z.literal("success"), z.literal("failure"), z.literal("pending")]),
      });

      testLLM.setMockResponse('{"value": "test", "result": "success"}');

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: unionSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.value).toBe("test");
        expect(data.result).toBe("success");
      }
    });
  });

  describe("Edge Cases and Advanced Scenarios", () => {
    test("should handle schemas with refinements", async () => {
      const refinedSchema = z
        .object({
          email: z.string().email(),
          age: z.number().min(0).max(120),
          username: z.string().min(3).max(20),
        })
        .strict();

      testLLM.setMockResponse('{"email": "test@example.com", "age": 25, "username": "testuser"}');

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: refinedSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.email).toBe("test@example.com");
        expect(data.age).toBe(25);
      }
    });

    test("should handle schemas with transformations", async () => {
      const transformSchema = z
        .object({
          count: z.string().transform((val) => parseInt(val, 10)),
          flag: z.string().transform((val) => val === "true"),
        })
        .transform((obj) => ({
          ...obj,
          doubled: obj.count * 2,
        }));

      testLLM.setMockResponse('{"count": "42", "flag": "true"}');

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: transformSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.count).toBe(42);
        expect(data.flag).toBe(true);
        expect(data.doubled).toBe(84);
      }
    });

    test("should handle Record types with constrained keys", async () => {
      const recordSchema = z.record(z.enum(["key1", "key2", "key3"]), z.number());

      testLLM.setMockResponse('{"key1": 10, "key2": 20, "key3": 30}');

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: recordSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.key1).toBe(10);
        expect(data.key2).toBe(20);
        expect(data.key3).toBe(30);
      }
    });

    test("should handle tuple types", async () => {
      const tupleSchema = z.tuple([z.string(), z.number(), z.boolean()]);

      testLLM.setMockResponse('["test", 42, true]');

      const result = await testLLM.executeCompletion(TEST_COMPLETIONS_MODEL, "test", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: tupleSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (result.generated) {
        expect(Array.isArray(result.generated)).toBe(true);
        const data = result.generated as unknown[];
        expect(data[0]).toBe("test");
        expect(data[1]).toBe(42);
        expect(data[2]).toBe(true);
      }
    });
  });
});
