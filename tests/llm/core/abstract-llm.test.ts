import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
  LLMErrorMsgRegExPattern,
  LLMResponseTokensUsage,
  LLMContext,
  LLMOutputFormat,
  LLMResponseStatus,
} from "../../../src/llm/types/llm.types";
import { SANITIZATION_STEP } from "../../../src/llm/json-processing/sanitizers";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderSpecificConfig,
} from "../../../src/llm/providers/llm-provider.types";
import AbstractLLM from "../../../src/llm/providers/abstract-llm";
import { AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT } from "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";

// Test-only constants
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
const GPT_EMBEDDINGS_GPT4 = "GPT_EMBEDDINGS_GPT4";

// Test models metadata for generic token extraction tests
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
  [GPT_EMBEDDINGS_GPT4]: {
    modelKey: GPT_EMBEDDINGS_GPT4,
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

// Test concrete class that extends AbstractLLM to test token extraction functionality
class TestLLM extends AbstractLLM {
  private mockTokenUsage: LLMResponseTokensUsage = {
    promptTokens: 10,
    completionTokens: 20,
    maxTotalTokens: 100,
  };

  constructor() {
    const modelsKeys: LLMModelKeysSet = {
      embeddingsModelKey: GPT_EMBEDDINGS_GPT4,
      primaryCompletionModelKey: GPT_COMPLETIONS_GPT4_32k,
    };
    const errorPatterns: LLMErrorMsgRegExPattern[] = [];
    const providerConfig: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    };

    super(modelsKeys, testModelsMetadata, errorPatterns, providerConfig, "test");
  }

  // Method to set mock token usage for testing
  setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
    this.mockTokenUsage = tokenUsage;
  }

  protected async invokeProvider(): Promise<LLMImplSpecificResponseSummary> {
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
    test("extracts tokens with missing maxTotalTokens", async () => {
      const tokenUsage = {
        promptTokens: 200,
        completionTokens: 0,
        maxTotalTokens: -1,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 200,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens with missing completionTokens", async () => {
      const tokenUsage = {
        promptTokens: 32760,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 32760,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens with missing promptTokens", async () => {
      const tokenUsage = {
        promptTokens: -1,
        completionTokens: 200,
        maxTotalTokens: -1,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 200,
        promptTokens: 32769,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens for different model", async () => {
      // Create a TestLLM that uses the Llama model as primary
      const modelsKeys: LLMModelKeysSet = {
        embeddingsModelKey: GPT_EMBEDDINGS_GPT4,
        primaryCompletionModelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
      };
      const errorPatterns: LLMErrorMsgRegExPattern[] = [];
      const providerConfig: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      };

      class TestLlamaLLM extends AbstractLLM {
        private mockTokenUsage: LLMResponseTokensUsage = {
          promptTokens: 10,
          completionTokens: 20,
          maxTotalTokens: 100,
        };

        constructor() {
          super(modelsKeys, testModelsMetadata, errorPatterns, providerConfig, "test");
        }

        setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
          this.mockTokenUsage = tokenUsage;
        }

        protected async invokeProvider(): Promise<LLMImplSpecificResponseSummary> {
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
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      llamaLLM.setMockTokenUsage(tokenUsage);

      const result = await llamaLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 243,
        maxTotalTokens: 128000,
      });
    });
  });
});

// Test class for JSON response testing
class TestJSONLLM extends AbstractLLM {
  private mockResponseContent = "";
  private mockIsIncomplete = false;

  constructor() {
    const modelsKeys: LLMModelKeysSet = {
      embeddingsModelKey: GPT_EMBEDDINGS_GPT4,
      primaryCompletionModelKey: GPT_COMPLETIONS_GPT4_32k,
    };
    const errorPatterns: LLMErrorMsgRegExPattern[] = [];
    const providerConfig: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    };

    super(modelsKeys, testModelsMetadata, errorPatterns, providerConfig, "test");
  }

  setMockResponse(content: string, isIncomplete = false) {
    this.mockResponseContent = content;
    this.mockIsIncomplete = isIncomplete;
  }

  protected async invokeProvider(): Promise<LLMImplSpecificResponseSummary> {
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
    test("should have empty sanitization steps for clean JSON with whitespace", async () => {
      // JSON with leading/trailing whitespace is handled by JSON.parse naturally
      testLLM.setMockResponse('  {"name": "test", "value": 123}  ');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(result.mutationSteps).toEqual([]);
    });

    test("should propagate sanitization steps for JSON with code fences", async () => {
      // JSON wrapped in markdown code fence requires sanitization
      testLLM.setMockResponse('```json\n{"name": "test", "value": 123}\n```');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(
        result.mutationSteps?.some(
          (s: string) =>
            s.includes("Fixed JSON structure and noise") ||
            s.includes("Removed markdown code fences") ||
            s === SANITIZATION_STEP.REMOVED_CODE_FENCES,
        ),
      ).toBe(true);
    });

    test("should propagate sanitization steps for JSON with trailing comma", async () => {
      // JSON with trailing comma (requires sanitization)
      testLLM.setMockResponse('{"name": "test", "value": 123,}');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(result.mutationSteps?.length).toBeGreaterThan(0);
    });

    test("should not have sanitization steps for clean JSON", async () => {
      // Clean JSON that doesn't need any sanitization
      testLLM.setMockResponse('{"name":"test","value":123}');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(result.mutationSteps).toEqual([]);
    });

    test("should not have sanitization steps for text output format", async () => {
      // When output format is TEXT, no sanitization steps should be recorded
      testLLM.setMockResponse("This is plain text");

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeUndefined();
    });

    test("should not have sanitization steps when JSON parsing fails", async () => {
      // Invalid JSON that cannot be fixed
      testLLM.setMockResponse("This is not JSON at all");

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.INVALID);
      expect(result.mutationSteps).toBeUndefined();
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
        (metadata as any).newKey = "newValue";
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
