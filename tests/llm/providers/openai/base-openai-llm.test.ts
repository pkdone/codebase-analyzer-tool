import BaseOpenAILLM from "../../../../src/llm/providers/openai/common/base-openai-llm";
import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
  LLMErrorMsgRegExPattern,
  LLMOutputFormat,
} from "../../../../src/llm/types/llm.types";
import { LLMProviderSpecificConfig } from "../../../../src/llm/providers/llm-provider.types";
import { createMockJsonProcessor } from "../../../helpers/llm/json-processor-mock";
import { OpenAI } from "openai";

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
    const modelsKeys: LLMModelKeysSet = {
      embeddingsModelKey: "EMBED",
      primaryCompletionModelKey: "COMPLETE",
    };
    const errorPatterns: LLMErrorMsgRegExPattern[] = [];
    const providerConfig: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 1000,
      maxRetryAttempts: 1,
      minRetryDelayMillis: 10,
      maxRetryDelayMillis: 100,
    };
    const metadata: Record<string, ResolvedLLMModelMetadata> = {
      EMBED: {
        modelKey: "EMBED",
        urn: "embed-model",
        purpose: LLMPurpose.EMBEDDINGS,
        maxCompletionTokens: 0,
        maxTotalTokens: 8191,
        dimensions: 1536,
      },
      COMPLETE: {
        modelKey: "COMPLETE",
        urn: "complete-model",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 32,
        maxTotalTokens: 4096,
      },
    };
    super(modelsKeys, metadata, errorPatterns, providerConfig, createMockJsonProcessor());
  }
  getModelFamily(): string {
    return "openai-test";
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
    const result = await (llm as any).invokeProvider(LLMPurpose.EMBEDDINGS, "EMBED", "vector this");
    expect(result.responseContent).toEqual([0.1, 0.2, 0.3]);
  });

  test("completion path uses chat completions client and returns content", async () => {
    const result = await (llm as any).invokeProvider(LLMPurpose.COMPLETIONS, "COMPLETE", "Say hi");
    expect(result.responseContent).toBe("hello");
    expect(result.isIncompleteResponse).toBe(false);
    expect(result.tokenUsage.promptTokens).toBe(7);
  });

  test("JSON output option sets response_format", async () => {
    const fakeClient = (llm as any).getClient(); // Access fake client bypassing protected for test
    const spy = jest.spyOn(fakeClient.chat.completions, "create");
    await (llm as any).invokeProvider(LLMPurpose.COMPLETIONS, "COMPLETE", "Return JSON", {
      outputFormat: LLMOutputFormat.JSON,
    });
    const callArg = spy.mock.calls[0][0] as { response_format?: { type: string } };
    expect(callArg.response_format).toEqual({ type: expect.any(String) });
  });
});
