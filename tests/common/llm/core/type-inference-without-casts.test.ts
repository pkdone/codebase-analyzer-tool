import {
  LLMPurpose,
  LLMResponseStatus,
  LLMProvider,
  LLMModelQuality,
  ResolvedLLMModelMetadata,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm.types";
import { z } from "zod";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { createMockErrorLogger } from "../../helpers/llm/mock-error-logger";
import LLMStats from "../../../../src/common/llm/tracking/llm-stats";
import { PromptAdaptationStrategy } from "../../../../src/common/llm/strategies/prompt-adaptation-strategy";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import { FallbackStrategy } from "../../../../src/common/llm/strategies/fallback-strategy";
import { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import type { EnvVars } from "../../../../src/app/env/env.types";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import type { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import * as manifestLoader from "../../../../src/common/llm/utils/manifest-loader";
import type { LLMModuleConfig } from "../../../../src/common/llm/config/llm-module-config.types";

jest.mock("../../../../src/common/utils/logging", () => ({
  logOneLineWarning: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../../src/common/llm/tracking/llm-stats", () => {
  return jest.fn().mockImplementation(() => ({
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
    recordSwitch: jest.fn(),
    recordRetry: jest.fn(),
    recordCrop: jest.fn(),
    recordJsonMutated: jest.fn(),
    getStatusTypesStatistics: jest.fn(() => []),
  }));
});

describe("Type Inference Without Casts - LLM Router and AbstractLLM", () => {
  let mockProvider: jest.Mocked<LLMProvider>;
  let mockEnvVars: EnvVars;
  let mockStats: LLMStats;
  let mockManifest: LLMProviderManifest;
  let executionPipeline: LLMExecutionPipeline;
  let llmRouter: LLMRouter;
  const modelFamily = "test-model-family";

  const mockEmbeddingModelMetadata: ResolvedLLMModelMetadata = {
    modelKey: "TEST_EMBEDDINGS",
    urn: "test-embedding-model",
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: 1536,
    maxTotalTokens: 8191,
  };

  const mockPrimaryCompletionModelMetadata: ResolvedLLMModelMetadata = {
    modelKey: "TEST_PRIMARY_COMPLETION",
    urn: "test-primary-model",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Create mock provider
    mockProvider = {
      generateEmbeddings: jest.fn(),
      executeCompletionPrimary: jest.fn(),
      executeCompletionSecondary: jest.fn(),
      getModelsNames: jest.fn(() => ({
        embeddings: "test-embedding-model",
        primaryCompletion: "test-primary-model",
      })),
      getAvailableCompletionModelQualities: jest.fn(() => [LLMModelQuality.PRIMARY]),
      getEmbeddingModelDimensions: jest.fn(() => 1536),
      getModelFamily: jest.fn(() => modelFamily),
      getModelsMetadata: jest.fn(() => ({
        TEST_EMBEDDINGS: mockEmbeddingModelMetadata,
        TEST_PRIMARY_COMPLETION: mockPrimaryCompletionModelMetadata,
      })),
      close: jest.fn(async () => {}),
      needsForcedShutdown: jest.fn(() => false),
    } as jest.Mocked<LLMProvider>;

    // Create mock manifest
    mockManifest = {
      providerName: "Test Provider",
      modelFamily,
      implementation: jest.fn(() => mockProvider) as unknown as new (
        ...args: unknown[]
      ) => LLMProvider,
      models: {
        embeddings: {
          modelKey: "TEST_EMBEDDINGS",
          urnEnvKey: "TEST_EMBEDDING_MODEL",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        primaryCompletion: {
          modelKey: "TEST_PRIMARY_COMPLETION",
          urnEnvKey: "TEST_PRIMARY_MODEL",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
      },
      envSchema: z.object({
        TEST_EMBEDDING_MODEL: z.string(),
        TEST_PRIMARY_MODEL: z.string(),
      }),
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
    };

    // Mock environment variables
    mockEnvVars = {
      TEST_EMBEDDING_MODEL: "test-embedding-model",
      TEST_PRIMARY_MODEL: "test-primary-model",
    } as unknown as EnvVars;

    // Mock manifest loader
    jest.spyOn(manifestLoader, "loadManifestForModelFamily").mockReturnValue(mockManifest);

    // Create dependencies
    mockStats = new LLMStats();
    const retryStrategy = new RetryStrategy(mockStats);
    const fallbackStrategy = new FallbackStrategy();
    const promptAdaptationStrategy = new PromptAdaptationStrategy();
    executionPipeline = new LLMExecutionPipeline(
      retryStrategy,
      fallbackStrategy,
      promptAdaptationStrategy,
      mockStats,
    );

    // Create router
    const mockConfig: LLMModuleConfig = {
      modelFamily,
      providerParameters: mockEnvVars as unknown as Record<string, string>,
      errorLogging: { errorLogDirectory: "/tmp", errorLogFilenameTemplate: "error.log" },
      sanitizer: {},
    };
    llmRouter = new LLMRouter(mockConfig, executionPipeline, createMockErrorLogger());
  });

  describe("LLMRouter.executeCompletion - Type inference without casts", () => {
    test("should return correctly typed result with object schema", async () => {
      const userSchema = z.object({
        name: z.string(),
        age: z.number(),
        isActive: z.boolean(),
      });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { name: "Alice", age: 30, isActive: true },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      });

      // TypeScript should infer result as z.infer<typeof userSchema> | null
      expect(result).not.toBeNull();
      if (result) {
        // No type assertion needed - TypeScript infers the type correctly
        expect(result.name).toBe("Alice");
        expect(result.age).toBe(30);
        expect(result.isActive).toBe(true);
        expect(typeof result.name).toBe("string");
        expect(typeof result.age).toBe("number");
        expect(typeof result.isActive).toBe("boolean");
      }
    });

    test("should return correctly typed result with array schema", async () => {
      const itemsSchema = z.array(z.object({ id: z.number(), label: z.string() }));

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: [
          { id: 1, label: "First" },
          { id: 2, label: "Second" },
        ],
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: itemsSchema,
      });

      expect(result).not.toBeNull();
      if (result) {
        // TypeScript correctly infers this as an array without casts
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        expect(result[0].id).toBe(1);
        expect(result[0].label).toBe("First");
      }
    });

    test("should return string when outputFormat is TEXT", async () => {
      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: "This is a text response",
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result).not.toBeNull();
      if (result) {
        // TypeScript correctly infers this as string without casts
        expect(typeof result).toBe("string");
        expect(result).toBe("This is a text response");
        // This would cause a compile error if type inference was wrong:
        // result.toUpperCase();
      }
    });

    test("should return null for failed completion", async () => {
      const testSchema = z.object({ value: z.string() });

      mockProvider.executeCompletionPrimary.mockResolvedValue({
        status: LLMResponseStatus.ERRORED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        error: new Error("Test error"),
      });

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: testSchema,
      });

      // TypeScript correctly infers this as z.infer<typeof testSchema> | null
      expect(result).toBeNull();
    });

    test("should handle complex nested schema without casts", async () => {
      const complexSchema = z.object({
        metadata: z.object({
          timestamp: z.string(),
          version: z.number(),
        }),
        data: z.array(
          z.object({
            id: z.string(),
            attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
          }),
        ),
      });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: {
          metadata: { timestamp: "2024-01-01", version: 1 },
          data: [{ id: "item1", attributes: { active: true, count: 42, name: "Test" } }],
        },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: complexSchema,
      });

      expect(result).not.toBeNull();
      if (result) {
        // Deep type inference should work correctly
        expect(result.metadata.timestamp).toBe("2024-01-01");
        expect(result.metadata.version).toBe(1);
        expect(result.data[0].id).toBe("item1");
        expect(result.data[0].attributes.active).toBe(true);
      }
    });
  });

  describe("Discriminated union narrowing in execution pipeline", () => {
    test("should correctly narrow result type after success check", async () => {
      const schema = z.object({ status: z.string(), code: z.number() });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { status: "ok", code: 200 },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      // This tests that the discriminated union in LLMExecutionResult is properly narrowed
      // After checking result is not null, TypeScript knows it's the success case
      expect(result).not.toBeNull();
      if (result) {
        // No cast needed - TypeScript correctly narrows to success type
        expect(result.status).toBe("ok");
        expect(result.code).toBe(200);
      }
    });

    test("should handle union schemas with type narrowing", async () => {
      const unionSchema = z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]);

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { type: "text" as const, content: "Hello" },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: unionSchema,
      });

      expect(result).not.toBeNull();
      if (result && result.type === "text") {
        // TypeScript should narrow to the text variant
        expect(result.content).toBe("Hello");
        // This would cause a compile error if narrowing didn't work:
        // const value = result.value; // Property 'value' does not exist
      }
    });
  });

  describe("Generic type propagation through call chain", () => {
    test("should preserve type through LLMRouter -> Pipeline -> Provider", async () => {
      const productSchema = z.object({
        productId: z.string(),
        price: z.number().positive(),
        inStock: z.boolean(),
        tags: z.array(z.string()),
      });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: {
          productId: "ABC123",
          price: 29.99,
          inStock: true,
          tags: ["electronics", "gadget"],
        },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      // Type flows from schema -> options -> LLMRouter -> Pipeline -> Provider -> back
      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: productSchema,
      });

      expect(result).not.toBeNull();
      if (result) {
        // All properties should be correctly typed without any casts
        const id: string = result.productId;
        const price: number = result.price;
        const inStock: boolean = result.inStock;
        const tags: string[] = result.tags;

        expect(id).toBe("ABC123");
        expect(price).toBe(29.99);
        expect(inStock).toBe(true);
        expect(tags).toEqual(["electronics", "gadget"]);
      }
    });

    test("should handle optional and nullable fields without casts", async () => {
      const schemaWithOptionals = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.number().nullable(),
        defaulted: z.boolean().default(false),
      });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: {
          required: "present",
          optional: undefined,
          nullable: null,
          defaulted: true,
        },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithOptionals,
      });

      expect(result).not.toBeNull();
      if (result) {
        // Type system should handle optional and nullable correctly
        expect(result.required).toBe("present");
        expect(result.optional).toBeUndefined();
        expect(result.nullable).toBeNull();
        expect(result.defaulted).toBe(true);

        // TypeScript knows optional might be undefined
        if (result.optional) {
          const opt: string = result.optional;
          expect(opt).toBeDefined();
        }
      }
    });
  });

  describe("Compile-time type safety verification", () => {
    test("should enforce correct types at compile time", async () => {
      const strictSchema = z.object({
        stringField: z.string(),
        numberField: z.number(),
        booleanField: z.boolean(),
      });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: {
          stringField: "text",
          numberField: 42,
          booleanField: true,
        },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: strictSchema,
      });

      if (result) {
        // These assignments would fail at compile time if types were wrong
        const str: string = result.stringField;
        const num: number = result.numberField;
        const bool: boolean = result.booleanField;

        expect(str).toBe("text");
        expect(num).toBe(42);
        expect(bool).toBe(true);

        // The following would cause TypeScript compilation errors:
        // const wrongType: number = result.stringField; // Type 'string' is not assignable to type 'number'
        // result.nonExistentField; // Property 'nonExistentField' does not exist
      }
    });
  });

  describe("Simplified type chain - processJson integration", () => {
    test("should demonstrate end-to-end type safety from processJson to consumer", async () => {
      // Test that verifies the simplified type chain improvements
      const dataSchema = z.object({
        entities: z.array(z.object({ name: z.string(), id: z.number() })),
        summary: z.string(),
      });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: {
          entities: [
            { name: "Entity1", id: 1 },
            { name: "Entity2", id: 2 },
          ],
          summary: "Test summary",
        },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: dataSchema,
      });

      // With simplified processJson return type, no type assertions are needed
      // The type flows cleanly from schema -> processJson -> AbstractLLM -> LLMRouter -> consumer
      expect(result).not.toBeNull();
      if (result) {
        // All type inference works without any casts
        const entities: { name: string; id: number }[] = result.entities;
        const summary: string = result.summary;

        expect(entities).toHaveLength(2);
        expect(entities[0].name).toBe("Entity1");
        expect(entities[0].id).toBe(1);
        expect(summary).toBe("Test summary");
      }
    });

    test("should preserve type safety through mutation steps", async () => {
      const schema = z.object({
        value: z.string(),
        count: z.number(),
      });

      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { value: "test", count: 42 },
        mutationSteps: ["convertNullToUndefined", "coerceNumericProperties"],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      // Type is preserved even when mutations were applied
      expect(result).not.toBeNull();
      if (result) {
        // No casts needed - type is correctly inferred as z.infer<typeof schema>
        const typedResult: z.infer<typeof schema> = result;
        expect(typedResult.value).toBe("test");
        expect(typedResult.count).toBe(42);
      }
    });

    test("should handle Record<string, unknown> default gracefully", async () => {
      // Test without schema - should default to Record<string, unknown>
      const mockResponse = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "TEST_PRIMARY_COMPLETION",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { arbitraryKey: "arbitraryValue", nested: { data: 123 } },
        mutationSteps: [],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue(mockResponse);

      const result = await llmRouter.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
      });

      // Without schema, type is LLMGeneratedContent (can be string, Record, or number[])
      // At runtime, JSON without schema returns Record<string, unknown>
      expect(result).not.toBeNull();
      if (result && typeof result === "object" && !Array.isArray(result)) {
        const recordResult: Record<string, unknown> = result;
        expect(recordResult.arbitraryKey).toBe("arbitraryValue");
      }
    });
  });
});
