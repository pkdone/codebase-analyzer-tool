import BaseBedrockLLM from "../../../../../src/llm/providers/bedrock/common/base-bedrock-llm";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMPurpose,
} from "../../../../../src/llm/types/llm.types";
import { LLMProviderSpecificConfig } from "../../../../../src/llm/providers/llm-provider.types";
import { z } from "zod";

/**
 * Test implementation of BaseBedrockLLM to verify JSON stringification
 * is centralized in the base class.
 */
class TestBedrockLLM extends BaseBedrockLLM {
  lastBuiltBody: Record<string, unknown> | null = null;

  getModelFamily(): string {
    return "TEST_BEDROCK";
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
      temperature: 0.0,
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
    temperature: 0.0,
    topP: 0.95,
  };

  it("should return an object from buildCompletionRequestBody, not a string", () => {
    const llm = new TestBedrockLLM(mockModelsKeys, mockModelsMetadata, [], {
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
    const llm = new TestBedrockLLM(mockModelsKeys, mockModelsMetadata, [], {
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
      temperature: 0.0,
    });
  });

  it("should verify base class handles JSON stringification internally", () => {
    const llm = new TestBedrockLLM(mockModelsKeys, mockModelsMetadata, [], {
      providerSpecificConfig: mockConfig,
    });

    // Access the private method through bracket notation for testing
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const fullParams = llm["buildFullLLMParameters"](
      LLMPurpose.COMPLETIONS,
      "COMPLETION",
      "test prompt",
    );

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
    const llm = new TestBedrockLLM(mockModelsKeys, mockModelsMetadata, [], {
      providerSpecificConfig: mockConfig,
    });

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const fullParams = llm["buildFullLLMParameters"](
      LLMPurpose.EMBEDDINGS,
      "EMBEDDINGS",
      "embed this text",
    );

    // Verify that the body is a string (stringified by base class)
    expect(typeof fullParams.body).toBe("string");

    // Verify it's valid JSON with expected structure
    const parsedBody = JSON.parse(fullParams.body);
    expect(parsedBody).toHaveProperty("inputText");
    expect(parsedBody.inputText).toBe("embed this text");
  });
});
