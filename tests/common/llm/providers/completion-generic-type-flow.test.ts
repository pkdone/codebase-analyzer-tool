/**
 * Tests for explicit generic type parameter propagation in completion methods.
 *
 * These tests verify that the explicit generic type parameters added to
 * executeCompletion correctly propagate type information through the call chain
 * to executeProviderFunction.
 *
 * The change addresses implicit type widening that occurred when arrow functions
 * were assigned to LLMFunction type without explicit generic declarations.
 */

import {
  LLMPurpose,
  LLMExecutionContext,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm-request.types";
import { ResolvedLLMModelMetadata } from "../../../../src/common/llm/types/llm-model.types";
import {
  LLMResponseStatus,
  isCompletedResponse,
} from "../../../../src/common/llm/types/llm-response.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../src/common/llm/providers/llm-provider.types";
import BaseLLMProvider from "../../../../src/common/llm/providers/base-llm-provider";
import { createMockErrorLoggingConfig } from "../../helpers/llm/mock-error-logger";
import { z } from "zod";

// Test-only constants
const TEST_PRIMARY_MODEL = "TEST_PRIMARY_MODEL";
const TEST_SECONDARY_MODEL = "TEST_SECONDARY_MODEL";
const TEST_EMBEDDINGS_MODEL = "TEST_EMBEDDINGS_MODEL";

// Test models metadata
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [TEST_PRIMARY_MODEL]: {
    modelKey: TEST_PRIMARY_MODEL,
    urnEnvKey: "TEST_PRIMARY_MODEL_URN",
    urn: "test-primary",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [TEST_SECONDARY_MODEL]: {
    modelKey: TEST_SECONDARY_MODEL,
    urnEnvKey: "TEST_SECONDARY_MODEL_URN",
    urn: "test-secondary",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 2048,
    maxTotalTokens: 16384,
  },
  [TEST_EMBEDDINGS_MODEL]: {
    modelKey: TEST_EMBEDDINGS_MODEL,
    urnEnvKey: "TEST_EMBEDDINGS_MODEL_URN",
    urn: "test-embeddings",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

// Helper function to create ProviderInit with both primary and secondary models
function createTestProviderInitWithSecondary(): ProviderInit {
  const manifest: LLMProviderManifest = {
    providerFamily: "test-provider",
    envSchema: z.object({}),
    models: {
      embeddings: [
        {
          modelKey: TEST_EMBEDDINGS_MODEL,
          urnEnvKey: "TEST_EMBEDDINGS_MODEL_URN",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: testModelsMetadata[TEST_EMBEDDINGS_MODEL].maxTotalTokens,
          dimensions: testModelsMetadata[TEST_EMBEDDINGS_MODEL].dimensions,
        },
      ],
      completions: [
        {
          modelKey: TEST_PRIMARY_MODEL,
          urnEnvKey: "TEST_PRIMARY_MODEL_URN",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: testModelsMetadata[TEST_PRIMARY_MODEL].maxCompletionTokens,
          maxTotalTokens: testModelsMetadata[TEST_PRIMARY_MODEL].maxTotalTokens,
        },
        {
          modelKey: TEST_SECONDARY_MODEL,
          urnEnvKey: "TEST_SECONDARY_MODEL_URN",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: testModelsMetadata[TEST_SECONDARY_MODEL].maxCompletionTokens,
          maxTotalTokens: testModelsMetadata[TEST_SECONDARY_MODEL].maxTotalTokens,
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
    extractConfig: () => ({}),
    implementation: GenericTypeFlowTestLLM as unknown as new (
      init: ProviderInit,
    ) => BaseLLMProvider,
  };

  return {
    manifest,
    providerParams: {},
    resolvedModelChain: {
      embeddings: [
        {
          providerFamily: "test-provider",
          modelKey: TEST_EMBEDDINGS_MODEL,
          modelUrn: testModelsMetadata[TEST_EMBEDDINGS_MODEL].urn,
        },
      ],
      completions: [
        {
          providerFamily: "test-provider",
          modelKey: TEST_PRIMARY_MODEL,
          modelUrn: testModelsMetadata[TEST_PRIMARY_MODEL].urn,
        },
        {
          providerFamily: "test-provider",
          modelKey: TEST_SECONDARY_MODEL,
          modelUrn: testModelsMetadata[TEST_SECONDARY_MODEL].urn,
        },
      ],
    },
    errorLogging: createMockErrorLoggingConfig(),
    extractedConfig: {},
  };
}

/**
 * Test concrete class that extends BaseLLMProvider to test generic type flow.
 */
class GenericTypeFlowTestLLM extends BaseLLMProvider {
  private mockResponseContent: string | number[] = "";

  constructor() {
    super(createTestProviderInitWithSecondary());
  }

  setMockResponse(content: string | number[]) {
    this.mockResponseContent = content;
  }

  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: Array.isArray(this.mockResponseContent) ? this.mockResponseContent : [0.1],
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
      responseContent: typeof this.mockResponseContent === "string" ? this.mockResponseContent : "",
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

describe("Completion Method Generic Type Flow", () => {
  let testLLM: GenericTypeFlowTestLLM;
  let testContext: LLMExecutionContext;

  beforeEach(() => {
    testLLM = new GenericTypeFlowTestLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
      modelKey: "test-model",
    };
  });

  describe("executeCompletion generic type propagation", () => {
    it("should preserve specific schema type through call chain", async () => {
      const specificSchema = z.object({
        id: z.number(),
        name: z.string(),
        tags: z.array(z.string()),
      });

      testLLM.setMockResponse('{"id": 1, "name": "Test Item", "tags": ["a", "b"]}');

      const result = await testLLM.executeCompletion(
        TEST_PRIMARY_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: specificSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);

      if (isCompletedResponse(result)) {
        // Verify the data matches the schema structure
        const data = result.generated;
        expect(data.id).toBe(1);
        expect(data.name).toBe("Test Item");
        expect(data.tags).toEqual(["a", "b"]);
      }
    });

    it("should handle deeply nested schema types correctly", async () => {
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

      const result = await testLLM.executeCompletion(
        TEST_PRIMARY_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: deepSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        const data = result.generated;
        expect(data.level1.level2.level3.value).toBe("deep");
      }
    });

    it("should handle array schemas with object items", async () => {
      const arraySchema = z.array(
        z.object({
          id: z.number(),
          active: z.boolean(),
        }),
      );

      testLLM.setMockResponse('[{"id": 1, "active": true}, {"id": 2, "active": false}]');

      const result = await testLLM.executeCompletion(
        TEST_PRIMARY_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: arraySchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        const data = result.generated;
        expect(data).toHaveLength(2);
        expect(data[0].id).toBe(1);
        expect(data[0].active).toBe(true);
        expect(data[1].id).toBe(2);
        expect(data[1].active).toBe(false);
      }
    });
  });

  describe("executeCompletion generic type propagation with secondary model", () => {
    it("should preserve specific schema type through call chain for secondary model", async () => {
      const specificSchema = z.object({
        status: z.enum(["success", "error"]),
        message: z.string(),
      });

      testLLM.setMockResponse('{"status": "success", "message": "Operation completed"}');

      const result = await testLLM.executeCompletion(
        TEST_SECONDARY_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: specificSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);

      if (isCompletedResponse(result)) {
        const data = result.generated;
        expect(data.status).toBe("success");
        expect(data.message).toBe("Operation completed");
      }
    });

    it("should handle discriminated union types correctly", async () => {
      const unionSchema = z.discriminatedUnion("type", [
        z.object({ type: z.literal("user"), userId: z.number() }),
        z.object({ type: z.literal("guest"), sessionId: z.string() }),
      ]);

      testLLM.setMockResponse('{"type": "user", "userId": 42}');

      const result = await testLLM.executeCompletion(
        TEST_PRIMARY_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: unionSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        const data = result.generated;
        expect(data.type).toBe("user");
        if (data.type === "user") {
          expect(data.userId).toBe(42);
        }
      }
    });
  });

  describe("Type consistency between primary and secondary", () => {
    it("should maintain same type inference for identical schemas", async () => {
      const sharedSchema = z.object({
        code: z.number(),
        description: z.string(),
      });

      // Test primary
      testLLM.setMockResponse('{"code": 200, "description": "OK"}');
      const primaryResult = await testLLM.executeCompletion(
        TEST_PRIMARY_MODEL,
        "prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: sharedSchema,
        },
      );

      // Test secondary with same schema
      testLLM.setMockResponse('{"code": 404, "description": "Not Found"}');
      const secondaryResult = await testLLM.executeCompletion(
        TEST_SECONDARY_MODEL,
        "prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: sharedSchema,
        },
      );

      expect(primaryResult.status).toBe(LLMResponseStatus.COMPLETED);
      expect(secondaryResult.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(primaryResult)).toBe(true);
      expect(isCompletedResponse(secondaryResult)).toBe(true);

      if (isCompletedResponse(primaryResult) && isCompletedResponse(secondaryResult)) {
        const primaryData = primaryResult.generated;
        const secondaryData = secondaryResult.generated;

        // Both should have same structure
        expect(primaryData.code).toBe(200);
        expect(primaryData.description).toBe("OK");
        expect(secondaryData.code).toBe(404);
        expect(secondaryData.description).toBe("Not Found");
      }
    });
  });

  describe("TEXT output type handling", () => {
    it("should handle TEXT output without schema for primary", async () => {
      testLLM.setMockResponse("Plain text response from primary");

      const result = await testLLM.executeCompletion(TEST_PRIMARY_MODEL, "prompt", testContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.generated).toBe("Plain text response from primary");
      }
    });

    it("should handle TEXT output without schema for secondary", async () => {
      testLLM.setMockResponse("Plain text response from secondary");

      const result = await testLLM.executeCompletion(TEST_SECONDARY_MODEL, "prompt", testContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.generated).toBe("Plain text response from secondary");
      }
    });
  });

  describe("Available completion model keys verification", () => {
    it("should include both completion models when configured", () => {
      const modelKeys = testLLM.getAvailableCompletionModelKeys();

      expect(modelKeys).toContain(TEST_PRIMARY_MODEL);
      expect(modelKeys).toContain(TEST_SECONDARY_MODEL);
      expect(modelKeys).toHaveLength(2);
    });
  });
});
