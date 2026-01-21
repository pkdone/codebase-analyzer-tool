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
import { isOk, isErr } from "../../../../src/common/types/result.types";

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

describe("LLMRouter Function Overloads - Type Safety Tests", () => {
  let mockConsoleLog: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  // Mock model metadata
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

  // Helper to create mock LLM provider
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
      getProviderFamily: jest.fn(() => "OpenAI GPT"),
      getModelsMetadata: jest.fn(() => ({
        GPT_COMPLETIONS_GPT4: mockPrimaryModelMetadata,
        GPT_EMBEDDINGS_ADA002: mockEmbeddingModelMetadata,
      })),
      close: jest.fn(),
      getShutdownBehavior: jest.fn(() => ShutdownBehavior.GRACEFUL),
    } as unknown as LLMProvider;

    (mockProvider.executeCompletion as any).mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: "Default test completion",
      request: "default test prompt",
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: {},
    });

    return mockProvider;
  };

  // Helper to create LLMRouter instance
  const createLLMRouter = () => {
    const mockProvider = createMockLLMProvider();

    const mockManifest: LLMProviderManifest = {
      providerFamily: "test",
      envSchema: {} as any,
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
      implementation: jest.fn().mockImplementation(() => mockProvider) as any,
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

  describe("Overload Resolution Tests with Result Type", () => {
    test("should resolve JSON overload with schema and return Result", async () => {
      const { router, mockProvider } = createLLMRouter();
      const testSchema = z.object({ message: z.string() });
      const mockResponse = { message: "test response" };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: testSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockResponse);
        const message: string = result.value.message;
        expect(message).toBe("test response");
      }
    });

    test("should resolve TEXT overload without schema and return Result", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockResponse = "Plain text response";

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(mockResponse);
        const text: string = result.value;
        expect(typeof text).toBe("string");
      }
    });

    test("should infer return type from schema in JSON mode", async () => {
      const { router, mockProvider } = createLLMRouter();
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      });
      const mockUser = { id: 1, name: "Alice", active: true };

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockUser,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockUser);
        const id: number = result.value.id;
        const name: string = result.value.name;
        const active: boolean = result.value.active;
        expect(id).toBe(1);
        expect(name).toBe("Alice");
        expect(active).toBe(true);
      }
    });
  });

  describe("Complex Schema Type Inference with Result", () => {
    test("should infer nested object types correctly", async () => {
      const { router, mockProvider } = createLLMRouter();
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string(),
            lastName: z.string(),
          }),
          age: z.number(),
        }),
        metadata: z.object({
          created: z.string(),
          updated: z.string(),
        }),
      });

      const mockData = {
        user: {
          profile: { firstName: "John", lastName: "Doe" },
          age: 30,
        },
        metadata: { created: "2024-01-01", updated: "2024-01-02" },
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
        jsonSchema: nestedSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const firstName: string = result.value.user.profile.firstName;
        const age: number = result.value.user.age;
        const created: string = result.value.metadata.created;
        expect(firstName).toBe("John");
        expect(age).toBe(30);
        expect(created).toBe("2024-01-01");
      }
    });

    test("should infer array types correctly", async () => {
      const { router, mockProvider } = createLLMRouter();
      const arraySchema = z.object({
        items: z.array(z.object({ id: z.number(), label: z.string() })),
      });

      const mockData = {
        items: [
          { id: 1, label: "First" },
          { id: 2, label: "Second" },
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
        expect(Array.isArray(result.value.items)).toBe(true);
        expect(result.value.items).toHaveLength(2);
        const firstItem = result.value.items[0];
        expect(firstItem.id).toBe(1);
        expect(firstItem.label).toBe("First");
        const labels = result.value.items.map((item) => item.label);
        expect(labels).toEqual(["First", "Second"]);
      }
    });
  });

  describe("Error Handling with Result Type", () => {
    test("should return Err result for failed JSON completion", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({ value: z.string() });

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.INVALID,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.INVALID,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeDefined();
      }
    });

    test("should return Err result for failed TEXT completion", async () => {
      const { router, mockProvider } = createLLMRouter();

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.ERRORED,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        error: new Error("Test error"),
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(isErr(result)).toBe(true);
    });
  });

  describe("TEXT Overload Specific Tests with Result", () => {
    test("should return Ok result with string for TEXT format", async () => {
      const { router, mockProvider } = createLLMRouter();
      const textResponse = "This is plain text";

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
        expect(typeof result.value).toBe("string");
        expect(result.value).toBe(textResponse);
        const upper = result.value.toUpperCase();
        expect(upper).toBe("THIS IS PLAIN TEXT");
        const length = result.value.length;
        expect(length).toBe(18);
      }
    });
  });

  describe("Type Guards and Narrowing", () => {
    test("isOk narrows Result type correctly", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({ count: z.number() });
      const mockData = { count: 42 };

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

      // isOk narrows the type to OkResult
      if (isOk(result)) {
        // TypeScript allows accessing value
        expect(result.value.count).toBe(42);
      } else {
        // TypeScript knows this is ErrResult
        expect(result.error).toBeDefined();
      }
    });

    test("isErr narrows Result type correctly", async () => {
      const { router, mockProvider } = createLLMRouter();

      (mockProvider.executeCompletion as any).mockResolvedValue({
        status: LLMResponseStatus.ERRORED,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        error: new Error("Test"),
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      // isErr narrows the type to ErrResult
      if (isErr(result)) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toBeDefined();
      }
    });
  });
});
