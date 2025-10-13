import "reflect-metadata";
import BedrockClaudeLLM from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude-llm";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMPurpose,
} from "../../../../../src/llm/types/llm.types";
import { LLMProviderSpecificConfig } from "../../../../../src/llm/providers/llm-provider.types";
import { createMockJsonProcessor } from "../../../../helpers/json-processor-mock";
import { llmConfig } from "../../../../../src/llm/llm.config";
import { AWS_COMPLETIONS_CLAUDE_V40 } from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest";

// Define model keys used in tests (matching the manifest internal constants)
const AWS_COMPLETIONS_CLAUDE_V37 = "AWS_COMPLETIONS_CLAUDE_V37";

describe("BedrockClaudeLLM - Request Body Building", () => {
  const mockModelsKeys: LLMModelKeysSet = {
    embeddingsModelKey: "EMBEDDINGS",
    primaryCompletionModelKey: AWS_COMPLETIONS_CLAUDE_V37,
  };

  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    EMBEDDINGS: {
      modelKey: "EMBEDDINGS",
      urn: "amazon.titan-embed-text-v2:0",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    [AWS_COMPLETIONS_CLAUDE_V37]: {
      modelKey: AWS_COMPLETIONS_CLAUDE_V37,
      urn: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 200000,
    },
    [AWS_COMPLETIONS_CLAUDE_V40]: {
      modelKey: AWS_COMPLETIONS_CLAUDE_V40,
      urn: "us.anthropic.claude-4-0-preview-20250514-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 64000,
      maxTotalTokens: 1000000,
    },
  };

  const mockConfig: LLMProviderSpecificConfig = {
    requestTimeoutMillis: 60000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 10000,
    temperature: 0.0,
    topP: 0.95,
    topK: 40,
    apiVersion: "bedrock-2023-05-31",
    anthropicBetaFlags: ["context-1m-2025-08-07"],
  };

  describe("buildCompletionRequestBody", () => {
    it("should build correct request body for Claude 3.7", () => {
      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: mockConfig },
        createMockJsonProcessor(),
      );

      const testPrompt = "Analyze this code";
      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, testPrompt);

      // Verify structure
      expect(requestBody).toHaveProperty("anthropic_version", "bedrock-2023-05-31");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("temperature", 0.0);
      expect(requestBody).toHaveProperty("top_p", 0.95);
      expect(requestBody).toHaveProperty("top_k", 40);
      expect(requestBody).toHaveProperty("max_tokens", 8192);

      // Verify messages structure
      const body = requestBody as any;
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({
        role: llmConfig.LLM_ROLE_USER,
        content: [
          {
            type: "text",
            text: testPrompt,
          },
        ],
      });

      // Verify NO anthropic_beta for Claude 3.7
      expect(requestBody).not.toHaveProperty("anthropic_beta");
    });

    it("should include anthropic_beta for Claude 4.0 model", () => {
      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: mockConfig },
        createMockJsonProcessor(),
      );

      const testPrompt = "Analyze large codebase";
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V40, testPrompt);

      // Verify structure includes beta header for 1M context
      expect(requestBody).toHaveProperty("anthropic_beta");
      const body = requestBody as any;
      expect(body.anthropic_beta).toEqual(["context-1m-2025-08-07"]);

      // Verify other standard fields are still present
      expect(requestBody).toHaveProperty("anthropic_version", "bedrock-2023-05-31");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("max_tokens", 64000);
    });

    it("should use default values when config values are missing", () => {
      const minimalConfig: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 10000,
        apiVersion: "bedrock-2023-05-31",
        // temperature, topP, topK intentionally omitted
      };

      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: minimalConfig },
        createMockJsonProcessor(),
      );

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, "test");

      const body = requestBody as any;
      expect(body.temperature).toBe(llmConfig.DEFAULT_ZERO_TEMP);
      expect(body.top_p).toBe(llmConfig.DEFAULT_TOP_P_LOWEST);
      expect(body.top_k).toBe(llmConfig.DEFAULT_TOP_K_LOWEST);
    });

    it("should properly embed prompt in messages content array", () => {
      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: mockConfig },
        createMockJsonProcessor(),
      );

      const complexPrompt = "Line 1\nLine 2\nSpecial chars: <>&\"'";
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](
        AWS_COMPLETIONS_CLAUDE_V37,
        complexPrompt,
      );

      const body = requestBody as any;
      expect(body.messages[0].content[0].text).toBe(complexPrompt);
      expect(body.messages[0].content[0].type).toBe("text");
    });

    it("should use correct maxCompletionTokens from model metadata", () => {
      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: mockConfig },
        createMockJsonProcessor(),
      );

      // Test with Claude 3.7 (8192 max tokens)
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody37 = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, "test");
      expect((requestBody37 as any).max_tokens).toBe(8192);

      // Test with Claude 4.0 (64000 max tokens)
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody40 = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V40, "test");
      expect((requestBody40 as any).max_tokens).toBe(64000);
    });

    it("should return an object, not a string", () => {
      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: mockConfig },
        createMockJsonProcessor(),
      );

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, "test");

      expect(typeof requestBody).toBe("object");
      expect(requestBody).not.toBeNull();
      expect(typeof requestBody).not.toBe("string");
    });
  });

  describe("getResponseExtractionConfig", () => {
    it("should return correct extraction configuration", () => {
      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: mockConfig },
        createMockJsonProcessor(),
      );

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const config = llm["getResponseExtractionConfig"]();

      expect(config).toHaveProperty("schema");
      expect(config).toHaveProperty("pathConfig");
      expect(config).toHaveProperty("providerName", "Claude");

      // Verify path configuration
      expect(config.pathConfig).toEqual({
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "length",
      });
    });
  });

  describe("getModelFamily", () => {
    it("should return correct model family", () => {
      const llm = new BedrockClaudeLLM(
        mockModelsKeys,
        mockModelsMetadata,
        [],
        { providerSpecificConfig: mockConfig },
        createMockJsonProcessor(),
      );

      expect(llm.getModelFamily()).toBe("BedrockClaude");
    });
  });
});
