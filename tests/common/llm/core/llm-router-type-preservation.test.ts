import { z } from "zod";
import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import LLMExecutionStats from "../../../../src/common/llm/tracking/llm-execution-stats";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import { LLMPurpose, LLMOutputFormat } from "../../../../src/common/llm/types/llm-request.types";
import { LLMResponseStatus } from "../../../../src/common/llm/types/llm-response.types";
import type { LLMProvider } from "../../../../src/common/llm/types/llm-provider.interface";
import { ResolvedLLMModelMetadata } from "../../../../src/common/llm/types/llm-model.types";
import { ShutdownBehavior } from "../../../../src/common/llm/types/llm-shutdown.types";
import type { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import type { LLMModuleConfig } from "../../../../src/common/llm/config/llm-module-config.types";
import * as manifestLoader from "../../../../src/common/llm/utils/manifest-loader";
import { isOk } from "../../../../src/common/types/result.types";

jest.mock("../../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../../src/common/llm/tracking/llm-execution-stats", () => {
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

/**
 * Tests verifying that the LLMRouter implementation preserves type information
 * through the call chain without unnecessary casting to LLMGeneratedContent.
 *
 * These tests ensure that the generic type S flows correctly from the schema
 * through the pipeline to the return value.
 */
describe("LLMRouter Type Preservation Tests", () => {
  let mockConsoleLog: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  const mockEmbeddingModelMetadata: ResolvedLLMModelMetadata = {
    modelKey: "GPT_EMBEDDINGS_ADA002",
    urnEnvKey: "OPENAI_EMBEDDINGS_MODEL",
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: 1536,
    maxTotalTokens: 8191,
  };

  const mockPrimaryModelMetadata: ResolvedLLMModelMetadata = {
    modelKey: "GPT_COMPLETIONS_GPT4",
    urnEnvKey: "OPENAI_COMPLETION_MODEL",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  };

  const createMockLLMProvider = (): LLMProvider => {
    const mockProvider = {
      generateEmbeddings: jest.fn(),
      executeCompletion: jest.fn(),
      getModelsNames: jest.fn(() => ({
        embeddings: ["text-embedding-ada-002"],
        completions: ["GPT-4"],
      })),
      getAvailableModelNames: jest.fn(() => ({
        embeddings: ["text-embedding-ada-002"],
        completions: ["GPT-4"],
      })),
      getEmbeddingModelDimensions: jest.fn(() => 1536),
      getModelFamily: jest.fn(() => "OpenAI GPT"),
      getModelsMetadata: jest.fn(() => ({
        GPT_COMPLETIONS_GPT4: mockPrimaryModelMetadata,
        GPT_EMBEDDINGS_ADA002: mockEmbeddingModelMetadata,
      })),
      close: jest.fn(),
      getShutdownBehavior: jest.fn(() => ShutdownBehavior.GRACEFUL),
    } as unknown as LLMProvider;

    return mockProvider;
  };

  const createLLMRouter = () => {
    const mockProvider = createMockLLMProvider();

    const mockManifest: LLMProviderManifest = {
      providerName: "Mock OpenAI",
      modelFamily: "test",
      envSchema: {} as z.ZodObject<Record<string, z.ZodTypeAny>>,
      models: {
        embeddings: [
          {
            modelKey: "GPT_EMBEDDINGS_ADA002",
            purpose: LLMPurpose.EMBEDDINGS,
            urnEnvKey: "OPENAI_EMBEDDINGS_MODEL",
            maxTotalTokens: 8191,
            dimensions: 1536,
          },
        ],
        completions: [
          {
            modelKey: "GPT_COMPLETIONS_GPT4",
            purpose: LLMPurpose.COMPLETIONS,
            urnEnvKey: "OPENAI_COMPLETION_MODEL",
            maxTotalTokens: 8192,
            maxCompletionTokens: 4096,
          },
        ],
      },
      implementation: jest.fn().mockImplementation(() => mockProvider) as unknown as new (
        init: import("../../../../src/common/llm/providers/llm-provider.types").ProviderInit,
      ) => LLMProvider,
      errorPatterns: [],
      providerSpecificConfig: {
        maxRetryAttempts: 2,
        minRetryDelayMillis: 10,
        maxRetryDelayMillis: 100,
        requestTimeoutMillis: 1000,
      },
    };

    jest.spyOn(manifestLoader, "loadManifestForProviderFamily").mockReturnValue(mockManifest);

    const mockLLMExecutionStats = new LLMExecutionStats();
    const mockRetryStrategy = new RetryStrategy(mockLLMExecutionStats);
    const mockExecutionPipeline = new LLMExecutionPipeline(
      mockRetryStrategy,
      mockLLMExecutionStats,
    );
    const mockConfig: LLMModuleConfig = {
      providerParams: {},
      resolvedModelChain: {
        embeddings: [
          {
            providerFamily: "test",
            modelKey: "GPT_EMBEDDINGS_ADA002",
            modelUrn: "text-embedding-3-large",
          },
        ],
        completions: [
          { providerFamily: "test", modelKey: "GPT_COMPLETIONS_GPT4", modelUrn: "gpt-4o" },
        ],
      },
      errorLogging: { errorLogDirectory: "/tmp", errorLogFilenameTemplate: "error.log" },
    };

    const router = new LLMRouter(mockConfig, mockExecutionPipeline);
    return { router, mockProvider };
  };

  describe("Generic Type Preservation", () => {
    test("should preserve exact schema type in JSON mode result without widening", async () => {
      const { router, mockProvider } = createLLMRouter();

      // Define a specific schema with unique property names
      const specificSchema = z.object({
        uniqueField: z.string(),
        numericValue: z.number(),
        nestedObject: z.object({
          innerField: z.boolean(),
        }),
      });

      const mockData = {
        uniqueField: "test",
        numericValue: 42,
        nestedObject: { innerField: true },
      };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: specificSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Type should be z.infer<typeof specificSchema>, not LLMGeneratedContent
        // These property accesses verify type preservation at compile time
        const field: string = result.value.uniqueField;
        const num: number = result.value.numericValue;
        const inner: boolean = result.value.nestedObject.innerField;

        expect(field).toBe("test");
        expect(num).toBe(42);
        expect(inner).toBe(true);
      }
    });

    test("should preserve array element types from schema", async () => {
      const { router, mockProvider } = createLLMRouter();

      const arraySchema = z.object({
        entries: z.array(
          z.object({
            id: z.number(),
            tags: z.array(z.string()),
          }),
        ),
      });

      const mockData = {
        entries: [
          { id: 1, tags: ["a", "b"] },
          { id: 2, tags: ["c"] },
        ],
      };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: arraySchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Verify array operations work with correct types (compile-time check)
        const firstEntry = result.value.entries[0];
        const id: number = firstEntry.id;
        const firstTag: string = firstEntry.tags[0];

        // Map operation should preserve types
        const allIds: number[] = result.value.entries.map((e) => e.id);
        const allTags: string[] = result.value.entries.flatMap((e) => e.tags);

        expect(id).toBe(1);
        expect(firstTag).toBe("a");
        expect(allIds).toEqual([1, 2]);
        expect(allTags).toEqual(["a", "b", "c"]);
      }
    });

    test("should preserve literal types from discriminated unions", async () => {
      const { router, mockProvider } = createLLMRouter();

      const discriminatedSchema = z.object({
        response: z.discriminatedUnion("type", [
          z.object({ type: z.literal("success"), data: z.string() }),
          z.object({ type: z.literal("error"), code: z.number() }),
        ]),
      });

      const mockData = {
        response: { type: "success" as const, data: "result" },
      };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: discriminatedSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Type narrowing should work correctly
        if (result.value.response.type === "success") {
          const data: string = result.value.response.data;
          expect(data).toBe("result");
        }
      }
    });

    test("should preserve string type in TEXT mode without casting", async () => {
      const { router, mockProvider } = createLLMRouter();

      const textResponse = "Plain text response content";

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: textResponse,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Type should be string, verified by string method calls
        const upper: string = result.value.toUpperCase();
        const length: number = result.value.length;
        const includes: boolean = result.value.includes("text");

        expect(upper).toBe("PLAIN TEXT RESPONSE CONTENT");
        expect(length).toBe(27);
        expect(includes).toBe(true);
      }
    });
  });

  describe("Type Preservation with Complex Schemas", () => {
    test("should preserve optional field types correctly", async () => {
      const { router, mockProvider } = createLLMRouter();

      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        withDefault: z.number().default(0),
      });

      const mockData = {
        required: "value",
        withDefault: 42,
      };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: optionalSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Required field should be string
        const req: string = result.value.required;
        // Optional field should be string | undefined
        const opt: string | undefined = result.value.optional;
        // Default field should be number
        const def: number = result.value.withDefault;

        expect(req).toBe("value");
        expect(opt).toBeUndefined();
        expect(def).toBe(42);
      }
    });

    test("should preserve enum types from schema", async () => {
      const { router, mockProvider } = createLLMRouter();

      const enumSchema = z.object({
        status: z.enum(["pending", "active", "completed"]),
        priority: z.enum(["low", "medium", "high"]),
      });

      const mockData = {
        status: "active" as const,
        priority: "high" as const,
      };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: enumSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Enum type should be preserved
        const status: "pending" | "active" | "completed" = result.value.status;
        const priority: "low" | "medium" | "high" = result.value.priority;

        expect(status).toBe("active");
        expect(priority).toBe("high");
      }
    });

    test("should preserve deeply nested object types", async () => {
      const { router, mockProvider } = createLLMRouter();

      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string(),
              count: z.number(),
            }),
          }),
        }),
      });

      const mockData = {
        level1: {
          level2: {
            level3: {
              value: "deep",
              count: 3,
            },
          },
        },
      };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: deepSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Deep property access should work with correct types
        const deepValue: string = result.value.level1.level2.level3.value;
        const deepCount: number = result.value.level1.level2.level3.count;

        expect(deepValue).toBe("deep");
        expect(deepCount).toBe(3);
      }
    });
  });

  describe("Type System Architecture", () => {
    test("should use simple generic LLMExecutionResult<T> without complex conditional types", async () => {
      const { router, mockProvider } = createLLMRouter();

      const schema = z.object({
        testField: z.string(),
      });

      const mockData = { testField: "value" };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Verify that the simple generic approach (LLMExecutionResult<z.infer<S>>)
        // provides full type safety without needing complex conditional types like
        // TypedLLMExecutionResult. The type is correctly inferred from the schema.
        const value: z.infer<typeof schema> = result.value;
        const field: string = value.testField;

        expect(field).toBe("value");

        // This test documents that the simpler generic propagation through
        // LLMExecutionResult<T> is sufficient for type safety. The complex
        // conditional type TypedLLMExecutionResult was removed as unnecessary.
      }
    });
  });
});
