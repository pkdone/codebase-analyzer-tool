import {
  LLMPurpose,
  LLMContext,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm-request.types";
import {
  LLMResponseTokensUsage,
  LLMResponseStatus,
  isCompletedResponse,
} from "../../../../src/common/llm/types/llm-response.types";
import { ResolvedLLMModelMetadata } from "../../../../src/common/llm/types/llm-model.types";
import { REPAIR_STEP } from "../../../../src/common/llm/json-processing/sanitizers";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../src/common/llm/providers/llm-provider.types";
import BaseLLMProvider from "../../../../src/common/llm/providers/base-llm-provider";
import { createMockErrorLoggingConfig } from "../../helpers/llm/mock-error-logger";
import { z } from "zod";

// Test-only constants
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
const GPT_EMBEDDINGS_GPT4 = "GPT_EMBEDDINGS_GPT4";
const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT";

// Test models metadata for generic token extraction tests
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urnEnvKey: "TEST_GPT4_32K_URN",
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
    urnEnvKey: "TEST_LLAMA_URN",
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
  [GPT_EMBEDDINGS_GPT4]: {
    modelKey: GPT_EMBEDDINGS_GPT4,
    urnEnvKey: "TEST_EMBEDDINGS_URN",
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

// Stub class for manifest implementation field (not actually used in tests)
class StubLLM extends BaseLLMProvider {
  constructor() {
    super({
      manifest: {
        providerFamily: "stub",
        envSchema: z.object({}),
        models: {
          embeddings: [
            {
              modelKey: GPT_EMBEDDINGS_GPT4,
              urnEnvKey: "STUB_EMBED",
              purpose: LLMPurpose.EMBEDDINGS,
              maxTotalTokens: 8191,
              dimensions: 1536,
            },
          ],
          completions: [
            {
              modelKey: GPT_COMPLETIONS_GPT4_32k,
              urnEnvKey: "STUB_COMPLETE",
              purpose: LLMPurpose.COMPLETIONS,
              maxCompletionTokens: 4096,
              maxTotalTokens: 32768,
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
        implementation: StubLLM as unknown as LLMProviderManifest["implementation"],
      },
      providerParams: {},
      resolvedModelChain: {
        embeddings: [
          {
            providerFamily: "stub",
            modelKey: GPT_EMBEDDINGS_GPT4,
            modelUrn: "stub-embed",
          },
        ],
        completions: [
          {
            providerFamily: "stub",
            modelKey: GPT_COMPLETIONS_GPT4_32k,
            modelUrn: "stub-complete",
          },
        ],
      },
      errorLogging: createMockErrorLoggingConfig(),
      extractedConfig: {},
    });
  }
  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, maxTotalTokens: 0 },
    };
  }
  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: "",
      tokenUsage: { promptTokens: 0, completionTokens: 0, maxTotalTokens: 0 },
    };
  }
  protected isLLMOverloaded(): boolean {
    return false;
  }
  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

// Helper function to create ProviderInit for tests
function createTestProviderInit(
  completionKey: string,
  embeddingsKey: string = GPT_EMBEDDINGS_GPT4,
): ProviderInit {
  const manifest: LLMProviderManifest = {
    providerFamily: "test",
    envSchema: z.object({}),
    models: {
      embeddings: [
        {
          modelKey: embeddingsKey,
          urnEnvKey: testModelsMetadata[embeddingsKey].urnEnvKey,
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: testModelsMetadata[embeddingsKey].maxTotalTokens,
          dimensions: testModelsMetadata[embeddingsKey].dimensions,
        },
      ],
      completions: [
        {
          modelKey: completionKey,
          urnEnvKey: testModelsMetadata[completionKey].urnEnvKey,
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: testModelsMetadata[completionKey].maxCompletionTokens,
          maxTotalTokens: testModelsMetadata[completionKey].maxTotalTokens,
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
    implementation: StubLLM as unknown as LLMProviderManifest["implementation"],
  };

  return {
    manifest,
    providerParams: {},
    resolvedModelChain: {
      embeddings: [
        {
          providerFamily: "test",
          modelKey: embeddingsKey,
          modelUrn: testModelsMetadata[embeddingsKey].urn,
        },
      ],
      completions: [
        {
          providerFamily: "test",
          modelKey: completionKey,
          modelUrn: testModelsMetadata[completionKey].urn,
        },
      ],
    },
    errorLogging: createMockErrorLoggingConfig(),
    extractedConfig: {},
  };
}

// Test concrete class that extends BaseLLMProvider to test token extraction functionality
class TestLLM extends BaseLLMProvider {
  private mockTokenUsage: LLMResponseTokensUsage = {
    promptTokens: 10,
    completionTokens: 20,
    maxTotalTokens: 100,
  };

  constructor() {
    super(createTestProviderInit(GPT_COMPLETIONS_GPT4_32k));
  }

  // Method to set mock token usage for testing
  setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
    this.mockTokenUsage = tokenUsage;
  }

  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: [0.1, 0.2, 0.3],
      tokenUsage: this.mockTokenUsage,
    };
  }

  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: true, // This triggers the private method we want to test
      responseContent: "test response",
      tokenUsage: this.mockTokenUsage,
    };
  }

  protected isLLMOverloaded(): boolean {
    return false;
  }

  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

describe("Abstract LLM Token Extraction", () => {
  let testLLM: TestLLM;
  let testContext: LLMContext;

  beforeEach(() => {
    testLLM = new TestLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };
  });

  describe("Token extraction from metadata", () => {
    test("normalizes tokens with undefined maxTotalTokens from model metadata", async () => {
      // Test that undefined values get normalized/resolved from model metadata
      const tokenUsage = {
        promptTokens: 200,
        completionTokens: 0,
        maxTotalTokens: undefined,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
      );

      // normalizeTokenUsage resolves undefined maxTotalTokens from model metadata
      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 200,
        maxTotalTokens: 32768, // Resolved from model metadata
      });
    });

    test("normalizes tokens with undefined completionTokens to 0", async () => {
      const tokenUsage = {
        promptTokens: 32760,
        completionTokens: undefined,
        maxTotalTokens: undefined,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
      );

      // normalizeTokenUsage defaults completionTokens to 0 and resolves maxTotalTokens
      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0, // Defaulted to 0
        promptTokens: 32760,
        maxTotalTokens: 32768, // Resolved from model metadata
      });
    });

    test("estimates promptTokens when undefined", async () => {
      const tokenUsage = {
        promptTokens: undefined,
        completionTokens: 200,
        maxTotalTokens: undefined,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
      );

      // normalizeTokenUsage estimates promptTokens to exceed limit (triggering cropping)
      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 200,
        promptTokens: 32769, // Estimated to exceed limit
        maxTotalTokens: 32768, // Resolved from model metadata
      });
    });

    test("extracts tokens for different model", async () => {
      // Create a TestLLM that uses the Llama model
      class TestLlamaLLM extends BaseLLMProvider {
        private mockTokenUsage: LLMResponseTokensUsage = {
          promptTokens: 10,
          completionTokens: 20,
          maxTotalTokens: 100,
        };

        constructor() {
          super(createTestProviderInit(AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT));
        }

        setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
          this.mockTokenUsage = tokenUsage;
        }

        protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
          return {
            isIncompleteResponse: false,
            responseContent: [0.1, 0.2, 0.3],
            tokenUsage: this.mockTokenUsage,
          };
        }

        protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
          return {
            isIncompleteResponse: true,
            responseContent: "test response",
            tokenUsage: this.mockTokenUsage,
          };
        }

        protected isLLMOverloaded(): boolean {
          return false;
        }

        protected isTokenLimitExceeded(): boolean {
          return false;
        }
      }

      const llamaLLM = new TestLlamaLLM();
      const tokenUsage = {
        promptTokens: 243,
        completionTokens: undefined,
        maxTotalTokens: undefined,
      };
      llamaLLM.setMockTokenUsage(tokenUsage);

      const result = await llamaLLM.executeCompletion(
        AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
        "test prompt",
        testContext,
      );

      // normalizeTokenUsage resolves undefined values from model metadata and defaults
      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0, // Defaulted to 0
        promptTokens: 243,
        maxTotalTokens: 128000, // Resolved from Llama model metadata
      });
    });
  });
});

// Test class for JSON response testing
class TestJSONLLM extends BaseLLMProvider {
  private mockResponseContent = "";
  private mockIsIncomplete = false;
  private mockEmbeddingResponseContent: number[] = [0.1, 0.2, 0.3];

  constructor() {
    super(createTestProviderInit(GPT_COMPLETIONS_GPT4_32k));
  }

  setMockResponse(content: string, isIncomplete = false) {
    this.mockResponseContent = content;
    this.mockIsIncomplete = isIncomplete;
  }

  setMockEmbeddingResponse(content: number[]) {
    this.mockEmbeddingResponseContent = content;
  }

  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: this.mockEmbeddingResponseContent,
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 20,
        maxTotalTokens: 100,
      },
    };
  }

  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: this.mockIsIncomplete,
      responseContent: this.mockResponseContent,
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

describe("Abstract LLM Sanitization Steps Propagation", () => {
  let testLLM: TestJSONLLM;
  let testContext: LLMContext;

  beforeEach(() => {
    testLLM = new TestJSONLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };
  });

  describe("JSON response with sanitization steps", () => {
    // Schema for tests - JSON output now requires a schema
    const testSchema = z.object({
      name: z.string(),
      value: z.number(),
    });

    test("should have empty sanitization steps for clean JSON with whitespace", async () => {
      // JSON with leading/trailing whitespace is handled by JSON.parse naturally
      testLLM.setMockResponse('  {"name": "test", "value": 123}  ');

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.repairs).toBeDefined();
        expect(result.repairs).toEqual([]);
      }
    });

    test("should propagate sanitization steps for JSON with code fences", async () => {
      // JSON wrapped in markdown code fence requires sanitization
      testLLM.setMockResponse('```json\n{"name": "test", "value": 123}\n```');

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.repairs).toBeDefined();
        expect(
          result.repairs?.some(
            (s: string) =>
              s.includes("Fixed JSON structure and noise") || s === REPAIR_STEP.REMOVED_CODE_FENCES,
          ),
        ).toBe(true);
      }
    });

    test("should propagate sanitization steps for JSON with trailing comma", async () => {
      // JSON with trailing comma (requires sanitization)
      testLLM.setMockResponse('{"name": "test", "value": 123,}');

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.repairs).toBeDefined();
        expect(result.repairs?.length).toBeGreaterThan(0);
      }
    });

    test("should not have sanitization steps for clean JSON", async () => {
      // Clean JSON that doesn't need any sanitization
      testLLM.setMockResponse('{"name":"test","value":123}');

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.repairs).toBeDefined();
        expect(result.repairs).toEqual([]);
      }
    });

    test("should not have sanitization steps for text output format", async () => {
      // When output format is TEXT, no sanitization steps should be recorded
      testLLM.setMockResponse("This is plain text");

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      // TEXT responses are also LLMCompletedResponse, but repairs is undefined for text
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.repairs).toBeUndefined();
      }
    });

    test("should not have sanitization steps when JSON parsing fails", async () => {
      // Invalid JSON that cannot be fixed
      testLLM.setMockResponse("This is not JSON at all");

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.INVALID);
      // INVALID responses are LLMErroredResponse, which doesn't have repairs
      expect(isCompletedResponse(result)).toBe(false);
    });
  });
});

describe("Abstract LLM Deep Immutability", () => {
  let testLLM: TestLLM;

  beforeEach(() => {
    testLLM = new TestLLM();
  });

  describe("getModelsMetadata", () => {
    test("should return a frozen object", () => {
      const metadata = testLLM.getModelsMetadata();
      expect(Object.isFrozen(metadata)).toBe(true);
    });

    test("should return a deep clone that prevents mutation of nested objects", () => {
      const metadata1 = testLLM.getModelsMetadata();
      const metadata2 = testLLM.getModelsMetadata();

      // Should be different object references (deep clone)
      expect(metadata1).not.toBe(metadata2);
      expect(metadata1[GPT_COMPLETIONS_GPT4_32k]).not.toBe(metadata2[GPT_COMPLETIONS_GPT4_32k]);

      // But should have equal values
      expect(metadata1).toEqual(metadata2);
    });

    test("should prevent modification of returned metadata", () => {
      const metadata = testLLM.getModelsMetadata();

      expect(() => {
        (metadata as Record<string, unknown>).newKey = "newValue";
      }).toThrow();
    });

    test("should contain expected model keys", () => {
      const metadata = testLLM.getModelsMetadata();

      expect(metadata[GPT_COMPLETIONS_GPT4_32k]).toBeDefined();
      expect(metadata[GPT_EMBEDDINGS_GPT4]).toBeDefined();
      expect(metadata[GPT_COMPLETIONS_GPT4_32k].urn).toBe("gpt-4-32k");
      expect(metadata[GPT_EMBEDDINGS_GPT4].urn).toBe("text-embedding-ada-002");
    });
  });
});

describe("Abstract LLM Type Safety with InferResponseType", () => {
  let testLLM: TestJSONLLM;
  const testContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
    outputFormat: LLMOutputFormat.JSON,
  };

  beforeEach(() => {
    testLLM = new TestJSONLLM();
  });

  describe("TEXT format responses", () => {
    test("should return string type for TEXT format", async () => {
      const textResponse = "This is a plain text response from the LLM";
      testLLM.setMockResponse(textResponse);

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(typeof result.generated).toBe("string");
        expect(result.generated).toBe(textResponse);

        // TypeScript infers string type with proper narrowing
        if (typeof result.generated === "string") {
          const upperCase = result.generated.toUpperCase();
          expect(upperCase).toBe(textResponse.toUpperCase());
        }
      }
    });

    test("should handle TEXT responses without type assertions", async () => {
      testLLM.setMockResponse("Sample text");

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.TEXT,
        },
      );

      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        // No 'as string' cast needed with type narrowing
        expect(result.generated).toBe("Sample text");
        expect(typeof result.generated).toBe("string");
      }
    });
  });

  describe("JSON format responses with schema", () => {
    test("should return correctly typed object for JSON with schema", async () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
      });

      const mockData = {
        id: 123,
        name: "Test User",
        email: "test@example.com",
      };

      testLLM.setMockResponse(JSON.stringify(mockData));

      const result = await testLLM.executeCompletion(
        GPT_COMPLETIONS_GPT4_32k,
        "test prompt",
        testContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: userSchema,
        },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.generated).toEqual(mockData);

        // Type is inferred, with narrowing for access
        if (typeof result.generated === "object" && !Array.isArray(result.generated)) {
          const data = result.generated as Record<string, unknown>;
          expect(data.id).toBe(123);
          expect(data.name).toBe("Test User");
        }
      }
    });
  });

  describe("embeddings type safety", () => {
    test("should always return number array for embeddings", async () => {
      const embeddingVector = [0.1, 0.2, 0.3, 0.4, 0.5];
      testLLM.setMockEmbeddingResponse(embeddingVector);

      const result = await testLLM.generateEmbeddings(GPT_EMBEDDINGS_GPT4, "test content", {
        resource: "test",
        purpose: LLMPurpose.EMBEDDINGS,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(Array.isArray(result.generated)).toBe(true);
        expect(result.generated).toEqual(embeddingVector);

        // Type should be number[] without casts
        result.generated.forEach((num: number) => {
          expect(typeof num).toBe("number");
        });
      }
    });
  });
});
