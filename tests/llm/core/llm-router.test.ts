/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import {
  LLMPurpose,
  LLMResponseStatus,
  LLMProviderImpl,
  LLMModelQuality,
  ResolvedLLMModelMetadata,
  LLMResponseTokensUsage,
  LLMOutputFormat,
} from "../../../src/llm/llm.types";

import { z } from "zod";
import LLMRouter from "../../../src/llm/core/llm-router";
import LLMStats from "../../../src/llm/processing/routerTracking/llm-stats";
import { PromptAdaptationStrategy } from "../../../src/llm/core/strategies/prompt-adaptation-strategy";
import { LLMService } from "../../../src/llm/core/llm-service";
import { RetryStrategy } from "../../../src/llm/core/strategies/retry-strategy";
import { FallbackStrategy } from "../../../src/llm/core/strategies/fallback-strategy";
import type { EnvVars } from "../../../src/lifecycle/env.types";
import { describe, test, expect, jest } from "@jest/globals";
import type { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";

// Mock the dependencies
// Note: extractTokensAmountFromMetadataDefaultingMissingValues and
// postProcessAsJSONIfNeededGeneratingNewResult have been moved to AbstractLLM class

jest.mock("../../../src/llm/processing/routerTracking/llm-router-logging", () => ({
  log: jest.fn(),
  logErrWithContext: jest.fn(),
  logWithContext: jest.fn(),
}));

jest.mock("../../../src/llm/processing/routerTracking/llm-stats", () => {
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
  const createMockLLMProvider = (): LLMProviderImpl => {
    const mockProvider = {
      generateEmbeddings: jest.fn(),
      executeCompletionPrimary: jest.fn(),
      executeCompletionSecondary: jest.fn(),
      getModelsNames: jest.fn(() => ["text-embedding-ada-002", "gpt-4", "gpt-3.5-turbo"]),
      getAvailableCompletionModelQualities: jest.fn(() => [
        LLMModelQuality.PRIMARY,
        LLMModelQuality.SECONDARY,
      ]),
      getEmbeddedModelDimensions: jest.fn(() => 1536),
      getModelFamily: jest.fn(() => "OpenAI"),
      getModelsMetadata: jest.fn(() => ({
        GPT_COMPLETIONS_GPT4: mockPrimaryModelMetadata,
        GPT_EMBEDDINGS_ADA002: mockEmbeddingModelMetadata,
      })),
      getProviderSpecificConfig: jest.fn().mockReturnValue({}),
      close: jest.fn(),
    } as unknown as LLMProviderImpl;

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
      maxRetryAdditionalDelayMillis: 10,
      requestTimeoutMillis: 1000,
      ...retryConfig,
    };

    // Create mock LLMService
    const mockLLMService: Partial<LLMService> = {
      getLLMProvider: jest.fn().mockReturnValue(mockProvider) as jest.MockedFunction<
        (env: EnvVars) => LLMProviderImpl
      >,
      getLLMManifest: jest.fn().mockReturnValue({
        modelFamily: "OpenAI",
        providerName: "Mock OpenAI",
        providerSpecificConfig: testRetryConfig,
      }) as jest.MockedFunction<() => LLMProviderManifest>,
    };

    // Create mock EnvVars
    const mockEnvVars: Partial<EnvVars> = {
      LLM: "openai",
      // Add other required env vars as needed for tests
    };

    // Create real instances for dependency injection testing
    const mockLLMStats = new LLMStats();
    const mockPromptAdaptationStrategy = new PromptAdaptationStrategy();
    const mockRetryStrategy = new RetryStrategy(mockLLMStats);
    const mockFallbackStrategy = new FallbackStrategy();
    const router = new LLMRouter(
      mockLLMService as LLMService,
      mockEnvVars as EnvVars,
      mockLLMStats,
      mockRetryStrategy,
      mockFallbackStrategy,
      mockPromptAdaptationStrategy,
    );
    return { router, mockProvider };
  };

  describe("Constructor and basic methods", () => {
    test("should create LLMRouter instance with correct initialization", () => {
      const { router, mockProvider } = createLLMRouter({
        maxRetryAttempts: 5,
        minRetryDelayMillis: 100,
        maxRetryAdditionalDelayMillis: 500,
        requestTimeoutMillis: 30000,
      });

      expect(router).toBeInstanceOf(LLMRouter);
      expect(mockProvider.getModelsMetadata).toHaveBeenCalled();
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
      expect(router.getEmbeddedModelDimensions()).toBe(1536);
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

    test("should return response as-is for TEXT format even with invalid type", async () => {
      const { router, mockProvider } = createLLMRouter();
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: 12345 as any, // Invalid response type - number instead of string/object
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

      expect(result).toBe(12345);
    });
  });

  describe("Statistics display methods", () => {
    test("should display LLM status summary", () => {
      const mockLog = jest.fn();
      const mockTable = jest.fn();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(mockLog);
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      const { router } = createLLMRouter();
      router.displayLLMStatusSummary();

      expect(consoleSpy).toHaveBeenCalledWith("LLM inovocation event types that will be recorded:");
      expect(consoleTableSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleTableSpy.mockRestore();
    });

    test("should display LLM status details", () => {
      const mockTable = jest.fn();
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      const { router } = createLLMRouter();
      router.displayLLMStatusDetails();

      expect(consoleTableSpy).toHaveBeenCalledWith(expect.any(Object));

      consoleTableSpy.mockRestore();
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
        tokensUage: {
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

      // Mock the prompt adaptation strategy to return empty string after adaptation
      jest
        .spyOn((router as any).promptAdaptationStrategy, "adaptPromptFromResponse")
        .mockReturnValue("");

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
        maxRetryAdditionalDelayMillis: 10,
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
        maxRetryAdditionalDelayMillis: 10,
        requestTimeoutMillis: 1000,
      });

      // Simplified test: primary returns exceeded, fallback to secondary succeeds
      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.EXCEEDED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        tokensUage: {
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
