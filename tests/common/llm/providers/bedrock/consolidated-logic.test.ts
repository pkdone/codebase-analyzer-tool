import BaseBedrockLLM from "../../../../../src/common/llm/providers/bedrock/common/base-bedrock-llm";
import BedrockDeepseekLLM from "../../../../../src/common/llm/providers/bedrock/deepseek/bedrock-deepseek-llm";
import BedrockMistralLLM from "../../../../../src/common/llm/providers/bedrock/mistral/bedrock-mistral-llm";
import BedrockClaudeLLM from "../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude-llm";
import BedrockLlamaLLM from "../../../../../src/common/llm/providers/bedrock/llama/bedrock-llama-llm";
import BedrockNovaLLM from "../../../../../src/common/llm/providers/bedrock/nova/bedrock-nova-llm";
import type { ProviderInit } from "../../../../../src/common/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../../../src/common/llm/types/llm-request.types";
import { z } from "zod";

/**
 * Tests for consolidated Bedrock logic.
 * Verifies that default buildCompletionRequestBody is inherited correctly.
 */
describe("Consolidated Bedrock Logic", () => {
  const createInit = (): ProviderInit => ({
    manifest: {
      providerName: "Test Bedrock",
      modelFamily: "test-bedrock",
      envSchema: z.object({}),
      models: {
        embeddings: {
          modelKey: "test-embed",
          name: "Test Embeddings",
          urnEnvKey: "TEST_EMBED",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 8192,
        },
        primaryCompletion: {
          modelKey: "test-complete",
          name: "Test Completion",
          urnEnvKey: "TEST_COMPLETE",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 128000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      implementation: BaseBedrockLLM as any,
    },
    providerParams: {},
    resolvedModels: {
      embeddings: "test-embed-urn",
      primaryCompletion: "test-complete-urn",
    },
    errorLogging: {
      errorLogDirectory: "/tmp/test-errors",
      errorLogFilenameTemplate: "error-{timestamp}.log",
    },
  });

  describe("BaseBedrockLLM default implementation", () => {
    it("should have a non-abstract buildCompletionRequestBody method", () => {
      const init = createInit();
      const deepseek = new BedrockDeepseekLLM(init);

      // Access protected method via type assertion
      const method = (deepseek as any).buildCompletionRequestBody;

      expect(method).toBeDefined();
      expect(typeof method).toBe("function");
    });

    it("should return standard messages array format from default implementation", () => {
      const init = createInit();
      const deepseek = new BedrockDeepseekLLM(init);

      const result = (deepseek as any).buildCompletionRequestBody("test-complete", "test prompt");

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages[0]).toHaveProperty("role");
      expect(result.messages[0]).toHaveProperty("content");
    });
  });

  describe("Deepseek and Mistral use default implementation", () => {
    it("should use inherited buildCompletionRequestBody for Deepseek", () => {
      const init = createInit();
      const deepseek = new BedrockDeepseekLLM(init);

      const result = (deepseek as any).buildCompletionRequestBody("test-complete", "test prompt");

      // Should have standard messages array format
      expect(result.messages).toBeDefined();
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content).toBe("test prompt");
    });

    it("should use inherited buildCompletionRequestBody for Mistral", () => {
      const init = createInit();
      const mistral = new BedrockMistralLLM(init);

      const result = (mistral as any).buildCompletionRequestBody("test-complete", "test prompt");

      // Should have standard messages array format
      expect(result.messages).toBeDefined();
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content).toBe("test prompt");
    });

    it("should produce identical results for Deepseek and Mistral", () => {
      const init = createInit();
      const deepseek = new BedrockDeepseekLLM(init);
      const mistral = new BedrockMistralLLM(init);

      const deepseekResult = (deepseek as any).buildCompletionRequestBody(
        "test-complete",
        "test prompt",
      );
      const mistralResult = (mistral as any).buildCompletionRequestBody(
        "test-complete",
        "test prompt",
      );

      expect(deepseekResult).toEqual(mistralResult);
    });
  });

  describe("Claude, Llama, and Nova override implementation", () => {
    it("should have custom buildCompletionRequestBody for Claude", () => {
      const init = createInit();
      // Add apiVersion required for Claude
      init.manifest.providerSpecificConfig = {
        ...init.manifest.providerSpecificConfig,
        apiVersion: "bedrock-2023-05-31",
      };
      const claude = new BedrockClaudeLLM(init);

      const result = (claude as any).buildCompletionRequestBody("test-complete", "test prompt");

      // Claude uses custom format with anthropic_version
      expect(result.anthropic_version).toBeDefined();
      expect(result.messages).toBeDefined();
    });

    it("should have custom buildCompletionRequestBody for Llama", () => {
      const init = createInit();
      const llama = new BedrockLlamaLLM(init);

      const result = (llama as any).buildCompletionRequestBody("test-complete", "test prompt");

      // Llama uses custom format with prompt instead of messages
      expect(result.prompt).toBeDefined();
      expect(result.messages).toBeUndefined();
    });

    it("should have custom buildCompletionRequestBody for Nova", () => {
      const init = createInit();
      const nova = new BedrockNovaLLM(init);

      const result = (nova as any).buildCompletionRequestBody("test-complete", "test prompt");

      // Nova uses custom format with inferenceConfig
      expect(result.inferenceConfig).toBeDefined();
      expect(result.messages).toBeDefined();
    });

    it("should produce different results from default for custom implementations", () => {
      const init = createInit();
      // Add apiVersion required for Claude
      init.manifest.providerSpecificConfig = {
        ...init.manifest.providerSpecificConfig,
        apiVersion: "bedrock-2023-05-31",
      };
      const deepseek = new BedrockDeepseekLLM(init);
      const claude = new BedrockClaudeLLM(init);
      const llama = new BedrockLlamaLLM(init);
      const nova = new BedrockNovaLLM(init);

      const deepseekResult = (deepseek as any).buildCompletionRequestBody(
        "test-complete",
        "test prompt",
      );
      const claudeResult = (claude as any).buildCompletionRequestBody(
        "test-complete",
        "test prompt",
      );
      const llamaResult = (llama as any).buildCompletionRequestBody("test-complete", "test prompt");
      const novaResult = (nova as any).buildCompletionRequestBody("test-complete", "test prompt");

      // Each custom implementation should be different from the default
      expect(claudeResult).not.toEqual(deepseekResult);
      expect(llamaResult).not.toEqual(deepseekResult);
      expect(novaResult).not.toEqual(deepseekResult);
    });
  });

  describe("DRY principle verification", () => {
    it("should eliminate code duplication between Deepseek and Mistral", () => {
      // This test verifies that Deepseek and Mistral no longer have
      // duplicate implementations of buildCompletionRequestBody

      const init = createInit();
      const deepseek = new BedrockDeepseekLLM(init);
      const mistral = new BedrockMistralLLM(init);

      // Both should use the same method from base class (check by comparing method implementations)
      const deepseekMethod = (deepseek as any).buildCompletionRequestBody.toString();
      const mistralMethod = (mistral as any).buildCompletionRequestBody.toString();

      // They should have the same implementation (inherited from base class)
      expect(deepseekMethod).toBe(mistralMethod);

      // Verify they both use buildStandardMessagesArray (the base implementation)
      expect(deepseekMethod).toContain("buildStandardMessagesArray");
      expect(mistralMethod).toContain("buildStandardMessagesArray");
    });

    it("should allow override keyword for custom implementations", () => {
      // Verify that Claude, Llama, and Nova have their own implementations
      // (TypeScript's override keyword ensures this at compile time)

      const init = createInit();
      // Add apiVersion required for Claude
      init.manifest.providerSpecificConfig = {
        ...init.manifest.providerSpecificConfig,
        apiVersion: "bedrock-2023-05-31",
      };
      const deepseek = new BedrockDeepseekLLM(init);
      const claude = new BedrockClaudeLLM(init);

      const deepseekMethod = (deepseek as any).buildCompletionRequestBody.toString();
      const claudeMethod = (claude as any).buildCompletionRequestBody.toString();

      // The methods should have different implementations
      expect(deepseekMethod).not.toBe(claudeMethod);
    });
  });
});
