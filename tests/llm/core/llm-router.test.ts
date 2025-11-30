import "reflect-metadata";
import {
  LLMPurpose,
  LLMResponseStatus,
  LLMProvider,
  LLMModelQuality,
  ResolvedLLMModelMetadata,
  LLMResponseTokensUsage,
  LLMOutputFormat,
} from "../../../src/llm/types/llm.types";

import { z } from "zod";
import LLMRouter from "../../../src/llm/llm-router";
import LLMStats from "../../../src/llm/tracking/llm-stats";
import { PromptAdaptationStrategy } from "../../../src/llm/strategies/prompt-adaptation-strategy";
import { RetryStrategy } from "../../../src/llm/strategies/retry-strategy";
import { FallbackStrategy } from "../../../src/llm/strategies/fallback-strategy";
import { LLMExecutionPipeline } from "../../../src/llm/llm-execution-pipeline";
import type { EnvVars } from "../../../src/env/env.types";
import { describe, test, expect, jest } from "@jest/globals";
import type { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";
import * as manifestLoader from "../../../src/llm/utils/manifest-loader";

// Mock the dependencies
// Note: extractTokensAmountFromMetadataDefaultingMissingValues and
// postProcessAsJSONIfNeededGeneratingNewResult have been moved to AbstractLLM class

jest.mock("../../../src/common/utils/logging", () => ({
  logOneLineWarning: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../src/llm/tracking/llm-stats", () => {
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
    const mockPromptAdaptationStrategy = new PromptAdaptationStrategy();
    const mockRetryStrategy = new RetryStrategy(mockLLMStats);
    const mockFallbackStrategy = new FallbackStrategy();
    // Create execution pipeline with strategies
    const mockExecutionPipeline = new LLMExecutionPipeline(
      mockRetryStrategy,
      mockFallbackStrategy,
      mockPromptAdaptationStrategy,
      mockLLMStats,
    );

    const router = new LLMRouter("openai", mockEnvVars as EnvVars, mockExecutionPipeline);
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

      await router.close();
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
        },
        null,
      );

      expect(result).toEqual(mockCompletion);
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalledWith(
        "test prompt",
        expect.any(Object),
        {
          outputFormat: LLMOutputFormat.JSON,
        },
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
      expect(mockProvider.generateEmbeddings).toHaveBeenCalledWith(
        "test content",
        expect.objectContaining({
          resource: "test-resource",
          purpose: LLMPurpose.EMBEDDINGS,
        }),
        undefined,
      );
    });
  });
});
