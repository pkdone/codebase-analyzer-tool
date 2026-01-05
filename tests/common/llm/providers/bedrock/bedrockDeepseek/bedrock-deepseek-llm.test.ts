import "reflect-metadata";
import BedrockDeepseekLLM from "../../../../../../src/common/llm/providers/bedrock/deepseek/bedrock-deepseek-llm";
import { createMockErrorLogger } from "../../../../helpers/llm/mock-error-logger";
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
import { bedrockDeepseekProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/deepseek/bedrock-deepseek.manifest";

// Define model key used in tests (matching the manifest internal constant)
const AWS_COMPLETIONS_DEEPSEEK_R1 = "AWS_COMPLETIONS_DEEPSEEK_R1";

describe("BedrockDeepseekLLM - Request Body Building", () => {
  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    EMBEDDINGS: {
      modelKey: "EMBEDDINGS",
      name: "Titan Embeddings v1",
      urn: "amazon.titan-embed-text-v2:0",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    [AWS_COMPLETIONS_DEEPSEEK_R1]: {
      modelKey: AWS_COMPLETIONS_DEEPSEEK_R1,
      name: "Deepseek R1",
      urn: "us.amazon.deepseek-r1-distill-qwen-32b-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 64000,
    },
  };

  const mockConfig: LLMProviderSpecificConfig = {
    requestTimeoutMillis: 60000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 10000,
    temperature: 0.0,
    topP: 0.95,
  };

  // Helper function to create ProviderInit for tests
  function createTestProviderInit(): ProviderInit {
    const manifest: LLMProviderManifest = {
      ...bedrockDeepseekProviderManifest,
      providerSpecificConfig: mockConfig,
    };

    return {
      manifest,
      providerParams: {},
      resolvedModels: {
        embeddings: mockModelsMetadata.EMBEDDINGS.urn,
        primaryCompletion: mockModelsMetadata[AWS_COMPLETIONS_DEEPSEEK_R1].urn,
      },
      errorLogger: createMockErrorLogger(),
    };
  }

  describe("buildCompletionRequestBody", () => {
    it("should build correct request body for Deepseek R1", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      const testPrompt = "Analyze this code with reasoning";
      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](
        AWS_COMPLETIONS_DEEPSEEK_R1,
        testPrompt,
      );

      // Verify structure
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("temperature", llmConfig.DEFAULT_ZERO_TEMP);
      expect(requestBody).toHaveProperty("top_p", llmConfig.DEFAULT_TOP_P_LOWEST);
      expect(requestBody).toHaveProperty("max_tokens", 16384);

      // Verify messages structure (Deepseek uses simpler format)
      const body = requestBody as any;
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({
        role: llmConfig.LLM_ROLE_USER,
        content: testPrompt,
      });
    });

    it("should use correct maxCompletionTokens from model metadata", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_DEEPSEEK_R1, "test");
      expect((requestBody as any).max_tokens).toBe(16384);
    });

    it("should not include apiVersion like Claude does", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_DEEPSEEK_R1, "test");

      // Deepseek doesn't use anthropic_version
      expect(requestBody).not.toHaveProperty("anthropic_version");
      expect(requestBody).not.toHaveProperty("apiVersion");
    });

    it("should not wrap content in array like Claude does", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      const testPrompt = "Direct content test";
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](
        AWS_COMPLETIONS_DEEPSEEK_R1,
        testPrompt,
      );

      const body = requestBody as any;
      // Content should be a direct string, not an array of objects
      expect(body.messages[0].content).toBe(testPrompt);
      expect(Array.isArray(body.messages[0].content)).toBe(false);
    });

    it("should handle prompts with special characters", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      const complexPrompt = "Special chars: <>&\"'\nNewlines\tTabs";
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](
        AWS_COMPLETIONS_DEEPSEEK_R1,
        complexPrompt,
      );

      const body = requestBody as any;
      expect(body.messages[0].content).toBe(complexPrompt);
    });

    it("should use hardcoded default temperature and top_p", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_DEEPSEEK_R1, "test");

      // Deepseek uses hardcoded defaults, not config values
      const body = requestBody as any;
      expect(body.temperature).toBe(llmConfig.DEFAULT_ZERO_TEMP);
      expect(body.top_p).toBe(llmConfig.DEFAULT_TOP_P_LOWEST);
    });

    it("should return an object, not a string", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_DEEPSEEK_R1, "test");

      expect(typeof requestBody).toBe("object");
      expect(requestBody).not.toBeNull();
      expect(typeof requestBody).not.toBe("string");
    });
  });

  describe("getResponseExtractionConfig", () => {
    it("should return correct extraction configuration with alternative paths", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const config = llm["getResponseExtractionConfig"]();

      expect(config).toHaveProperty("schema");
      expect(config).toHaveProperty("pathConfig");
      expect(config).toHaveProperty("providerName", "Deepseek");

      // Verify path configuration includes alternative content path for reasoning_content
      expect(config.pathConfig).toEqual({
        contentPath: "choices[0].message.content",
        alternativeContentPath: "choices[0].message.reasoning_content",
        promptTokensPath: "usage.inputTokens",
        completionTokensPath: "usage.outputTokens",
        stopReasonPath: "choices[0].stop_reason",
        stopReasonValueForLength: "length",
      });
    });

    it("should have alternative content path for reasoning content", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const config = llm["getResponseExtractionConfig"]();

      // Deepseek's unique feature: reasoning_content as alternative
      expect(config.pathConfig.alternativeContentPath).toBe("choices[0].message.reasoning_content");
    });
  });

  describe("getModelFamily", () => {
    it("should return correct model family", () => {
      const llm = new BedrockDeepseekLLM(createTestProviderInit());

      expect(llm.getModelFamily()).toBe("Bedrock Deepseek");
    });
  });
});
