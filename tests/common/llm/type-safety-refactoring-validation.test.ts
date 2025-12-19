import { describe, test, expect, beforeEach } from "@jest/globals";
import { z } from "zod";
import {
  LLMFunction,
  LLMCompletionOptions,
  LLMFunctionResponse,
  LLMContext,
  LLMOutputFormat,
  LLMPurpose,
  LLMResponseStatus,
  LLMModelQuality,
  InferResponseType,
  ResolvedLLMModelMetadata,
} from "../../../src/common/llm/types/llm.types";
import { RetryStrategy } from "../../../src/common/llm/strategies/retry-strategy";
import { LLMExecutionPipeline } from "../../../src/common/llm/llm-execution-pipeline";
import LLMStats from "../../../src/common/llm/tracking/llm-stats";

/**
 * Test suite validating the type safety refactoring for the LLM call chain.
 *
 * These tests verify that generic schema types propagate correctly through:
 * - LLMFunction type definition
 * - RetryStrategy.executeWithRetries
 * - LLMExecutionPipeline.iterateOverLLMFunctions
 *
 * The refactoring enables better type safety through the call chain using
 * z.infer<S> for schema-based type inference.
 */
describe("Type Safety Refactoring Validation", () => {
  const mockContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
    modelQuality: LLMModelQuality.PRIMARY,
    outputFormat: LLMOutputFormat.JSON,
  };

  const mockRetryConfig = {
    requestTimeoutMillis: 60000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 5000,
  };

  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    "test-model": {
      modelKey: "test-model",
      urn: "test-model-urn",
      purpose: LLMPurpose.COMPLETIONS,
      maxTotalTokens: 8192,
      maxCompletionTokens: 4096,
    },
  };

  /**
   * Helper to create a mock LLM function that returns typed responses.
   * Uses the generic schema type to ensure type safety.
   */
  function createTypedMockLLMFunction(mockData: unknown): LLMFunction {
    return async <S extends z.ZodType>(
      _content: string,
      _context: LLMContext,
      _options?: LLMCompletionOptions<S>,
    ): Promise<LLMFunctionResponse<z.infer<S>>> => {
      return {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: mockContext,
        generated: mockData as z.infer<S>,
      };
    };
  }

  describe("LLMFunction Type with InferResponseType", () => {
    test("should return correctly typed response for object schema", async () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
      });

      type UserType = z.infer<typeof userSchema>;

      const mockUser: UserType = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      const mockLLMFunction = createTypedMockLLMFunction(mockUser);

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();

      // Validate runtime behavior - the generated content should match
      // Type narrowing: we've already asserted generated is defined
      const generated = result.generated!;
      expect(generated.id).toBe(1);
      expect(generated.name).toBe("Test User");
      expect(generated.email).toBe("test@example.com");
    });

    test("should return string for TEXT format", async () => {
      const mockLLMFunction = createTypedMockLLMFunction("Plain text response");

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(typeof result.generated).toBe("string");
      expect(result.generated).toBe("Plain text response");
    });

    test("should handle array schema types correctly", async () => {
      const itemsSchema = z.array(
        z.object({
          id: z.string(),
          value: z.number(),
        }),
      );

      type ItemsType = z.infer<typeof itemsSchema>;

      const mockItems: ItemsType = [
        { id: "item1", value: 10 },
        { id: "item2", value: 20 },
      ];

      const mockLLMFunction = createTypedMockLLMFunction(mockItems);

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: itemsSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(Array.isArray(result.generated)).toBe(true);
      const generated = result.generated as unknown as ItemsType;
      expect(generated.length).toBe(2);
      expect(generated[0].id).toBe("item1");
      expect(generated[1].value).toBe(20);
    });
  });

  describe("RetryStrategy Type Propagation", () => {
    let retryStrategy: RetryStrategy;
    let llmStats: LLMStats;

    beforeEach(() => {
      llmStats = new LLMStats();
      retryStrategy = new RetryStrategy(llmStats);
    });

    test("should propagate schema type through executeWithRetries", async () => {
      const productSchema = z.object({
        sku: z.string(),
        name: z.string(),
        price: z.number(),
        inStock: z.boolean(),
      });

      type ProductType = z.infer<typeof productSchema>;

      const mockProduct: ProductType = {
        sku: "PROD-001",
        name: "Test Product",
        price: 29.99,
        inStock: true,
      };

      const mockLLMFunction = createTypedMockLLMFunction(mockProduct);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockRetryConfig,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: productSchema,
        },
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.COMPLETED);

      // The type should flow through - validate runtime values
      // Type narrowing: we've already asserted result is not null
      const product = result!.generated!;
      expect(product.sku).toBe("PROD-001");
      expect(product.name).toBe("Test Product");
      expect(product.price).toBe(29.99);
      expect(product.inStock).toBe(true);
    });

    test("should handle nested schema types through retry", async () => {
      const nestedSchema = z.object({
        user: z.object({
          id: z.number(),
          profile: z.object({
            displayName: z.string(),
            avatar: z.string().optional(),
          }),
        }),
        settings: z.object({
          theme: z.enum(["light", "dark"]),
          notifications: z.boolean(),
        }),
      });

      type NestedType = z.infer<typeof nestedSchema>;

      const mockData: NestedType = {
        user: {
          id: 42,
          profile: {
            displayName: "TestUser",
          },
        },
        settings: {
          theme: "dark",
          notifications: true,
        },
      };

      const mockLLMFunction = createTypedMockLLMFunction(mockData);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockRetryConfig,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: nestedSchema,
        },
      );

      expect(result).not.toBeNull();
      // Type narrowing: we've already asserted result is not null
      const data = result!.generated!;
      expect(data.user.id).toBe(42);
      expect(data.user.profile.displayName).toBe("TestUser");
      expect(data.settings.theme).toBe("dark");
    });

    test("should return null when all retries exhausted", async () => {
      const schema = z.object({ value: z.string() });

      // Create a function that always returns OVERLOADED
      const failingFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse<z.infer<S>>> => {
        return {
          status: LLMResponseStatus.OVERLOADED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
        };
      };

      const result = await retryStrategy.executeWithRetries(
        failingFunction,
        "test prompt",
        mockContext,
        { ...mockRetryConfig, maxRetryAttempts: 1 },
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
      );

      expect(result).toBeNull();
    });
  });

  describe("LLMExecutionPipeline Type Propagation", () => {
    let executionPipeline: LLMExecutionPipeline;
    let retryStrategy: RetryStrategy;
    let llmStats: LLMStats;

    beforeEach(() => {
      llmStats = new LLMStats();
      retryStrategy = new RetryStrategy(llmStats);
      executionPipeline = new LLMExecutionPipeline(retryStrategy, llmStats);
    });

    test("should propagate schema type through execute method", async () => {
      const analysisSchema = z.object({
        summary: z.string(),
        findings: z.array(z.string()),
        score: z.number(),
        metadata: z.object({
          analyzedAt: z.string(),
          version: z.string(),
        }),
      });

      type AnalysisType = z.infer<typeof analysisSchema>;

      const mockAnalysis: AnalysisType = {
        summary: "Test analysis completed",
        findings: ["Finding 1", "Finding 2"],
        score: 85,
        metadata: {
          analyzedAt: "2024-01-01T00:00:00Z",
          version: "1.0.0",
        },
      };

      const mockLLMFunction = createTypedMockLLMFunction(mockAnalysis);

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        prompt: "Analyze this",
        context: mockContext,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: mockRetryConfig,
        modelsMetadata: mockModelsMetadata,
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: analysisSchema,
        },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        // Type should flow through from the schema - data is narrowed by discriminated union
        expect(result.data.summary).toBe("Test analysis completed");
        expect(result.data.findings).toHaveLength(2);
        expect(result.data.score).toBe(85);
        expect(result.data.metadata.version).toBe("1.0.0");
      }
    });

    test("should handle union schema types through pipeline", async () => {
      const resultSchema = z.discriminatedUnion("status", [
        z.object({
          status: z.literal("success"),
          data: z.string(),
          timestamp: z.string(),
        }),
        z.object({
          status: z.literal("error"),
          errorCode: z.number(),
          message: z.string(),
        }),
      ]);

      type ResultType = z.infer<typeof resultSchema>;

      const mockResult: ResultType = {
        status: "success",
        data: "Operation completed",
        timestamp: "2024-01-01T12:00:00Z",
      };

      const mockLLMFunction = createTypedMockLLMFunction(mockResult);

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        prompt: "Execute operation",
        context: mockContext,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: mockRetryConfig,
        modelsMetadata: mockModelsMetadata,
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: resultSchema,
        },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        // Type narrowed by discriminated union
        if (result.data.status === "success") {
          expect(result.data.data).toBe("Operation completed");
          expect(result.data.timestamp).toBe("2024-01-01T12:00:00Z");
        }
      }
    });

    test("should return failure when LLM returns undefined generated content", async () => {
      // Create a function that returns COMPLETED but no generated content
      const incompleteFunction: LLMFunction = async <S extends z.ZodType>(
        _content: string,
        _context: LLMContext,
        _options?: LLMCompletionOptions<S>,
      ): Promise<LLMFunctionResponse<z.infer<S>>> => {
        return {
          status: LLMResponseStatus.COMPLETED,
          request: "test",
          modelKey: "test-model",
          context: mockContext,
          // generated is undefined
        };
      };

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        prompt: "test",
        context: mockContext,
        llmFunctions: [incompleteFunction],
        providerRetryConfig: mockRetryConfig,
        modelsMetadata: mockModelsMetadata,
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: z.object({ value: z.string() }),
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("InferResponseType Helper Validation", () => {
    test("should correctly infer type for JSON with schema", () => {
      const _testSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      // Type-level test: verify InferResponseType infers correctly
      type Options = LLMCompletionOptions<typeof _testSchema> & {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _testSchema;
      };

      type InferredType = InferResponseType<Options>;

      // This assignment should compile without errors
      const value: InferredType = { field1: "test", field2: 42 };

      expect(value.field1).toBe("test");
      expect(value.field2).toBe(42);
    });

    test("should correctly infer string type for TEXT format", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      // This assignment should compile without errors
      const value: InferredType = "text response";

      expect(typeof value).toBe("string");
    });
  });

  describe("End-to-End Type Safety Verification", () => {
    let executionPipeline: LLMExecutionPipeline;
    let retryStrategy: RetryStrategy;
    let llmStats: LLMStats;

    beforeEach(() => {
      llmStats = new LLMStats();
      retryStrategy = new RetryStrategy(llmStats);
      executionPipeline = new LLMExecutionPipeline(retryStrategy, llmStats);
    });

    test("should maintain type safety through entire call chain", async () => {
      // Define a complex schema that represents a real-world use case
      const insightSchema = z.object({
        category: z.string(),
        confidence: z.number(),
        insights: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            severity: z.enum(["low", "medium", "high"]),
          }),
        ),
        recommendations: z.array(z.string()),
      });

      type InsightType = z.infer<typeof insightSchema>;

      const expectedInsight: InsightType = {
        category: "security",
        confidence: 0.95,
        insights: [
          {
            title: "SQL Injection Risk",
            description: "Potential SQL injection vulnerability detected",
            severity: "high",
          },
        ],
        recommendations: ["Use parameterized queries", "Validate input"],
      };

      const mockLLMFunction = createTypedMockLLMFunction(expectedInsight);

      const result = await executionPipeline.execute({
        resourceName: "security-analysis",
        prompt: "Analyze security",
        context: mockContext,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: mockRetryConfig,
        modelsMetadata: mockModelsMetadata,
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: insightSchema,
        },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        // Type narrowed by discriminated union - data is correctly typed
        expect(result.data.category).toBe("security");
        expect(result.data.confidence).toBe(0.95);
        expect(result.data.insights).toHaveLength(1);
        expect(result.data.insights[0].severity).toBe("high");
        expect(result.data.recommendations).toContain("Use parameterized queries");
      }
    });

    test("should handle optional schema fields correctly", async () => {
      const optionalFieldsSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        withDefault: z.number().default(0),
        nullable: z.string().nullable(),
      });

      type OptionalFieldsType = z.infer<typeof optionalFieldsSchema>;

      const mockData: OptionalFieldsType = {
        required: "present",
        withDefault: 42,
        nullable: null,
      };

      const mockLLMFunction = createTypedMockLLMFunction(mockData);

      const result = await executionPipeline.execute({
        resourceName: "test",
        prompt: "test",
        context: mockContext,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: mockRetryConfig,
        modelsMetadata: mockModelsMetadata,
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: optionalFieldsSchema,
        },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        // Type narrowed by discriminated union - data is correctly typed
        expect(result.data.required).toBe("present");
        expect(result.data.optional).toBeUndefined();
        expect(result.data.withDefault).toBe(42);
        expect(result.data.nullable).toBeNull();
      }
    });

    test("should handle TEXT format through pipeline", async () => {
      const mockLLMFunction = createTypedMockLLMFunction("Generated text content");

      const result = await executionPipeline.execute({
        resourceName: "text-generation",
        prompt: "Generate some text",
        context: { ...mockContext, outputFormat: LLMOutputFormat.TEXT },
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: mockRetryConfig,
        modelsMetadata: mockModelsMetadata,
        completionOptions: {
          outputFormat: LLMOutputFormat.TEXT,
        },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(typeof result.data).toBe("string");
        expect(result.data).toBe("Generated text content");
      }
    });
  });

  describe("LLMFunctionResponse Generic Type Validation", () => {
    test("should maintain generic type parameter in response", () => {
      interface CustomData {
        id: number;
        value: string;
      }

      // Type-level validation: LLMFunctionResponse should accept generic type
      const typedResponse: LLMFunctionResponse<CustomData> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: mockContext,
        generated: { id: 1, value: "test" },
      };

      expect(typedResponse.generated?.id).toBe(1);
      expect(typedResponse.generated?.value).toBe("test");
    });

    test("should allow undefined generated for non-COMPLETED status", () => {
      const errorResponse: LLMFunctionResponse<Record<string, unknown>> = {
        status: LLMResponseStatus.ERRORED,
        request: "test",
        modelKey: "test-model",
        context: mockContext,
        error: new Error("Test error"),
      };

      expect(errorResponse.generated).toBeUndefined();
      expect(errorResponse.error).toBeDefined();
    });
  });
});
