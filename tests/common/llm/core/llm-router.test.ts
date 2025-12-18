import {
  LLMPurpose,
  LLMResponseStatus,
  LLMProvider,
  LLMModelQuality,
  ResolvedLLMModelMetadata,
  LLMResponseTokensUsage,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm.types";

import { z } from "zod";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { createMockErrorLogger } from "../../helpers/llm/mock-error-logger";
import LLMStats from "../../../../src/common/llm/tracking/llm-stats";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import type { EnvVars } from "../../../../src/app/env/env.types";
import { describe, test, expect, jest } from "@jest/globals";
import type { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import * as manifestLoader from "../../../../src/common/llm/utils/manifest-loader";
import type { LLMModuleConfig } from "../../../../src/common/llm/config/llm-module-config.types";

// Mock the dependencies
// Note: extractTokensAmountFromMetadataDefaultingMissingValues and
// postProcessAsJSONIfNeededGeneratingNewResult have been moved to AbstractLLM class

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
    getStatusTypesStatistics: jest.fn(() => [
      { description: "Success", symbol: "✓", count: 0 },
      { description: "Failure", symbol: "✗", count: 0 },
    ]),
  }));
});

// Zod schema for LLMModelMetadata validation
const llmModelMetadataSchema = z
  .object({
    modelKey: z.string(),
    urn: z.string().min(1, "Model ID cannot be empty"),
    purpose: z.nativeEnum(LLMPurpose),
    dimensions: z.number().positive().optional(),
    maxCompletionTokens: z.number().positive().optional(),
    maxTotalTokens: z.number().positive(),
  })
  .refine(
    (data) => {
      // Require dimensions for embeddings models
      if (data.purpose === LLMPurpose.EMBEDDINGS && !data.dimensions) {
        return false;
      }
      // Require maxCompletionTokens for completions models
      if (data.purpose === LLMPurpose.COMPLETIONS && !data.maxCompletionTokens) {
        return false;
      }
      // Ensure maxCompletionTokens doesn't exceed maxTotalTokens
      if (data.maxCompletionTokens && data.maxCompletionTokens > data.maxTotalTokens) {
        return false;
      }
      return true;
    },
    {
      message: "Invalid model metadata configuration",
    },
  );

describe("LLM Router tests", () => {
  // Mock console.log to avoid noise in test output
  let mockConsoleLog: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  // Mock model metadata for testing
  const mockEmbeddingModelMetadata: ResolvedLLMModelMetadata = {
    modelKey: "GPT_EMBEDDINGS_ADA002",
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: 1536,
    maxTotalTokens: 8191,
  };

  const mockPrimaryModelMetadata: ResolvedLLMModelMetadata = {
    modelKey: "GPT_COMPLETIONS_GPT4",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  };

  // Helper function to create a mock LLM provider with proper typing
  const createMockLLMProvider = (): LLMProvider => {
    const mockProvider = {
      generateEmbeddings: jest.fn(),
      executeCompletionPrimary: jest.fn(),
      executeCompletionSecondary: jest.fn(),
      getModelsNames: jest.fn(() => ({
        embeddings: "text-embedding-ada-002",
        primaryCompletion: "gpt-4",
        secondaryCompletion: "gpt-3.5-turbo",
      })),
      getAvailableCompletionModelQualities: jest.fn(() => [
        LLMModelQuality.PRIMARY,
        LLMModelQuality.SECONDARY,
      ]),
      getEmbeddingModelDimensions: jest.fn(() => 1536),
      getModelFamily: jest.fn(() => "OpenAI"),
      getModelsMetadata: jest.fn(() => ({
        GPT_COMPLETIONS_GPT4: mockPrimaryModelMetadata,
        GPT_EMBEDDINGS_ADA002: mockEmbeddingModelMetadata,
      })),
      close: jest.fn(),
    } as unknown as LLMProvider;

    // Set up default mock return values with proper typing
    (mockProvider.generateEmbeddings as any).mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: [0.1, 0.2, 0.3, 0.4],
      request: "default test content",
      modelKey: "GPT_EMBEDDINGS_ADA002",
      context: {},
    });

    (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: "Default test completion",
      request: "default test prompt",
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: {},
    });

    (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: "Default secondary completion",
      request: "default test prompt",
      modelKey: "GPT_COMPLETIONS_GPT35",
      context: {},
    });

    return mockProvider;
  };

  // Helper function to create LLMRouter instance
  const createLLMRouter = (retryConfig: Record<string, unknown> = {}) => {
    const mockProvider = createMockLLMProvider();

    // Use test-friendly retry configuration by default
    const testRetryConfig = {
      maxRetryAttempts: 2,
      minRetryDelayMillis: 10,
      maxRetryDelayMillis: 100,
      requestTimeoutMillis: 1000,
      ...retryConfig,
    };

    // Create mock manifest
    const mockManifest: LLMProviderManifest = {
      modelFamily: "openai",
      providerName: "Mock OpenAI",
      envSchema: {} as any,
      models: {
        embeddings: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          purpose: LLMPurpose.EMBEDDINGS,
          urnEnvKey: "OPENAI_EMBEDDINGS_MODEL",
          maxTotalTokens: 8191,
        },
        primaryCompletion: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          purpose: LLMPurpose.COMPLETIONS,
          urnEnvKey: "OPENAI_COMPLETION_MODEL",
          maxTotalTokens: 8192,
          maxCompletionTokens: 4096,
        },
        secondaryCompletion: {
          modelKey: "GPT_COMPLETIONS_GPT35",
          purpose: LLMPurpose.COMPLETIONS,
          urnEnvKey: "OPENAI_SECONDARY_MODEL",
          maxTotalTokens: 4096,
          maxCompletionTokens: 2048,
        },
      },
      implementation: jest.fn().mockImplementation(() => mockProvider) as any,
      errorPatterns: [],
      providerSpecificConfig: testRetryConfig,
    };

    // Mock the manifest loader
    jest.spyOn(manifestLoader, "loadManifestForModelFamily").mockReturnValue(mockManifest);

    // Create mock EnvVars
    const mockEnvVars: Partial<EnvVars> = {
      LLM: "openai",
      OPENAI_EMBEDDINGS_MODEL: "text-embedding-ada-002",
      OPENAI_COMPLETION_MODEL: "gpt-4",
      OPENAI_SECONDARY_MODEL: "gpt-3.5-turbo",
    };

    // Create real instances for dependency injection testing
    const mockLLMStats = new LLMStats();
    const mockRetryStrategy = new RetryStrategy(mockLLMStats);
    // Create execution pipeline (strategies are now pure functions, not classes)
    const mockExecutionPipeline = new LLMExecutionPipeline(mockRetryStrategy, mockLLMStats);

    const mockErrorLogger = createMockErrorLogger();
    const mockConfig: LLMModuleConfig = {
      modelFamily: "openai",
      providerParams: mockEnvVars as unknown as Record<string, unknown>,
      resolvedModels: {
        embeddings: "text-embedding-3-large",
        primaryCompletion: "gpt-4o",
      },
      errorLogging: { errorLogDirectory: "/tmp", errorLogFilenameTemplate: "error.log" },
    };
    const router = new LLMRouter(mockConfig, mockExecutionPipeline, mockErrorLogger);
    return { router, mockProvider, mockManifest };
  };

  describe("Constructor and basic methods", () => {
    test("should create LLMRouter instance with correct initialization", () => {
      const { router, mockProvider } = createLLMRouter({
        maxRetryAttempts: 5,
        minRetryDelayMillis: 100,
        requestTimeoutMillis: 30000,
      });

      expect(router).toBeInstanceOf(LLMRouter);
      expect(mockProvider.getModelsMetadata).toHaveBeenCalled();
    });

    test("should return manifest via getLLMManifest()", () => {
      const { router, mockManifest } = createLLMRouter();
      const manifest = router.getLLMManifest();

      expect(manifest).toBeDefined();
      expect(manifest.modelFamily).toBe("openai");
      expect(manifest.providerName).toBe("Mock OpenAI");
      expect(manifest).toBe(mockManifest);
    });

    test("should return correct model family", () => {
      const { router } = createLLMRouter();
      expect(router.getModelFamily()).toBe("OpenAI");
    });

    test("should return correct models description", () => {
      const { router } = createLLMRouter();
      const description = router.getModelsUsedDescription();
      expect(description).toBe(
        "OpenAI (embeddings: text-embedding-ada-002, completions - primary: gpt-4, secondary: gpt-3.5-turbo)",
      );
    });

    test("should return embedded model dimensions", () => {
      const { router } = createLLMRouter();
      expect(router.getEmbeddingModelDimensions()).toBe(1536);
    });

    test("should call close on provider", async () => {
      const { router, mockProvider } = createLLMRouter();

      await router.shutdown();
      expect(mockProvider.close).toHaveBeenCalled();
    });
  });

  describe("LLM provider abstractions", () => {
    // Test data for mock model creation
    const mockModelsTestData = [
      {
        description: "embeddings model with purpose check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "purpose",
        expectedValue: LLMPurpose.EMBEDDINGS,
      },
      {
        description: "completion model with purpose check",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        property: "purpose",
        expectedValue: LLMPurpose.COMPLETIONS,
      },
      {
        description: "embeddings model with dimensions check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "dimensions",
        expectedValue: 1536,
      },
      {
        description: "completion model with maxCompletionTokens check",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        property: "maxCompletionTokens",
        expectedValue: 4096,
      },
      {
        description: "embeddings model with maxTotalTokens check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "maxTotalTokens",
        expectedValue: 8191,
      },
      {
        description: "embeddings model with urn check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "urn",
        expectedValue: "text-embedding-ada-002",
      },
      {
        description: "embeddings model with internalKey check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "modelKey",
        expectedValue: "GPT_EMBEDDINGS_ADA002",
      },
      {
        description: "completion model with maxTotalTokens check",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        property: "maxTotalTokens",
        expectedValue: 8192,
      },
    ];

    test.each(mockModelsTestData)(
      "create mock $description",
      ({ model, property, expectedValue }) => {
        const mockModel: ResolvedLLMModelMetadata = model;
        expect(mockModel[property as keyof ResolvedLLMModelMetadata]).toBe(expectedValue);
      },
    );
  });

  describe("Validate LLM metadata schemas", () => {
    // Test data for schema validation
    const validModelsTestData = [
      {
        description: "valid embeddings model",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        shouldPass: true,
      },
      {
        description: "valid completions model",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        shouldPass: true,
      },
    ];

    const invalidModelsTestData = [
      {
        description: "embeddings model without dimensions",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 8191,
        },
        shouldPass: false,
      },
      {
        description: "completions model without maxCompletionTokens",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxTotalTokens: 8192,
        },
        shouldPass: false,
      },
      {
        description: "model with maxCompletionTokens > maxTotalTokens",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 10000,
          maxTotalTokens: 8192,
        },
        shouldPass: false,
      },
      {
        description: "model with empty urn",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        shouldPass: false,
      },
    ];

    test.each(validModelsTestData)("$description passes validation", ({ model }) => {
      expect(() => llmModelMetadataSchema.parse(model)).not.toThrow();
    });

    test.each(invalidModelsTestData)("$description fails validation", ({ model }) => {
      expect(() => llmModelMetadataSchema.parse(model)).toThrow();
    });
  });

  describe("generateEmbeddings method", () => {
    test("should generate embeddings successfully", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockEmbeddings = [0.1, 0.2, 0.3, 0.4];
      (mockProvider.generateEmbeddings as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockEmbeddings,
        request: "test content",
        modelKey: "GPT_EMBEDDINGS_ADA002",
        context: {},
      });

      const result = await router.generateEmbeddings("test-resource", "test content");

      expect(result).toEqual(mockEmbeddings);
      expect(mockProvider.generateEmbeddings).toHaveBeenCalled();
    });

    test("should handle null response", async () => {
      const { router, mockProvider } = createLLMRouter({ maxRetryAttempts: 1 });
      (mockProvider.generateEmbeddings as any)
        .mockResolvedValueOnce({
          status: LLMResponseStatus.OVERLOADED,
          request: "test content",
          modelKey: "GPT_EMBEDDINGS_ADA002",
          context: {},
        })
        .mockResolvedValue(null);

      const result = await router.generateEmbeddings("test-resource", "test content");

      expect(result).toBeNull();
    });

    test("should return null for invalid embeddings response", async () => {
      const { router, mockProvider } = createLLMRouter();
      (mockProvider.generateEmbeddings as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: "invalid response",
        request: "test content",
        modelKey: "GPT_EMBEDDINGS_ADA002",
        context: {},
      });

      const result = await router.generateEmbeddings("test-resource", "test content");
      expect(result).toBeNull();
    });
  });

  describe("executeCompletion method", () => {
    test("should execute completion successfully", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = "This is a test completion";
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBe(mockCompletion);
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalled();
    });

    test("should execute completion with JSON response", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = { key: "value", number: 42 };
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: z.record(z.unknown()),
        },
        null,
      );

      expect(result).toEqual(mockCompletion);
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalledWith(
        "test prompt",
        expect.any(Object),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(z.ZodType),
        }),
      );
    });

    test("should use model quality override", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = "This is a test completion";
      (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: z.record(z.unknown()),
        },
        LLMModelQuality.SECONDARY,
      );

      expect(result).toBe(mockCompletion);
      expect(mockProvider.executeCompletionSecondary).toHaveBeenCalled();
    });

    test("should handle null response", async () => {
      const { router, mockProvider } = createLLMRouter({ maxRetryAttempts: 1 });
      (mockProvider.executeCompletionPrimary as any)
        .mockResolvedValueOnce({
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        })
        .mockResolvedValue({
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        });
      (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBeNull();
    });

    test("should return null for TEXT format with invalid type (type guard protection)", async () => {
      const { router } = createLLMRouter();
      // Mock the execution pipeline to return a failure result for invalid type
      jest.spyOn((router as any).executionPipeline, "execute").mockResolvedValue({
        success: false,
        error: new Error("Invalid response type"),
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      // Type guard now protects against invalid types, returning null instead
      expect(result).toBeNull();
    });

    test("should infer return type from Zod schema (type safety verification)", async () => {
      const { router, mockProvider } = createLLMRouter();
      const testSchema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const mockResponse = { name: "Test", age: 42 };
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      // Type inference: result should be z.infer<typeof testSchema> | null
      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
        null,
      );

      expect(result).toEqual(mockResponse);
      // Verify type inference: result should match schema type
      if (result) {
        const typedResult: z.infer<typeof testSchema> = result;
        expect(typedResult.name).toBe("Test");
        expect(typedResult.age).toBe(42);
      }
    });

    test("should return string type for TEXT format (overload resolution)", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockTextResponse = "This is a text response";
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockTextResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      // Type inference: result should be string | null for TEXT format
      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBe(mockTextResponse);
      // Verify type: result should be string | null when outputFormat is TEXT
      if (result !== null) {
        // Type inference now correctly types result as string (no cast needed)
        expect(typeof result).toBe("string");
      }
    });
  });

  describe("Advanced type inference validation", () => {
    test("should infer complex nested schema types correctly", async () => {
      const { router, mockProvider } = createLLMRouter();
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
          address: z.object({
            street: z.string(),
            city: z.string(),
          }),
        }),
        tags: z.array(z.string()),
      });

      const mockResponse = {
        user: {
          name: "John Doe",
          age: 30,
          address: {
            street: "123 Main St",
            city: "Springfield",
          },
        },
        tags: ["developer", "typescript"],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: nestedSchema,
        },
        null,
      );

      // Type inference should work for nested objects
      expect(result).toEqual(mockResponse);
      if (result) {
        const typedResult: z.infer<typeof nestedSchema> = result;
        expect(typedResult.user.name).toBe("John Doe");
        expect(typedResult.user.address.city).toBe("Springfield");
        expect(typedResult.tags).toContain("developer");
      }
    });

    test("should handle discriminated union type narrowing after success check", async () => {
      const { router, mockProvider } = createLLMRouter();
      const testSchema = z.object({
        status: z.literal("success"),
        data: z.string(),
      });

      const mockResponse = {
        status: "success" as const,
        data: "test data",
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
        null,
      );

      // After checking for null, TypeScript should narrow the type
      expect(result).not.toBeNull();
      if (result !== null) {
        // Type should be fully inferred here without casts
        const typedResult: z.infer<typeof testSchema> = result;
        expect(typedResult.status).toBe("success");
        expect(typedResult.data).toBe("test data");
      }
    });

    test("should validate InferResponseType helper with various schema types", async () => {
      const { router, mockProvider } = createLLMRouter();

      // Test with array schema
      const arraySchema = z.array(z.object({ id: z.number(), name: z.string() }));
      const mockArrayResponse = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockArrayResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: arraySchema,
        },
        null,
      );

      expect(result).toEqual(mockArrayResponse);
      if (result) {
        const typedResult: z.infer<typeof arraySchema> = result;
        expect(Array.isArray(typedResult)).toBe(true);
        expect(typedResult[0].name).toBe("Item 1");
      }
    });

    test("should handle optional and nullable fields in schema", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schemaWithOptionals = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
        optionalNullable: z.string().optional().nullable(),
      });

      const mockResponse = {
        required: "always present",
        optional: "sometimes present",
        nullable: null,
        // optionalNullable intentionally omitted
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schemaWithOptionals,
        },
        null,
      );

      expect(result).toEqual(mockResponse);
      if (result) {
        const typedResult: z.infer<typeof schemaWithOptionals> = result;
        expect(typedResult.required).toBe("always present");
        expect(typedResult.optional).toBe("sometimes present");
        expect(typedResult.nullable).toBeNull();
      }
    });

    test("should demonstrate type safety without assertions after discriminated union check", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({
        count: z.number(),
        items: z.array(z.string()),
      });

      const mockResponse = {
        count: 3,
        items: ["one", "two", "three"],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
        null,
      );

      // This test demonstrates that after the null check, the type is correctly inferred
      // without needing any type assertions
      expect(result).not.toBeNull();
      if (result !== null) {
        // No 'as' cast needed - type is inferred from schema
        expect(result.count).toBe(3);
        expect(result.items).toHaveLength(3);
        expect(result.items[0]).toBe("one");
      }
    });

    test("should handle union types in schema", async () => {
      const { router, mockProvider } = createLLMRouter();
      const unionSchema = z.object({
        value: z.union([z.string(), z.number(), z.boolean()]),
      });

      const mockResponse = {
        value: "string value",
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: unionSchema,
        },
        null,
      );

      expect(result).toEqual(mockResponse);
      if (result) {
        const typedResult: z.infer<typeof unionSchema> = result;
        expect(typeof typedResult.value).toBe("string");
      }
    });

    test("should validate compile-time type checking with schema inference", () => {
      // This test validates compile-time behavior
      const _schema = z.object({
        id: z.string(),
        count: z.number(),
      });

      type InferredType = z.infer<typeof _schema>;

      // These should compile correctly
      const validData: InferredType = {
        id: "123",
        count: 42,
      };

      expect(validData.id).toBe("123");
      expect(validData.count).toBe(42);

      // TypeScript should catch type errors at compile time
      // Uncommenting the following would cause a compile error:
      // const invalidData: InferredType = {
      //   id: 123,  // Type error: should be string
      //   count: "42"  // Type error: should be number
      // };
    });
  });

  describe("Error handling and edge cases", () => {
    test("should handle LLM provider throwing unexpected errors", async () => {
      const { router, mockProvider } = createLLMRouter();
      (mockProvider.executeCompletionPrimary as any).mockRejectedValue(
        new Error("Unexpected LLM error"),
      );
      (mockProvider.executeCompletionSecondary as any).mockRejectedValue(
        new Error("Unexpected LLM error"),
      );

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBeNull();
    });

    test("should handle prompt that becomes empty after cropping", async () => {
      const { router, mockProvider } = createLLMRouter({ maxRetryAttempts: 1 });

      // First call returns EXCEEDED status
      (mockProvider.executeCompletionPrimary as any).mockResolvedValueOnce({
        status: LLMResponseStatus.EXCEEDED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        tokensUsage: {
          promptTokens: 8000,
          completionTokens: 500,
          maxTotalTokens: 8192,
        } as LLMResponseTokensUsage,
      });
      (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      // Mock the execution pipeline to return error result when prompt becomes empty after cropping
      jest.spyOn((router as any).executionPipeline, "execute").mockResolvedValue({
        success: false,
        error: new Error("Prompt became empty after cropping"),
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBeNull();
    });

    test("should handle completion with null generated content", async () => {
      const { router, mockProvider } = createLLMRouter();
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: null,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });
      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBeNull();
    });

    test("should properly handle context modification during execution", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = "Test completion";
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBe(mockCompletion);
    });
  });

  describe("Integration tests", () => {
    test("should handle complete workflow with model switching", async () => {
      const { router, mockProvider } = createLLMRouter({
        maxRetryAttempts: 2,
        minRetryDelayMillis: 10,
        requestTimeoutMillis: 1000,
      });

      // Primary fails with overloaded
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      // Secondary succeeds
      const mockCompletion = "Secondary completion success";
      (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBe(mockCompletion);
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalled();
      expect(mockProvider.executeCompletionSecondary).toHaveBeenCalled();
    });

    test("should handle complete workflow with prompt cropping", async () => {
      const { router, mockProvider } = createLLMRouter({
        maxRetryAttempts: 2,
        minRetryDelayMillis: 10,
        requestTimeoutMillis: 1000,
      });

      // Simplified test: primary returns exceeded, fallback to secondary succeeds
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.EXCEEDED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        tokensUsage: {
          promptTokens: 8000,
          completionTokens: 500,
          maxTotalTokens: 8192,
        } as LLMResponseTokensUsage,
      });
      (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: "Secondary completion success",
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "Very long test prompt that exceeds token limits",
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
        null,
      );

      expect(result).toBe("Secondary completion success");
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalled();
      expect(mockProvider.executeCompletionSecondary).toHaveBeenCalled();
    });

    test("should handle embeddings workflow", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockEmbeddings = [0.1, 0.2, 0.3];

      (mockProvider.generateEmbeddings as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockEmbeddings,
        request: "test content",
        modelKey: "GPT_EMBEDDINGS_ADA002",
        context: {},
      });

      const result = await router.generateEmbeddings("test-resource", "test content");

      expect(result).toEqual(mockEmbeddings);
      // Embeddings are now called directly without options since they don't use schema-based inference
      expect(mockProvider.generateEmbeddings).toHaveBeenCalledWith(
        "test content",
        expect.objectContaining({
          resource: "test-resource",
          purpose: LLMPurpose.EMBEDDINGS,
        }),
      );
    });
  });
});
