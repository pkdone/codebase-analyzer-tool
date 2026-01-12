/**
 * Tests for type safety improvements in Bedrock LLM providers.
 * These tests verify the stricter typing introduced for JsonObject return types
 * and maxCompletionTokens validation.
 */

import "reflect-metadata";
import BedrockClaudeLLM from "../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude-llm";
import BedrockNovaLLM from "../../../../../src/common/llm/providers/bedrock/nova/bedrock-nova-llm";
import {
  ResolvedLLMModelMetadata,
  LLMPurpose,
} from "../../../../../src/common/llm/types/llm.types";
import {
  LLMProviderSpecificConfig,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../../src/common/llm/providers/llm-provider.types";
import { bedrockClaudeProviderManifest } from "../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude.manifest";
import { bedrockNovaProviderManifest } from "../../../../../src/common/llm/providers/bedrock/nova/bedrock-nova.manifest";
import { createMockErrorLogger } from "../../../helpers/llm/mock-error-logger";
import { LLMError, LLMErrorCode } from "../../../../../src/common/llm/types/llm-errors.types";

// Mock the Bedrock client
jest.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    destroy: jest.fn(),
  })),
  InvokeModelCommand: jest.fn(),
  ServiceUnavailableException: class ServiceUnavailableException extends Error {},
  ThrottlingException: class ThrottlingException extends Error {},
  ModelTimeoutException: class ModelTimeoutException extends Error {},
  ValidationException: class ValidationException extends Error {},
}));

describe("Bedrock Type Safety Improvements", () => {
  describe("maxCompletionTokens validation", () => {
    const baseConfig: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 10000,
      temperature: 0.0,
      topK: 40,
      apiVersion: "bedrock-2023-05-31",
    };

    describe("BedrockClaudeLLM", () => {
      const createClaudeProviderInit = (
        modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
      ): ProviderInit => {
        const embeddingsKey = Object.keys(modelsMetadata).find(
          (k) => modelsMetadata[k].purpose === LLMPurpose.EMBEDDINGS,
        )!;
        const completionKey = Object.keys(modelsMetadata).find(
          (k) => modelsMetadata[k].purpose === LLMPurpose.COMPLETIONS,
        )!;

        const manifest: LLMProviderManifest = {
          ...bedrockClaudeProviderManifest,
          providerSpecificConfig: baseConfig,
          models: {
            embeddings: {
              ...bedrockClaudeProviderManifest.models.embeddings,
              modelKey: embeddingsKey,
            },
            primaryCompletion: {
              ...bedrockClaudeProviderManifest.models.primaryCompletion,
              modelKey: completionKey,
              maxCompletionTokens: modelsMetadata[completionKey].maxCompletionTokens,
            },
          },
        };

        return {
          manifest,
          providerParams: {},
          resolvedModels: {
            embeddings: modelsMetadata[embeddingsKey].urn,
            primaryCompletion: modelsMetadata[completionKey].urn,
          },
          errorLogger: createMockErrorLogger(),
        };
      };

      it("should throw LLMError when maxCompletionTokens is undefined", () => {
        const modelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
          EMBEDDINGS: {
            modelKey: "EMBEDDINGS",
            name: "Titan Embeddings",
            urn: "amazon.titan-embed-text-v2:0",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1024,
            maxTotalTokens: 8192,
          },
          COMPLETIONS: {
            modelKey: "COMPLETIONS",
            name: "Claude",
            urn: "anthropic.claude-3-sonnet",
            purpose: LLMPurpose.COMPLETIONS,
            // maxCompletionTokens intentionally undefined
            maxTotalTokens: 200000,
          },
        };

        const provider = new BedrockClaudeLLM(createClaudeProviderInit(modelsMetadata));

        // Access the protected method via casting for testing
        const buildBody = (provider as any).buildCompletionRequestBody.bind(provider);

        expect(() => buildBody("COMPLETIONS", "test prompt")).toThrow(LLMError);
        try {
          buildBody("COMPLETIONS", "test prompt");
        } catch (error) {
          expect(error).toBeInstanceOf(LLMError);
          expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
          expect((error as LLMError).message).toContain("maxCompletionTokens is undefined");
        }
      });

      it("should successfully build request body when maxCompletionTokens is defined", () => {
        const modelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
          EMBEDDINGS: {
            modelKey: "EMBEDDINGS",
            name: "Titan Embeddings",
            urn: "amazon.titan-embed-text-v2:0",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1024,
            maxTotalTokens: 8192,
          },
          COMPLETIONS: {
            modelKey: "COMPLETIONS",
            name: "Claude",
            urn: "anthropic.claude-3-sonnet",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 8192,
            maxTotalTokens: 200000,
          },
        };

        const provider = new BedrockClaudeLLM(createClaudeProviderInit(modelsMetadata));

        // Access the protected method via casting for testing
        const buildBody = (provider as any).buildCompletionRequestBody.bind(provider);

        const body = buildBody("COMPLETIONS", "test prompt");

        expect(body).toBeDefined();
        expect(body.max_tokens).toBe(8192);
        expect(body.anthropic_version).toBe("bedrock-2023-05-31");
      });
    });

    describe("BedrockNovaLLM", () => {
      const createNovaProviderInit = (
        modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
      ): ProviderInit => {
        const embeddingsKey = Object.keys(modelsMetadata).find(
          (k) => modelsMetadata[k].purpose === LLMPurpose.EMBEDDINGS,
        )!;
        const completionKey = Object.keys(modelsMetadata).find(
          (k) => modelsMetadata[k].purpose === LLMPurpose.COMPLETIONS,
        )!;

        const manifest: LLMProviderManifest = {
          ...bedrockNovaProviderManifest,
          providerSpecificConfig: baseConfig,
          models: {
            embeddings: {
              ...bedrockNovaProviderManifest.models.embeddings,
              modelKey: embeddingsKey,
            },
            primaryCompletion: {
              ...bedrockNovaProviderManifest.models.primaryCompletion,
              modelKey: completionKey,
              maxCompletionTokens: modelsMetadata[completionKey].maxCompletionTokens,
            },
          },
        };

        return {
          manifest,
          providerParams: {},
          resolvedModels: {
            embeddings: modelsMetadata[embeddingsKey].urn,
            primaryCompletion: modelsMetadata[completionKey].urn,
          },
          errorLogger: createMockErrorLogger(),
        };
      };

      it("should throw LLMError when maxCompletionTokens is undefined", () => {
        const modelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
          EMBEDDINGS: {
            modelKey: "EMBEDDINGS",
            name: "Titan Embeddings",
            urn: "amazon.titan-embed-text-v2:0",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1024,
            maxTotalTokens: 8192,
          },
          COMPLETIONS: {
            modelKey: "COMPLETIONS",
            name: "Nova",
            urn: "amazon.nova-pro-v1:0",
            purpose: LLMPurpose.COMPLETIONS,
            // maxCompletionTokens intentionally undefined
            maxTotalTokens: 300000,
          },
        };

        const provider = new BedrockNovaLLM(createNovaProviderInit(modelsMetadata));

        // Access the protected method via casting for testing
        const buildBody = (provider as any).buildCompletionRequestBody.bind(provider);

        expect(() => buildBody("COMPLETIONS", "test prompt")).toThrow(LLMError);
        try {
          buildBody("COMPLETIONS", "test prompt");
        } catch (error) {
          expect(error).toBeInstanceOf(LLMError);
          expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
          expect((error as LLMError).message).toContain("maxCompletionTokens is undefined");
        }
      });

      it("should successfully build request body when maxCompletionTokens is defined", () => {
        const modelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
          EMBEDDINGS: {
            modelKey: "EMBEDDINGS",
            name: "Titan Embeddings",
            urn: "amazon.titan-embed-text-v2:0",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1024,
            maxTotalTokens: 8192,
          },
          COMPLETIONS: {
            modelKey: "COMPLETIONS",
            name: "Nova",
            urn: "amazon.nova-pro-v1:0",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 5000,
            maxTotalTokens: 300000,
          },
        };

        const provider = new BedrockNovaLLM(createNovaProviderInit(modelsMetadata));

        // Access the protected method via casting for testing
        const buildBody = (provider as any).buildCompletionRequestBody.bind(provider);

        const body = buildBody("COMPLETIONS", "test prompt");

        expect(body).toBeDefined();
        expect(body.inferenceConfig.max_new_tokens).toBe(5000);
        expect(body.messages).toBeDefined();
      });
    });
  });
});
