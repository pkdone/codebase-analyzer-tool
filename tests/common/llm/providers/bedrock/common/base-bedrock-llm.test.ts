import BaseBedrockLLM from "../../../../../../src/common/llm/providers/bedrock/common/base-bedrock-llm";
import {
  ResolvedLLMModelMetadata,
  LLMPurpose,
  type LLMCompletionOptions,
} from "../../../../../../src/common/llm/types/llm.types";
import {
  LLMProviderSpecificConfig,
  ProviderInit,
  LLMProviderManifest,
  LLMImplSpecificResponseSummary,
} from "../../../../../../src/common/llm/providers/llm-provider.types";
import type { JsonObject } from "../../../../../../src/common/llm/types/json-value.types";
import { z } from "zod";
import { ValidationException } from "@aws-sdk/client-bedrock-runtime";
import { createMockErrorLogger } from "../../../../helpers/llm/mock-error-logger";

// Helper to create test provider init
function createTestProviderInit(
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  config: LLMProviderSpecificConfig,
): ProviderInit {
  const embeddingsKey = Object.keys(modelsMetadata).find(
    (k) => modelsMetadata[k].purpose === LLMPurpose.EMBEDDINGS,
  )!;
  const completionKey = Object.keys(modelsMetadata).find(
    (k) => modelsMetadata[k].purpose === LLMPurpose.COMPLETIONS,
  )!;

  const manifest: LLMProviderManifest = {
    providerName: "Test Bedrock Provider",
    modelFamily: "TEST_BEDROCK",
    envSchema: z.object({}),
    models: {
      embeddings: {
        modelKey: embeddingsKey,
        name: modelsMetadata[embeddingsKey].name,
        urnEnvKey: "TEST_EMBED",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: modelsMetadata[embeddingsKey].maxTotalTokens,
        dimensions: modelsMetadata[embeddingsKey].dimensions,
      },
      primaryCompletion: {
        modelKey: completionKey,
        name: modelsMetadata[completionKey].name,
        urnEnvKey: "TEST_COMPLETE",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: modelsMetadata[completionKey].maxCompletionTokens,
        maxTotalTokens: modelsMetadata[completionKey].maxTotalTokens,
      },
    },
    errorPatterns: [],
    providerSpecificConfig: config,
    implementation: TestBedrockLLM as any,
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
}

/**
 * Test implementation of BaseBedrockLLM to verify JSON stringification
 * is centralized in the base class.
 */
class TestBedrockLLM extends BaseBedrockLLM {
  lastBuiltBody: JsonObject | null = null;

  protected override buildCompletionRequestBody(modelKey: string, prompt: string): JsonObject {
    const body: JsonObject = {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      modelKey,
      temperature: 0,
    };
    this.lastBuiltBody = body;
    return body;
  }

  protected override async invokeEmbeddingProvider(
    _modelKey: string,
    _prompt: string,
  ): Promise<{
    isIncompleteResponse: boolean;
    responseContent: number[];
    tokenUsage: { promptTokens: number; completionTokens: number; maxTotalTokens: number };
  }> {
    return {
      isIncompleteResponse: false,
      responseContent: [0.1, 0.2, 0.3],
      tokenUsage: { promptTokens: 10, completionTokens: 0, maxTotalTokens: 1000 },
    };
  }

  protected override async invokeCompletionProvider(
    _modelKey: string,
    _prompt: string,
    _options?: LLMCompletionOptions,
  ): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: "test",
      tokenUsage: { promptTokens: 10, completionTokens: 20, maxTotalTokens: 1000 },
    };
  }

  protected getResponseExtractionConfig() {
    return {
      schema: z.object({
        content: z.string(),
      }),
      pathConfig: {
        contentPath: "content",
        promptTokensPath: "usage.input",
        completionTokensPath: "usage.output",
        stopReasonPath: "stop",
        stopReasonValueForLength: "length",
      },
      providerName: "TestBedrock",
    };
  }
}

describe("BaseBedrockLLM - JSON stringification centralization", () => {
  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    EMBEDDINGS: {
      modelKey: "EMBEDDINGS",
      name: "Test Embeddings",
      urn: "test-embeddings-model",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    COMPLETION: {
      modelKey: "COMPLETION",
      name: "Test Completion",
      urn: "test-completion-model",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 100000,
    },
  };

  const mockConfig: LLMProviderSpecificConfig = {
    requestTimeoutMillis: 60000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 10000,
    temperature: 0,
    topP: 0.95,
  };

  it("should return an object from buildCompletionRequestBody, not a string", () => {
    const llm = new TestBedrockLLM(createTestProviderInit(mockModelsMetadata, mockConfig));

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const result = llm["buildCompletionRequestBody"]("COMPLETION", "test prompt");

    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
    expect(typeof result).not.toBe("string");
    expect(result).toHaveProperty("messages");
  });

  it("should build request body with correct structure", () => {
    const llm = new TestBedrockLLM(createTestProviderInit(mockModelsMetadata, mockConfig));

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const result = llm["buildCompletionRequestBody"]("COMPLETION", "hello world");

    expect(result).toEqual({
      messages: [
        {
          role: "user",
          content: "hello world",
        },
      ],
      modelKey: "COMPLETION",
      temperature: 0,
    });
  });

  it("should verify base class handles JSON stringification internally for completions", () => {
    const llm = new TestBedrockLLM(createTestProviderInit(mockModelsMetadata, mockConfig));

    // Access the private method through bracket notation for testing
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const fullParams = llm["buildCompletionParameters"]("COMPLETION", "test prompt");

    // Verify that the body is a string (stringified by base class)
    expect(typeof fullParams.body).toBe("string");

    // Verify it's valid JSON
    const parsedBody = JSON.parse(fullParams.body);
    expect(parsedBody).toHaveProperty("messages");
    expect(parsedBody.messages[0].content).toBe("test prompt");

    // Verify the stored body was an object before stringification
    expect(llm.lastBuiltBody).not.toBeNull();
    expect(typeof llm.lastBuiltBody).toBe("object");
  });

  it("should handle embeddings body as object and stringify it", () => {
    const llm = new TestBedrockLLM(createTestProviderInit(mockModelsMetadata, mockConfig));

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const fullParams = llm["buildEmbeddingParameters"]("EMBEDDINGS", "embed this text");

    // Verify that the body is a string (stringified by base class)
    expect(typeof fullParams.body).toBe("string");

    // Verify it's valid JSON with expected structure
    const parsedBody = JSON.parse(fullParams.body);
    expect(parsedBody).toHaveProperty("inputText");
    expect(parsedBody.inputText).toBe("embed this text");
  });

  describe("isTokenLimitExceeded - modern Set-based matching", () => {
    const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
      EMBEDDINGS: {
        modelKey: "EMBEDDINGS",
        name: "Test Embeddings",
        urn: "test-embeddings-model",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8192,
      },
      COMPLETION: {
        modelKey: "COMPLETION",
        name: "Test Completion",
        urn: "test-completion-model",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 100000,
      },
    };

    const mockConfig: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 10000,
      temperature: 0,
      topP: 0.95,
    };

    it("should detect token limit exceeded errors using Set-based keyword matching", () => {
      const llm = new TestBedrockLLM(createTestProviderInit(mockModelsMetadata, mockConfig));

      const mockError1 = new ValidationException({
        message: "Too many input tokens",
        $metadata: {},
      } as any);

      const mockError2 = new ValidationException({
        message: "Input is too long for the model",
        $metadata: {},
      } as any);

      const mockError3 = new ValidationException({
        message: "Please reduce the length of the prompt",
        $metadata: {},
      } as any);

      const nonTokenError = new ValidationException({
        message: "Invalid parameter",
        $metadata: {},
      } as any);

      const nonValidationError = new Error("Some other error");

      // Access the protected method through bracket notation
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const isTokenLimitExceeded = llm["isTokenLimitExceeded"].bind(llm);

      expect(isTokenLimitExceeded(mockError1)).toBe(true);
      expect(isTokenLimitExceeded(mockError2)).toBe(true);
      expect(isTokenLimitExceeded(mockError3)).toBe(true);
      expect(isTokenLimitExceeded(nonTokenError)).toBe(false);
      expect(isTokenLimitExceeded(nonValidationError)).toBe(false);
    });
  });
});
