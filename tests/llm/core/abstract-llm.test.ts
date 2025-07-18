import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
  LLMErrorMsgRegExPattern,
  LLMResponseTokensUsage,
  LLMContext,
} from "../../../src/llm/llm.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderSpecificConfig,
} from "../../../src/llm/providers/llm-provider.types";
import AbstractLLM from "../../../src/llm/core/abstract-llm";
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
    const providerConfig: LLMProviderSpecificConfig = {};

    super(modelsKeys, testModelsMetadata, errorPatterns, providerConfig);
  }

  // Method to set mock token usage for testing
  setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
    this.mockTokenUsage = tokenUsage;
  }

  getModelFamily(): string {
    return "test";
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async invokeImplementationSpecificLLM(): Promise<LLMImplSpecificResponseSummary> {
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

      expect(result.tokensUage).toStrictEqual({
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

      expect(result.tokensUage).toStrictEqual({
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

      expect(result.tokensUage).toStrictEqual({
        completionTokens: 200,
        promptTokens: 32569,
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
      const providerConfig: LLMProviderSpecificConfig = {};

      class TestLlamaLLM extends AbstractLLM {
        private mockTokenUsage: LLMResponseTokensUsage = {
          promptTokens: 10,
          completionTokens: 20,
          maxTotalTokens: 100,
        };

        constructor() {
          super(modelsKeys, testModelsMetadata, errorPatterns, providerConfig);
        }

        setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
          this.mockTokenUsage = tokenUsage;
        }

        getModelFamily(): string {
          return "test";
        }

        // eslint-disable-next-line @typescript-eslint/require-await
        protected async invokeImplementationSpecificLLM(): Promise<LLMImplSpecificResponseSummary> {
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

      expect(result.tokensUage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 243,
        maxTotalTokens: 128000,
      });
    });
  });
});
