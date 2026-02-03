import { describe, test, expect, beforeEach } from "@jest/globals";
import { z } from "zod";
import {
  LLMCompletionOptions,
  LLMContext,
  LLMOutputFormat,
  LLMPurpose,
} from "../../../src/common/llm/types/llm-request.types";
import {
  LLMFunctionResponse,
  LLMResponseStatus,
  isCompletedResponse,
  isErrorResponse,
  InferResponseType,
  LLMResponsePayload,
} from "../../../src/common/llm/types/llm-response.types";
import {
  LLMFunction,
  ExecutableCandidate,
  BoundLLMFunction,
} from "../../../src/common/llm/types/llm-function.types";
import { ResolvedLLMModelMetadata } from "../../../src/common/llm/types/llm-model.types";
import { RetryStrategy } from "../../../src/common/llm/strategies/retry-strategy";
import {
  LLMExecutionPipeline,
  type LLMPipelineConfig,
} from "../../../src/common/llm/llm-execution-pipeline";
import LLMExecutionStats from "../../../src/common/llm/tracking/llm-execution-stats";
import { isOk, isErr } from "../../../src/common/types/result.types";

/**
 * Test suite validating the type safety refactoring for the LLM call chain.
 *
 * These tests verify that generic schema types propagate correctly through:
 * - LLMFunction type definition
 * - RetryStrategy.executeWithRetries
 * - LLMExecutionPipeline.tryFallbackChain
 *
 * The refactoring enables better type safety through the call chain using
 * z.infer<S> for schema-based type inference.
 */
describe("Type Safety Refactoring Validation", () => {
  const mockContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
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
      urnEnvKey: "TEST_MODEL_URN",
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
    return async <S extends z.ZodType<unknown>>(
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

  /**
   * Helper to create a bound mock LLM function for use with RetryStrategy.
   * Returns a BoundLLMFunction<T> which is what executeWithRetries expects.
   */
  function createBoundMockLLMFunction<T extends LLMResponsePayload>(
    mockData: T,
  ): BoundLLMFunction<T> {
    return async (_content: string, _context: LLMContext): Promise<LLMFunctionResponse<T>> => {
      return {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: mockContext,
        generated: mockData,
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
      expect(isCompletedResponse(result)).toBe(true);

      if (isCompletedResponse(result)) {
        // Validate runtime behavior - the generated content should match
        const generated = result.generated;
        expect(generated.id).toBe(1);
        expect(generated.name).toBe("Test User");
        expect(generated.email).toBe("test@example.com");
      }
    });

    test("should return string for TEXT format", async () => {
      const mockLLMFunction = createTypedMockLLMFunction("Plain text response");

      const result = await mockLLMFunction("test prompt", mockContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(typeof result.generated).toBe("string");
        expect(result.generated).toBe("Plain text response");
      }
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
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(Array.isArray(result.generated)).toBe(true);
        const generated = result.generated as unknown as ItemsType;
        expect(generated.length).toBe(2);
        expect(generated[0].id).toBe("item1");
        expect(generated[1].value).toBe(20);
      }
    });
  });

  describe("RetryStrategy Type Propagation", () => {
    let retryStrategy: RetryStrategy;
    let llmStats: LLMExecutionStats;

    beforeEach(() => {
      llmStats = new LLMExecutionStats();
      retryStrategy = new RetryStrategy(llmStats);
    });

    test("should propagate schema type through executeWithRetries", async () => {
      const _productSchema = z.object({
        sku: z.string(),
        name: z.string(),
        price: z.number(),
        inStock: z.boolean(),
      });

      type ProductType = z.infer<typeof _productSchema>;

      const mockProduct: ProductType = {
        sku: "PROD-001",
        name: "Test Product",
        price: 29.99,
        inStock: true,
      };

      // Use createBoundMockLLMFunction for executeWithRetries which expects BoundLLMFunction<T>
      const mockLLMFunction = createBoundMockLLMFunction(mockProduct);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockRetryConfig,
        true, // retryOnInvalid
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result!)).toBe(true);

      // The type should flow through - validate runtime values
      if (isCompletedResponse(result!)) {
        // Type now flows correctly through BoundLLMFunction<ProductType>
        const product = result.generated;
        expect(product.sku).toBe("PROD-001");
        expect(product.name).toBe("Test Product");
        expect(product.price).toBe(29.99);
        expect(product.inStock).toBe(true);
      }
    });

    test("should handle nested schema types through retry", async () => {
      const _nestedSchema = z.object({
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

      type NestedType = z.infer<typeof _nestedSchema>;

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

      // Use createBoundMockLLMFunction for executeWithRetries which expects BoundLLMFunction<T>
      const mockLLMFunction = createBoundMockLLMFunction(mockData);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockRetryConfig,
        true, // retryOnInvalid
      );

      expect(result).not.toBeNull();
      expect(isCompletedResponse(result!)).toBe(true);
      if (isCompletedResponse(result!)) {
        // Type now flows correctly through BoundLLMFunction<NestedType>
        const data = result.generated;
        expect(data.user.id).toBe(42);
        expect(data.user.profile.displayName).toBe("TestUser");
        expect(data.settings.theme).toBe("dark");
      }
    });

    test("should return last response when all retries exhausted for OVERLOADED", async () => {
      // Create a bound function that always returns OVERLOADED
      const failingFunction: BoundLLMFunction<LLMResponsePayload> = async (
        _content: string,
        _context: LLMContext,
      ): Promise<LLMFunctionResponse> => {
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
        true, // retryOnInvalid
      );

      // Should return the last OVERLOADED response (not null) so caller knows why it failed
      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.OVERLOADED);
    });
  });

  describe("LLMExecutionPipeline Type Propagation", () => {
    let executionPipeline: LLMExecutionPipeline;
    let retryStrategy: RetryStrategy;
    let llmStats: LLMExecutionStats;

    beforeEach(() => {
      llmStats = new LLMExecutionStats();
      retryStrategy = new RetryStrategy(llmStats);
      const pipelineConfig: LLMPipelineConfig = {
        retryConfig: mockRetryConfig,
        getModelsMetadata: () => mockModelsMetadata,
      };
      executionPipeline = new LLMExecutionPipeline(retryStrategy, llmStats, pipelineConfig);
    });

    // Helper to create an ExecutableCandidate from mock data
    const createCandidate = <T>(mockData: T): ExecutableCandidate<T> => ({
      execute: async (content: string, context: LLMContext) => ({
        status: LLMResponseStatus.COMPLETED,
        request: content,
        modelKey: "test-model",
        context,
        generated: mockData,
      }),
      providerFamily: "TestProvider",
      modelKey: "test-model",
      description: "TestProvider/test-model",
    });

    test("should propagate schema type through execute method", async () => {
      const _analysisSchema = z.object({
        summary: z.string(),
        findings: z.array(z.string()),
        score: z.number(),
        metadata: z.object({
          analyzedAt: z.string(),
          version: z.string(),
        }),
      });

      type AnalysisType = z.infer<typeof _analysisSchema>;

      const mockAnalysis: AnalysisType = {
        summary: "Test analysis completed",
        findings: ["Finding 1", "Finding 2"],
        score: 85,
        metadata: {
          analyzedAt: "2024-01-01T00:00:00Z",
          version: "1.0.0",
        },
      };

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        content: "Analyze this",
        context: mockContext,
        candidates: [createCandidate(mockAnalysis)],
      });

      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        // Type flows through from the schema
        expect(result.value.summary).toBe("Test analysis completed");
        expect(result.value.findings).toHaveLength(2);
        expect(result.value.score).toBe(85);
        expect(result.value.metadata.version).toBe("1.0.0");
      }
    });

    test("should handle union schema types through pipeline", async () => {
      const _resultSchema = z.discriminatedUnion("status", [
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

      type ResultType = z.infer<typeof _resultSchema>;

      const mockResult: ResultType = {
        status: "success",
        data: "Operation completed",
        timestamp: "2024-01-01T12:00:00Z",
      };

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        content: "Execute operation",
        context: mockContext,
        candidates: [createCandidate(mockResult)],
      });

      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        // Type narrowed by discriminated union - use type assertion for test
        const data = result.value as ResultType;
        if (data.status === "success") {
          expect(data.data).toBe("Operation completed");
          expect(data.timestamp).toBe("2024-01-01T12:00:00Z");
        }
      }
    });

    test("should return failure when LLM returns ERRORED status", async () => {
      // Create a candidate that returns ERRORED
      const errorCandidate: ExecutableCandidate<LLMResponsePayload> = {
        execute: async (content: string, context: LLMContext) => ({
          status: LLMResponseStatus.ERRORED,
          request: content,
          modelKey: "test-model",
          context,
          error: new Error("LLM processing failed"),
        }),
        providerFamily: "TestProvider",
        modelKey: "test-model",
        description: "TestProvider/test-model",
      };

      const result = await executionPipeline.execute({
        resourceName: "test-resource",
        content: "test",
        context: mockContext,
        candidates: [errorCandidate],
      });

      expect(isErr(result)).toBe(true);
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
    let llmStats: LLMExecutionStats;

    beforeEach(() => {
      llmStats = new LLMExecutionStats();
      retryStrategy = new RetryStrategy(llmStats);
      const pipelineConfig: LLMPipelineConfig = {
        retryConfig: mockRetryConfig,
        getModelsMetadata: () => mockModelsMetadata,
      };
      executionPipeline = new LLMExecutionPipeline(retryStrategy, llmStats, pipelineConfig);
    });

    // Helper to create an ExecutableCandidate from mock data
    const createCandidate = <T>(mockData: T): ExecutableCandidate<T> => ({
      execute: async (content: string, context: LLMContext) => ({
        status: LLMResponseStatus.COMPLETED,
        request: content,
        modelKey: "test-model",
        context,
        generated: mockData,
      }),
      providerFamily: "TestProvider",
      modelKey: "test-model",
      description: "TestProvider/test-model",
    });

    test("should maintain type safety through entire call chain", async () => {
      // Define a complex schema that represents a real-world use case
      const _insightSchema = z.object({
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

      type InsightType = z.infer<typeof _insightSchema>;

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

      const result = await executionPipeline.execute({
        resourceName: "security-analysis",
        content: "Analyze security",
        context: mockContext,
        candidates: [createCandidate(expectedInsight)],
      });

      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        // Type flows through correctly
        expect(result.value.category).toBe("security");
        expect(result.value.confidence).toBe(0.95);
        expect(result.value.insights).toHaveLength(1);
        expect(result.value.insights[0].severity).toBe("high");
        expect(result.value.recommendations).toContain("Use parameterized queries");
      }
    });

    test("should handle optional schema fields correctly", async () => {
      const _optionalFieldsSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        withDefault: z.number().default(0),
        nullable: z.string().nullable(),
      });

      type OptionalFieldsType = z.infer<typeof _optionalFieldsSchema>;

      const mockData: OptionalFieldsType = {
        required: "present",
        withDefault: 42,
        nullable: null,
      };

      const result = await executionPipeline.execute({
        resourceName: "test",
        content: "test",
        context: mockContext,
        candidates: [createCandidate(mockData)],
      });

      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        // Type flows through correctly
        expect(result.value.required).toBe("present");
        expect(result.value.optional).toBeUndefined();
        expect(result.value.withDefault).toBe(42);
        expect(result.value.nullable).toBeNull();
      }
    });

    test("should handle TEXT format through pipeline", async () => {
      const result = await executionPipeline.execute({
        resourceName: "text-generation",
        content: "Generate some text",
        context: { ...mockContext, outputFormat: LLMOutputFormat.TEXT },
        candidates: [createCandidate("Generated text content")],
      });

      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(typeof result.value).toBe("string");
        expect(result.value).toBe("Generated text content");
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

      expect(isCompletedResponse(typedResponse)).toBe(true);
      if (isCompletedResponse(typedResponse)) {
        expect(typedResponse.generated.id).toBe(1);
        expect(typedResponse.generated.value).toBe("test");
      }
    });

    test("should allow undefined generated for non-COMPLETED status", () => {
      const errorResponse: LLMFunctionResponse<Record<string, unknown>> = {
        status: LLMResponseStatus.ERRORED,
        request: "test",
        modelKey: "test-model",
        context: mockContext,
        error: new Error("Test error"),
      };

      expect(isErrorResponse(errorResponse)).toBe(true);
      if (isErrorResponse(errorResponse)) {
        expect(errorResponse.error).toBeDefined();
      }
    });
  });
});
