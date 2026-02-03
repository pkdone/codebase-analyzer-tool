import "reflect-metadata";
import MessagesPayloadBedrockLLM from "../../../../../../src/common/llm/providers/bedrock/common/messages-payload-bedrock-llm";
import { createMockErrorLoggingConfig } from "../../../../helpers/llm/mock-error-logger";
import { LLMPurpose } from "../../../../../../src/common/llm/types/llm-request.types";
import { ResolvedLLMModelMetadata } from "../../../../../../src/common/llm/types/llm-model.types";
import {
  LLMProviderSpecificConfig,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../../../src/common/llm/providers/llm-provider.types";
import { llmConfig } from "../../../../../../src/common/llm/config/llm.config";
import { z } from "zod";

// Mock concrete implementation for testing abstract class
class TestMessagesPayloadBedrockLLM extends MessagesPayloadBedrockLLM {
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

describe("MessagesPayloadBedrockLLM", () => {
  const TEST_MODEL_KEY = "TEST_COMPLETION_MODEL";

  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    EMBEDDINGS: {
      modelKey: "EMBEDDINGS",
      urnEnvKey: "TEST_EMBEDDINGS_KEY",
      urn: "test.embeddings",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    [TEST_MODEL_KEY]: {
      modelKey: TEST_MODEL_KEY,
      urnEnvKey: "TEST_COMPLETION_KEY",
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
      providerFamily: "test-standard",
      envSchema: z.object({}),
      models: {
        embeddings: [
          {
            modelKey: "EMBEDDINGS",
            urnEnvKey: "TEST_EMBEDDINGS_KEY",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1024,
            maxTotalTokens: 8192,
          },
        ],
        completions: [
          {
            modelKey: TEST_MODEL_KEY,
            urnEnvKey: "TEST_COMPLETION_KEY",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 128000,
          },
        ],
      },
      errorPatterns: [],
      providerSpecificConfig: mockConfig,
      extractConfig: () => ({}),
      implementation: TestMessagesPayloadBedrockLLM,
    };

    return {
      manifest,
      providerParams: {},
      resolvedModelChain: {
        embeddings: [
          {
            providerFamily: "test-standard",
            modelKey: "EMBEDDINGS",
            modelUrn: mockModelsMetadata.EMBEDDINGS.urn,
          },
        ],
        completions: [
          {
            providerFamily: "test-standard",
            modelKey: TEST_MODEL_KEY,
            modelUrn: mockModelsMetadata[TEST_MODEL_KEY].urn,
          },
        ],
      },
      errorLogging: createMockErrorLoggingConfig(),
      extractedConfig: {},
    };
  }

  describe("buildCompletionRequestBody", () => {
    it("should build request body with standard messages array format", () => {
      const llm = new TestMessagesPayloadBedrockLLM(createTestProviderInit());
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
      const llm = new TestMessagesPayloadBedrockLLM(createTestProviderInit());
      const testPrompt = "Test prompt content";

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, testPrompt);

      const body = requestBody as { messages: { role: string; content: string }[] };
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe(llmConfig.LLM_ROLE_USER);
      expect(body.messages[0].content).toBe(testPrompt);
    });

    it("should use maxCompletionTokens from model metadata", () => {
      const llm = new TestMessagesPayloadBedrockLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, "test");

      expect((requestBody as { max_tokens: number }).max_tokens).toBe(4096);
    });

    it("should use default temperature and top_p values", () => {
      const llm = new TestMessagesPayloadBedrockLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, "test");

      const body = requestBody as { temperature: number; top_p: number };
      expect(body.temperature).toBe(llmConfig.DEFAULT_ZERO_TEMP);
      expect(body.top_p).toBe(llmConfig.DEFAULT_TOP_P_LOWEST);
    });

    it("should handle prompts with special characters", () => {
      const llm = new TestMessagesPayloadBedrockLLM(createTestProviderInit());
      const complexPrompt = "Special chars: <>&\"'\nNewlines\tTabs";

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](TEST_MODEL_KEY, complexPrompt);

      const body = requestBody as { messages: { content: string }[] };
      expect(body.messages[0].content).toBe(complexPrompt);
    });
  });

  describe("getResponseExtractionConfig", () => {
    it("should be implemented by subclass", () => {
      const llm = new TestMessagesPayloadBedrockLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const config = llm["getResponseExtractionConfig"]();

      expect(config).toHaveProperty("schema");
      expect(config).toHaveProperty("pathConfig");
      expect(config).toHaveProperty("providerName");
    });
  });
});
