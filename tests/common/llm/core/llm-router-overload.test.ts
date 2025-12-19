import { z } from "zod";
import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import LLMStats from "../../../../src/common/llm/tracking/llm-stats";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import { createMockErrorLogger } from "../../helpers/llm/mock-error-logger";
import {
  LLMPurpose,
  LLMResponseStatus,
  LLMProvider,
  LLMModelQuality,
  ResolvedLLMModelMetadata,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm.types";
import type { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import type { LLMModuleConfig } from "../../../../src/common/llm/config/llm-module-config.types";
import * as manifestLoader from "../../../../src/common/llm/utils/manifest-loader";

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

  // Helper to create mock LLM provider
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
      needsForcedShutdown: jest.fn(() => false),
    } as unknown as LLMProvider;

    (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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
      providerSpecificConfig: {
        maxRetryAttempts: 2,
        minRetryDelayMillis: 10,
        maxRetryDelayMillis: 100,
        requestTimeoutMillis: 1000,
      },
    };

    jest.spyOn(manifestLoader, "loadManifestForModelFamily").mockReturnValue(mockManifest);

    const mockLLMStats = new LLMStats();
    const mockRetryStrategy = new RetryStrategy(mockLLMStats);
    const mockExecutionPipeline = new LLMExecutionPipeline(mockRetryStrategy, mockLLMStats);
    const mockErrorLogger = createMockErrorLogger();

    const mockConfig: LLMModuleConfig = {
      modelFamily: "openai",
      providerParams: {},
      resolvedModels: {
        embeddings: "text-embedding-3-large",
        primaryCompletion: "gpt-4o",
      },
      errorLogging: { errorLogDirectory: "/tmp", errorLogFilenameTemplate: "error.log" },
    };

    const router = new LLMRouter(mockConfig, mockExecutionPipeline, mockErrorLogger);
    return { router, mockProvider };
  };

  describe("Overload Resolution Tests", () => {
    test("should resolve JSON overload with schema", async () => {
      const { router, mockProvider } = createLLMRouter();
      const testSchema = z.object({ message: z.string() });
      const mockResponse = { message: "test response" };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      // This should resolve to the JSON overload
      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: testSchema,
      });

      expect(result).toEqual(mockResponse);
      // TypeScript should infer result as z.infer<typeof testSchema> | null
      if (result !== null) {
        const message: string = result.message; // No cast needed
        expect(message).toBe("test response");
      }
    });

    test("should resolve TEXT overload without schema", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockResponse = "Plain text response";

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockResponse,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      // This should resolve to the TEXT overload
      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result).toBe(mockResponse);
      // TypeScript should infer result as string | null
      if (result !== null) {
        const text: string = result; // No cast needed
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

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      expect(result).toEqual(mockUser);
      if (result) {
        // Direct property access without casts
        const id: number = result.id;
        const name: string = result.name;
        const active: boolean = result.active;
        expect(id).toBe(1);
        expect(name).toBe("Alice");
        expect(active).toBe(true);
      }
    });
  });

  describe("Complex Schema Type Inference", () => {
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
          profile: {
            firstName: "John",
            lastName: "Doe",
          },
          age: 30,
        },
        metadata: {
          created: "2024-01-01",
          updated: "2024-01-02",
        },
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        // Deep property access without casts
        const firstName: string = result.user.profile.firstName;
        const age: number = result.user.age;
        const created: string = result.metadata.created;
        expect(firstName).toBe("John");
        expect(age).toBe(30);
        expect(created).toBe("2024-01-01");
      }
    });

    test("should infer array types correctly", async () => {
      const { router, mockProvider } = createLLMRouter();
      const arraySchema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            label: z.string(),
          }),
        ),
      });

      const mockData = {
        items: [
          { id: 1, label: "First" },
          { id: 2, label: "Second" },
        ],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        // Array operations without casts
        expect(Array.isArray(result.items)).toBe(true);
        expect(result.items).toHaveLength(2);
        const firstItem = result.items[0];
        expect(firstItem.id).toBe(1);
        expect(firstItem.label).toBe("First");

        // Array methods work without casts
        const labels = result.items.map((item) => item.label);
        expect(labels).toEqual(["First", "Second"]);
      }
    });

    test("should infer union types correctly", async () => {
      const { router, mockProvider } = createLLMRouter();
      const unionSchema = z.object({
        status: z.union([z.literal("success"), z.literal("error"), z.literal("pending")]),
        value: z.union([z.string(), z.number()]),
      });

      const mockData = {
        status: "success" as const,
        value: "test value",
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: unionSchema,
      });

      if (result) {
        // Union types should be properly narrowed
        expect(result.status).toBe("success");
        expect(typeof result.value).toBe("string");
      }
    });

    test("should handle optional and nullable fields", async () => {
      const { router, mockProvider } = createLLMRouter();
      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
        both: z.string().optional().nullable(),
      });

      const mockData = {
        required: "always here",
        optional: "sometimes here",
        nullable: null,
        // 'both' is intentionally omitted
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        expect(result.required).toBe("always here");
        expect(result.optional).toBe("sometimes here");
        expect(result.nullable).toBeNull();
        expect(result.both).toBeUndefined();
      }
    });
  });

  describe("Compile-Time Type Checking", () => {
    test("should not require type assertions after null check", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({
        count: z.number(),
        items: z.array(z.string()),
      });
      const mockData = { count: 3, items: ["a", "b", "c"] };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      // After null check, no type assertions needed
      expect(result).not.toBeNull();
      if (result !== null) {
        // All these should work without casts
        expect(result.count).toBe(3);
        expect(result.items.length).toBe(3);
        expect(result.items[0]).toBe("a");
      }
    });

    test("should support property access without casts", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({
        data: z.object({
          value: z.number(),
        }),
      });
      const mockData = { data: { value: 42 } };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        // Nested property access without casts
        const value = result.data.value;
        expect(value).toBe(42);
        expect(typeof value).toBe("number");
      }
    });

    test("should support destructuring without casts", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string(),
      });
      const mockData = { name: "Alice", age: 25, email: "alice@example.com" };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        // Destructuring should work without casts
        const { name, age, email } = result;
        expect(name).toBe("Alice");
        expect(age).toBe(25);
        expect(email).toBe("alice@example.com");
      }
    });

    test("should support spread operator without casts", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({
        items: z.array(z.number()),
      });
      const mockData = { items: [1, 2, 3] };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        // Spread operator should work without casts
        const spreadItems = [...result.items];
        expect(spreadItems).toEqual([1, 2, 3]);

        const doubled = result.items.map((x) => x * 2);
        expect(doubled).toEqual([2, 4, 6]);
      }
    });
  });

  describe("TEXT Overload Specific Tests", () => {
    test("should return string for TEXT format", async () => {
      const { router, mockProvider } = createLLMRouter();
      const textResponse = "This is plain text";

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: textResponse,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(typeof result).toBe("string");
      expect(result).toBe(textResponse);

      // String operations should work without casts
      if (result) {
        const upper = result.toUpperCase();
        expect(upper).toBe("THIS IS PLAIN TEXT");

        const length = result.length;
        expect(length).toBe(18);
      }
    });

    test("should return null for failed TEXT completion", async () => {
      const { router, mockProvider } = createLLMRouter();

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result).toBeNull();
    });
  });

  describe("Null Handling with Type Safety", () => {
    test("should handle null response with correct type for JSON", async () => {
      const { router, mockProvider } = createLLMRouter();
      const schema = z.object({ value: z.string() });

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.INVALID,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      (mockProvider.executeCompletionSecondary as any).mockResolvedValue({
        status: LLMResponseStatus.INVALID,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(result).toBeNull();
      // Type should be z.infer<typeof schema> | null
      if (result === null) {
        expect(result).toBeNull();
      } else {
        // This branch shouldn't execute
        expect(false).toBe(true);
      }
    });

    test("should handle null response with correct type for TEXT", async () => {
      const { router, mockProvider } = createLLMRouter();

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.ERRORED,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        error: new Error("Test error"),
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result).toBeNull();
      // Type should be string | null
    });
  });

  describe("Edge Cases and Advanced Scenarios", () => {
    test("should handle enum types in schema", async () => {
      const { router, mockProvider } = createLLMRouter();
      const enumSchema = z.object({
        priority: z.enum(["low", "medium", "high"]),
        category: z.enum(["bug", "feature", "documentation"]),
      });

      const mockData = {
        priority: "high" as const,
        category: "bug" as const,
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        expect(result.priority).toBe("high");
        expect(result.category).toBe("bug");
      }
    });

    test("should handle recursive/nested array structures", async () => {
      const { router, mockProvider } = createLLMRouter();
      const recursiveSchema = z.object({
        tree: z.array(
          z.object({
            id: z.number(),
            children: z.array(
              z.object({
                id: z.number(),
                value: z.string(),
              }),
            ),
          }),
        ),
      });

      const mockData = {
        tree: [
          {
            id: 1,
            children: [
              { id: 11, value: "child1" },
              { id: 12, value: "child2" },
            ],
          },
          {
            id: 2,
            children: [{ id: 21, value: "child3" }],
          },
        ],
      };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockData,
        request: "test",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: recursiveSchema,
      });

      if (result) {
        expect(result.tree).toHaveLength(2);
        expect(result.tree[0].children).toHaveLength(2);
        expect(result.tree[0].children[0].value).toBe("child1");
      }
    });

    test("should handle discriminated unions correctly", async () => {
      const { router, mockProvider } = createLLMRouter();
      const discriminatedSchema = z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]);

      const mockData = { type: "text" as const, content: "Hello" };

      (mockProvider.executeCompletionPrimary as any).mockResolvedValue({
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

      if (result) {
        if (result.type === "text") {
          // TypeScript should narrow the type here
          expect(result.content).toBe("Hello");
        }
      }
    });
  });
});
