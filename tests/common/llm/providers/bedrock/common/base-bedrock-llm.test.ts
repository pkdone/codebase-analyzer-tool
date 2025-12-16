import BaseBedrockLLM from "../../../../../../src/common/llm/providers/bedrock/common/base-bedrock-llm";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMPurpose,
  LLMErrorMsgRegExPattern,
} from "../../../../../../src/common/llm/types/llm.types";
import { LLMProviderSpecificConfig } from "../../../../../../src/common/llm/providers/llm-provider.types";
import { z } from "zod";
import { ValidationException } from "@aws-sdk/client-bedrock-runtime";
import { createMockErrorLogger } from "../../../test-helpers/mock-error-logger";

/**
 * Test implementation of BaseBedrockLLM to verify JSON stringification
 * is centralized in the base class.
 */
class TestBedrockLLM extends BaseBedrockLLM {
  lastBuiltBody: Record<string, unknown> | null = null;

  constructor(
    _env: Record<string, unknown>,
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    config: { providerSpecificConfig: LLMProviderSpecificConfig },
  ) {
    super(
      _env as any,
      modelsKeys,
      modelsMetadata,
      errorPatterns,
      config,
      "TEST_BEDROCK",
      createMockErrorLogger(),
    );
  }

  protected buildCompletionRequestBody(modelKey: string, prompt: string): Record<string, unknown> {
    const body = {
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
  const mockModelsKeys: LLMModelKeysSet = {
    embeddingsModelKey: "EMBEDDINGS",
    primaryCompletionModelKey: "COMPLETION",
  };

  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    EMBEDDINGS: {
      modelKey: "EMBEDDINGS",
      urn: "test-embeddings-model",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    COMPLETION: {
      modelKey: "COMPLETION",
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
    const llm = new TestBedrockLLM({}, mockModelsKeys, mockModelsMetadata, [], {
      providerSpecificConfig: mockConfig,
    });

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const result = llm["buildCompletionRequestBody"]("COMPLETION", "test prompt");

    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
    expect(typeof result).not.toBe("string");
    expect(result).toHaveProperty("messages");
  });

  it("should build request body with correct structure", () => {
    const llm = new TestBedrockLLM({}, mockModelsKeys, mockModelsMetadata, [], {
      providerSpecificConfig: mockConfig,
    });

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
    const llm = new TestBedrockLLM({}, mockModelsKeys, mockModelsMetadata, [], {
      providerSpecificConfig: mockConfig,
    });

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
    const llm = new TestBedrockLLM({}, mockModelsKeys, mockModelsMetadata, [], {
      providerSpecificConfig: mockConfig,
    });

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
    const mockModelsKeys: LLMModelKeysSet = {
      embeddingsModelKey: "EMBEDDINGS",
      primaryCompletionModelKey: "COMPLETION",
    };

    const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
      EMBEDDINGS: {
        modelKey: "EMBEDDINGS",
        urn: "test-embeddings-model",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8192,
      },
      COMPLETION: {
        modelKey: "COMPLETION",
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
      const llm = new TestBedrockLLM({} as any, mockModelsKeys, mockModelsMetadata, [], {
        providerSpecificConfig: mockConfig,
      });

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
