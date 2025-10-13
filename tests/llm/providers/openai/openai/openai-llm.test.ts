import { OpenAI } from "openai";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMPurpose,
  LLMOutputFormat,
} from "../../../../../src/llm/types/llm.types";
import OpenAILLM from "../../../../../src/llm/providers/openai/openai/openai-llm";
import { OPENAI } from "../../../../../src/llm/providers/openai/openai/openai.manifest";
import { createMockJsonProcessor } from "../../../../helpers/llm/json-processor-mock";

// Helper functions to create properly typed mock responses
// These provide type safety during mock creation while avoiding OpenAI SDK type complexity
function createMockEmbeddingResponse(data: {
  data: { embedding: number[] | null; index?: number }[];
  usage?: { prompt_tokens?: number; total_tokens?: number };
  model?: string;
  object?: string;
}) {
  return {
    data: data.data.map((d) => ({
      embedding: d.embedding,
      index: d.index ?? 0,
      object: "embedding" as const,
    })),
    usage: data.usage,
    model: data.model ?? "text-embedding-ada-002",
    object: data.object ?? "list",
  } as any; // Safe cast after structuring the data properly
}

function createMockCompletionResponse(data: {
  choices: {
    message: { content: string | null; role?: string };
    finish_reason: string;
    index?: number;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  object?: string;
  id?: string;
  created?: number;
  model?: string;
}) {
  return {
    choices: data.choices.map((c) => ({
      message: { content: c.message.content, role: c.message.role ?? "assistant" },
      finish_reason: c.finish_reason,
      index: c.index ?? 0,
      logprobs: null, // Required by OpenAI SDK
    })),
    usage: data.usage,
    object: data.object ?? "chat.completion",
    id: data.id ?? "chatcmpl-test",
    created: data.created ?? Date.now(),
    model: data.model ?? "gpt-4",
    system_fingerprint: null, // Required by OpenAI SDK
  } as any; // Safe cast after structuring the data properly
}

// Mock the OpenAI client
jest.mock("openai");

describe("OpenAI LLM Provider", () => {
  const mockModelsKeys: LLMModelKeysSet = {
    embeddingsModelKey: "GPT_EMBEDDINGS_ADA002",
    primaryCompletionModelKey: "GPT_COMPLETIONS_GPT4",
    secondaryCompletionModelKey: "GPT_COMPLETIONS_GPT3_5",
  };

  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    GPT_EMBEDDINGS_ADA002: {
      modelKey: "GPT_EMBEDDINGS_ADA002",
      urn: "text-embedding-ada-002",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    GPT_COMPLETIONS_GPT4: {
      modelKey: "GPT_COMPLETIONS_GPT4",
      urn: "gpt-4",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 8192,
    },
    GPT_COMPLETIONS_GPT3_5: {
      modelKey: "GPT_COMPLETIONS_GPT3_5",
      urn: "gpt-3.5-turbo",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 2048,
      maxTotalTokens: 4096,
    },
  };

  const mockErrorPatterns: LLMErrorMsgRegExPattern[] = [];
  const mockApiKey = "test-api-key";

  let openAILLM: OpenAILLM;
  let mockOpenAIClient: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock OpenAI client
    mockOpenAIClient = {
      embeddings: {
        create: jest.fn(),
      },
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<OpenAI>;

    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIClient);

    const config = {
      apiKey: mockApiKey,
      providerSpecificConfig: {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
    };
    openAILLM = new OpenAILLM(
      mockModelsKeys,
      mockModelsMetadata,
      mockErrorPatterns,
      config,
      createMockJsonProcessor(),
    );
  });

  describe("Basic Provider Info", () => {
    test("should return correct model family", () => {
      expect(openAILLM.getModelFamily()).toBe(OPENAI);
    });

    test("should return correct model identifier from metadata URN", () => {
      const modelIdentifier = (openAILLM as any).getModelIdentifier("GPT_COMPLETIONS_GPT4");
      expect(modelIdentifier).toBe("gpt-4");
    });
  });

  describe("Parameter Building", () => {
    test("should build correct embedding parameters", () => {
      const params = (openAILLM as any).buildFullLLMParameters(
        LLMPurpose.EMBEDDINGS,
        "GPT_EMBEDDINGS_ADA002",
        "test prompt",
      );

      expect(params).toEqual({
        model: "text-embedding-ada-002",
        input: "test prompt",
      });
    });

    test("should build correct completion parameters without JSON format", () => {
      const params = (openAILLM as any).buildFullLLMParameters(
        LLMPurpose.COMPLETIONS,
        "GPT_COMPLETIONS_GPT4",
        "test prompt",
      );

      expect(params).toEqual({
        model: "gpt-4",
        temperature: 0, // default zero temperature
        messages: [{ role: "user", content: "test prompt" }],
        max_tokens: 4096,
      });
    });

    test("should build correct completion parameters with JSON format", () => {
      const params = (openAILLM as any).buildFullLLMParameters(
        LLMPurpose.COMPLETIONS,
        "GPT_COMPLETIONS_GPT4",
        "test prompt",
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(params).toEqual({
        model: "gpt-4",
        temperature: 0,
        messages: [{ role: "user", content: "test prompt" }],
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });
    });
  });

  describe("Response Parsing - Embeddings", () => {
    test("should correctly parse successful embedding response", async () => {
      const mockEmbeddingResponse = createMockEmbeddingResponse({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { prompt_tokens: 10 },
      });

      mockOpenAIClient.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const result = await (openAILLM as any).invokeEmbeddingsLLM({
        model: "text-embedding-ada-002",
        input: "test",
      });

      expect(result).toEqual({
        isIncompleteResponse: false,
        responseContent: [0.1, 0.2, 0.3],
        tokenUsage: {
          promptTokens: 10,
          completionTokens: -1,
          maxTotalTokens: -1,
        },
      });
    });

    test("should handle empty embedding response", async () => {
      const mockEmbeddingResponse = createMockEmbeddingResponse({
        data: [{ embedding: null }],
        usage: { prompt_tokens: 10 },
      });

      mockOpenAIClient.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const result = await (openAILLM as any).invokeEmbeddingsLLM({
        model: "text-embedding-ada-002",
        input: "test",
      });

      expect(result.isIncompleteResponse).toBe(true);
      expect(result.responseContent).toBeNull();
    });
  });

  describe("Response Parsing - Completions", () => {
    test("should correctly parse successful completion response", async () => {
      const mockCompletionResponse = createMockCompletionResponse({
        choices: [
          {
            message: { content: "Test response content" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
        },
        id: "chatcmpl-test123",
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockCompletionResponse);

      const result = await (openAILLM as any).invokeCompletionLLM({
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
      });

      expect(result).toEqual({
        isIncompleteResponse: false,
        responseContent: "Test response content",
        tokenUsage: {
          promptTokens: 15,
          completionTokens: 25,
          maxTotalTokens: -1,
        },
      });
    });

    test("should handle incomplete response due to length limit", async () => {
      const mockCompletionResponse = createMockCompletionResponse({
        choices: [
          {
            message: { content: "Partial response..." },
            finish_reason: "length",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
        },
        id: "chatcmpl-test456",
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockCompletionResponse);

      const result = await (openAILLM as any).invokeCompletionLLM({
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
      });

      expect(result.isIncompleteResponse).toBe(true);
      expect(result.responseContent).toBe("Partial response...");
    });

    test("should handle response with no content", async () => {
      const mockCompletionResponse = createMockCompletionResponse({
        choices: [
          {
            message: { content: null },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 0,
        },
        id: "chatcmpl-test789",
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockCompletionResponse);

      const result = await (openAILLM as any).invokeCompletionLLM({
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
      });

      expect(result.isIncompleteResponse).toBe(true);
      expect(result.responseContent).toBeNull();
    });

    test("should handle response with missing usage data", async () => {
      const mockCompletionResponse = createMockCompletionResponse({
        choices: [
          {
            message: { content: "Test response" },
            finish_reason: "stop",
          },
        ],
        usage: undefined,
        id: "chatcmpl-test000",
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockCompletionResponse);

      const result = await (openAILLM as any).invokeCompletionLLM({
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
      });

      expect(result.tokenUsage).toEqual({
        promptTokens: -1,
        completionTokens: -1,
        maxTotalTokens: -1,
      });
    });
  });

  describe("Constructor and Client Setup", () => {
    test("should create OpenAI client with correct API key", () => {
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: mockApiKey });
    });

    test("should expose client through getClient method", () => {
      const client = (openAILLM as any).getClient();
      expect(client).toBe(mockOpenAIClient);
    });
  });
});
