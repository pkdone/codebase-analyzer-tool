import {
  LLMPurpose,
  LLMContext,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm-request.types";
import { ResolvedLLMModelMetadata } from "../../../../src/common/llm/types/llm-model.types";
import { LLMResponseStatus } from "../../../../src/common/llm/types/llm-response.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../src/common/llm/providers/llm-provider.types";
import BaseLLMProvider from "../../../../src/common/llm/providers/base-llm-provider";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import { createMockErrorLoggingConfig } from "../../helpers/llm/mock-error-logger";
import { z } from "zod";

// Test-only constants
const TEST_COMPLETIONS_MODEL = "TEST_COMPLETIONS_MODEL";
const TEST_EMBEDDINGS_MODEL = "TEST_EMBEDDINGS_MODEL";

// Test models metadata
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [TEST_COMPLETIONS_MODEL]: {
    modelKey: TEST_COMPLETIONS_MODEL,
    urnEnvKey: "TEST_PRIMARY_MODEL",
    urn: "test-completions",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [TEST_EMBEDDINGS_MODEL]: {
    modelKey: TEST_EMBEDDINGS_MODEL,
    urnEnvKey: "TEST_EMBEDDINGS_MODEL",
    urn: "test-embeddings",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

// Helper function to create ProviderInit for tests
function createTestProviderInit(): ProviderInit {
  const manifest: LLMProviderManifest = {
    providerFamily: "test",
    envSchema: z.object({}),
    models: {
      embeddings: [
        {
          modelKey: TEST_EMBEDDINGS_MODEL,
          urnEnvKey: "TEST_EMBEDDINGS_MODEL",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: testModelsMetadata[TEST_EMBEDDINGS_MODEL].maxTotalTokens,
          dimensions: testModelsMetadata[TEST_EMBEDDINGS_MODEL].dimensions,
        },
      ],
      completions: [
        {
          modelKey: TEST_COMPLETIONS_MODEL,
          urnEnvKey: "TEST_PRIMARY_MODEL",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: testModelsMetadata[TEST_COMPLETIONS_MODEL].maxCompletionTokens,
          maxTotalTokens: testModelsMetadata[TEST_COMPLETIONS_MODEL].maxTotalTokens,
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
    implementation: ConfigValidationTestLLM as unknown as new (
      init: ProviderInit,
    ) => BaseLLMProvider,
  };

  return {
    manifest,
    providerParams: {},
    resolvedModelChain: {
      embeddings: [
        {
          providerFamily: "test",
          modelKey: TEST_EMBEDDINGS_MODEL,
          modelUrn: testModelsMetadata[TEST_EMBEDDINGS_MODEL].urn,
        },
      ],
      completions: [
        {
          providerFamily: "test",
          modelKey: TEST_COMPLETIONS_MODEL,
          modelUrn: testModelsMetadata[TEST_COMPLETIONS_MODEL].urn,
        },
      ],
    },
    errorLogging: createMockErrorLoggingConfig(),
  };
}

/**
 * Test concrete class that extends BaseLLMProvider to test configuration validation.
 */
class ConfigValidationTestLLM extends BaseLLMProvider {
  private mockResponseContent: string | number[] = "";

  constructor() {
    super(createTestProviderInit());
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

describe("BaseLLMProvider Configuration Validation", () => {
  let testLLM: ConfigValidationTestLLM;
  let testContext: LLMContext;

  beforeEach(() => {
    testLLM = new ConfigValidationTestLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };
  });

  describe("JSON schema with TEXT output format (misconfiguration)", () => {
    it("should return ERRORED status with BAD_CONFIGURATION error when jsonSchema is provided with TEXT format", async () => {
      const testSchema = z.object({
        name: z.string(),
        value: z.number(),
      });

      testLLM.setMockResponse("This is plain text response");

      // Providing jsonSchema with TEXT format is a configuration error
      // The provider returns ERRORED status rather than throwing
      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
          jsonSchema: testSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.ERRORED);
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(LLMError);

      const error = result.error as LLMError;
      expect(error.code).toBe(LLMErrorCode.BAD_CONFIGURATION);
      expect(error.message).toContain("jsonSchema was provided but outputFormat is TEXT");
    });

    it("should provide helpful error message with guidance on how to fix", async () => {
      const schema = z.object({ data: z.string() });
      testLLM.setMockResponse("text response");

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
          jsonSchema: schema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.ERRORED);
      expect(result.error).toBeInstanceOf(LLMError);

      const error = result.error as LLMError;
      expect(error.message).toContain("Use outputFormat: LLMOutputFormat.JSON");
      expect(error.message).toContain("remove the jsonSchema");
    });
  });

  describe("Valid configurations (should succeed)", () => {
    it("should accept TEXT format without jsonSchema", async () => {
      testLLM.setMockResponse("Plain text response");

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBe("Plain text response");
    });

    it("should accept JSON format with jsonSchema", async () => {
      const testSchema = z.object({
        name: z.string(),
        count: z.number(),
      });

      testLLM.setMockResponse('{"name": "test", "count": 42}');

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();
      // Type is inferred from schema: { name: string; count: number }
      const data = result.generated as { name: string; count: number };
      expect(data.name).toBe("test");
      expect(data.count).toBe(42);
    });

    it("should require jsonSchema for JSON format", async () => {
      // JSON format now requires a schema for type-safe validation
      testLLM.setMockResponse('{"key": "value", "number": 123}');

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      // Error is returned in status, not thrown
      expect(result.status).toBe(LLMResponseStatus.ERRORED);
      expect(result.error).toBeDefined();
      expect(String(result.error)).toContain(
        "JSON output requires a schema for type-safe validation",
      );
    });

    it("should accept no options (defaults to TEXT)", async () => {
      testLLM.setMockResponse("Default text response");

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "test prompt",
        testContext,
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBe("Default text response");
    });
  });

  describe("Edge cases", () => {
    it("should accept jsonSchema: undefined with TEXT format (explicit undefined)", async () => {
      testLLM.setMockResponse("text response");

      // Explicitly setting jsonSchema to undefined should be fine
      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
          jsonSchema: undefined,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBe("text response");
    });

    it("should handle complex schemas with JSON format correctly", async () => {
      const complexSchema = z.object({
        users: z.array(
          z.object({
            id: z.number(),
            profile: z.object({
              name: z.string(),
              settings: z.record(z.boolean()),
            }),
          }),
        ),
        metadata: z.object({
          total: z.number(),
          page: z.number(),
        }),
      });

      const jsonResponse = JSON.stringify({
        users: [
          {
            id: 1,
            profile: {
              name: "Test User",
              settings: { darkMode: true, notifications: false },
            },
          },
        ],
        metadata: { total: 1, page: 1 },
      });

      testLLM.setMockResponse(jsonResponse);

      const result = await testLLM.executeCompletion(
        TEST_COMPLETIONS_MODEL,
        "prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: complexSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();
      // Type is inferred from complexSchema - using ! assertion as we've verified it's defined
      const data = result.generated!;
      expect(data).toHaveProperty("users");
      expect(data).toHaveProperty("metadata");
    });
  });
});
