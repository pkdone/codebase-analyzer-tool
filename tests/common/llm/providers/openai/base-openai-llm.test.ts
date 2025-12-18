import BaseOpenAILLM from "../../../../../src/common/llm/providers/openai/common/base-openai-llm";
import { LLMPurpose, LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import {
  LLMProviderSpecificConfig,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../../src/common/llm/providers/llm-provider.types";
import { OpenAI } from "openai";
import { createMockErrorLogger } from "../../../helpers/llm/mock-error-logger";
import { z } from "zod";

// Minimal fake client with only used methods
class FakeEmbeddingsClient {
  create = jest.fn().mockResolvedValue({
    data: [{ embedding: [0.1, 0.2, 0.3] }],
    usage: { prompt_tokens: 5 },
  });
}
class FakeChatCompletionsClient {
  create = jest.fn().mockResolvedValue({
    choices: [{ message: { content: "hello" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 7, completion_tokens: 3 },
  });
}
class FakeOpenAI extends OpenAI {
  override embeddings = new FakeEmbeddingsClient() as any;
  override chat = { completions: new FakeChatCompletionsClient() } as any;
  constructor() {
    super({ apiKey: "sk-test" });
  }
}

class TestOpenAILLM extends BaseOpenAILLM {
  private readonly clientInstance = new FakeOpenAI();
  constructor() {
    const providerConfig: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 1000,
      maxRetryAttempts: 1,
      minRetryDelayMillis: 10,
      maxRetryDelayMillis: 100,
    };
    const manifest: LLMProviderManifest = {
      providerName: "Test OpenAI",
      modelFamily: "openai-test",
      envSchema: z.object({}),
      models: {
        embeddings: {
          modelKey: "EMBED",
          urnEnvKey: "EMBED_URN",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 8191,
          dimensions: 1536,
        },
        primaryCompletion: {
          modelKey: "COMPLETE",
          urnEnvKey: "COMPLETE_URN",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 32,
          maxTotalTokens: 4096,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: providerConfig,
      implementation: TestOpenAILLM as any,
    };
    const init: ProviderInit = {
      manifest,
      providerParams: {},
      resolvedModels: {
        embeddings: "embed-model",
        primaryCompletion: "complete-model",
      },
      errorLogger: createMockErrorLogger(),
    };
    super(init);
  }
  protected override getClient(): OpenAI {
    return this.clientInstance;
  }
  protected getModelIdentifier(modelKey: string): string {
    return this.llmModelsMetadata[modelKey].urn;
  }
  protected override isLLMOverloaded(): boolean {
    return false;
  }
  protected override isTokenLimitExceeded(): boolean {
    return false;
  }
}

describe("BaseOpenAILLM refactored invokeProvider", () => {
  let llm: TestOpenAILLM;
  beforeEach(() => {
    llm = new TestOpenAILLM();
  });

  test("embeddings path uses embeddings client and returns embedding", async () => {
    const result = await (llm as any).invokeEmbeddingProvider("EMBED", "vector this");
    expect(result.responseContent).toEqual([0.1, 0.2, 0.3]);
  });

  test("completion path uses chat completions client and returns content", async () => {
    const result = await (llm as any).invokeCompletionProvider("COMPLETE", "Say hi");
    expect(result.responseContent).toBe("hello");
    expect(result.isIncompleteResponse).toBe(false);
    expect(result.tokenUsage.promptTokens).toBe(7);
  });

  test("JSON output option sets response_format", async () => {
    const fakeClient = (llm as any).getClient(); // Access fake client bypassing protected for test
    const spy = jest.spyOn(fakeClient.chat.completions, "create");
    await (llm as any).invokeCompletionProvider("COMPLETE", "Return JSON", {
      outputFormat: LLMOutputFormat.JSON,
    });
    const callArg = spy.mock.calls[0][0] as { response_format?: { type: string } };
    expect(callArg.response_format).toEqual({ type: expect.any(String) });
  });

  test("empty string response should be treated as valid (not incomplete)", async () => {
    const fakeClient = (llm as any).getClient();
    fakeClient.chat.completions.create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 5, completion_tokens: 0 },
    });

    const result = await (llm as any).invokeCompletionProvider("COMPLETE", "test");
    expect(result.responseContent).toBe("");
    expect(result.isIncompleteResponse).toBe(false); // Empty string is valid, not incomplete
  });

  test("null response content should be treated as incomplete", async () => {
    const fakeClient = (llm as any).getClient();
    fakeClient.chat.completions.create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: null }, finish_reason: "stop" }],
      usage: { prompt_tokens: 5, completion_tokens: 0 },
    });

    const result = await (llm as any).invokeCompletionProvider("COMPLETE", "test");
    expect(result.responseContent).toBeNull();
    expect(result.isIncompleteResponse).toBe(true); // null is incomplete
  });

  test("undefined response content should be treated as incomplete", async () => {
    const fakeClient = (llm as any).getClient();
    fakeClient.chat.completions.create = jest.fn().mockResolvedValue({
      choices: [{ message: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 5, completion_tokens: 0 },
    });

    const result = await (llm as any).invokeCompletionProvider("COMPLETE", "test");
    expect(result.responseContent).toBeUndefined();
    expect(result.isIncompleteResponse).toBe(true); // undefined is incomplete
  });
});
