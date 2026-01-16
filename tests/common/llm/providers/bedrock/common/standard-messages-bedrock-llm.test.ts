import "reflect-metadata";
import StandardMessagesBedrockLLM from "../../../../../../src/common/llm/providers/bedrock/common/standard-messages-bedrock-llm";
import { createMockErrorLoggingConfig } from "../../../../helpers/llm/mock-error-logger";
import {
  ResolvedLLMModelMetadata,
  LLMPurpose,
} from "../../../../../../src/common/llm/types/llm.types";
import {
  LLMProviderSpecificConfig,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../../../src/common/llm/providers/llm-provider.types";
import { llmConfig } from "../../../../../../src/common/llm/config/llm.config";
import { z } from "zod";

// Mock concrete implementation for testing abstract class
class TestStandardMessagesBedrockLLM extends StandardMessagesBedrockLLM {
  protected getResponseExtractionConfig() {
    return {
      schema: z.object({ content: z.string() }),
      pathConfig: {
        contentPath: "content",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "length",
      },
      providerName: "Test",
    };
  }
}

describe("StandardMessagesBedrockLLM", () => {
  const TEST_MODEL_KEY = "TEST_COMPLETION_MODEL";

  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    EMBEDDINGS: {
      modelKey: "EMBEDDINGS",
      name: "Test Embeddings",
      urn: "test.embeddings",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    [TEST_MODEL_KEY]: {
      modelKey: TEST_MODEL_KEY,
      name: "Test Completion Model",
      urn: "test.completion",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  };

  const mockConfig: LLMProviderSpecificConfig = {
    requestTimeoutMillis: 60000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 10000,
  };

  function createTestProviderInit(): ProviderInit {
    const manifest: LLMProviderManifest = {
      providerName: "Test Provider",
      modelFamily: "TestFamily",
      envSchema: z.object({}),
      models: {
        embeddings: {
          modelKey: "EMBEDDINGS",
          name: "Test Embeddings",
          urnEnvKey: "TEST_EMBEDDINGS_KEY",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1024,
          maxTotalTokens: 8192,
        },
        primaryCompletion: {
          modelKey: TEST_MODEL_KEY,
          name: "Test Completion Model",
          urnEnvKey: "TEST_COMPLETION_KEY",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 128000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: mockConfig,
      implementation: TestStandardMessagesBedrockLLM,
    };

    return {
      manifest,
      providerParams: {},
      resolvedModels: {
        embeddings: mockModelsMetadata.EMBEDDINGS.urn,
        primaryCompletion: mockModelsMetadata[TEST_MODEL_KEY].urn,
      },
      errorLogging: createMockErrorLoggingConfig(),
    };
  }

  describe("buildCompletionRequestBody", () => {
    it("should build request body with standard messages array format", () => {
      const llm = new TestStandardMessagesBedrockLLM(createTestProviderInit());
      const testPrompt = "Analyze this code";

      // Access protected method for testing
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, testPrompt);

      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("max_tokens");
      expect(requestBody).toHaveProperty("temperature");
      expect(requestBody).toHaveProperty("top_p");
    });

    it("should include user message with correct role and content", () => {
      const llm = new TestStandardMessagesBedrockLLM(createTestProviderInit());
      const testPrompt = "Test prompt content";

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, testPrompt);

      const body = requestBody as { messages: { role: string; content: string }[] };
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe(llmConfig.LLM_ROLE_USER);
      expect(body.messages[0].content).toBe(testPrompt);
    });

    it("should use maxCompletionTokens from model metadata", () => {
      const llm = new TestStandardMessagesBedrockLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, "test");

      expect((requestBody as { max_tokens: number }).max_tokens).toBe(4096);
    });

    it("should use default temperature and top_p values", () => {
      const llm = new TestStandardMessagesBedrockLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, "test");

      const body = requestBody as { temperature: number; top_p: number };
      expect(body.temperature).toBe(llmConfig.DEFAULT_ZERO_TEMP);
      expect(body.top_p).toBe(llmConfig.DEFAULT_TOP_P_LOWEST);
    });

    it("should handle prompts with special characters", () => {
      const llm = new TestStandardMessagesBedrockLLM(createTestProviderInit());
      const complexPrompt = "Special chars: <>&\"'\nNewlines\tTabs";

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, complexPrompt);

      const body = requestBody as { messages: { content: string }[] };
      expect(body.messages[0].content).toBe(complexPrompt);
    });
  });

  describe("getResponseExtractionConfig", () => {
    it("should be implemented by subclass", () => {
      const llm = new TestStandardMessagesBedrockLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const config = llm["getResponseExtractionConfig"]();

      expect(config).toHaveProperty("schema");
      expect(config).toHaveProperty("pathConfig");
      expect(config).toHaveProperty("providerName");
    });
  });
});
