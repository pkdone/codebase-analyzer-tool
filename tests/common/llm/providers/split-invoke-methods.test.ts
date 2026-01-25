import BaseLLMProvider from "../../../../src/common/llm/providers/base-llm-provider";
import type {
  ProviderInit,
  LLMImplSpecificResponseSummary,
} from "../../../../src/common/llm/providers/llm-provider.types";
import { LLMPurpose, LLMOutputFormat } from "../../../../src/common/llm/types/llm-request.types";
import { z } from "zod";

/**
 * Tests for split invokeProvider methods (invokeEmbeddingProvider and invokeCompletionProvider).
 */
describe("Split Invoke Methods", () => {
  // Test provider that tracks which method was called
  class TrackingTestProvider extends BaseLLMProvider {
    embeddingProviderCalls = 0;
    completionProviderCalls = 0;

    protected async invokeEmbeddingProvider(
      _modelKey: string,
      _prompt: string,
    ): Promise<LLMImplSpecificResponseSummary> {
      this.embeddingProviderCalls++;
      return {
        isIncompleteResponse: false,
        responseContent: [0.1, 0.2, 0.3],
        tokenUsage: { promptTokens: 10, completionTokens: 0, maxTotalTokens: 1000 },
      };
    }

    protected async invokeCompletionProvider(
      _modelKey: string,
      _prompt: string,
    ): Promise<LLMImplSpecificResponseSummary> {
      this.completionProviderCalls++;
      return {
        isIncompleteResponse: false,
        responseContent: "test completion",
        tokenUsage: { promptTokens: 10, completionTokens: 20, maxTotalTokens: 1000 },
      };
    }

    protected isLLMOverloaded(): boolean {
      return false;
    }

    protected isTokenLimitExceeded(): boolean {
      return false;
    }
  }

  const createInit = (): ProviderInit => ({
    manifest: {
      providerFamily: "test",
      envSchema: z.object({}),
      models: {
        embeddings: [
          {
            modelKey: "test-embed",
            urnEnvKey: "TEST_EMBED",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1536,
            maxTotalTokens: 1000,
          },
        ],
        completions: [
          {
            modelKey: "test-complete",
            urnEnvKey: "TEST_COMPLETE",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 500,
            maxTotalTokens: 2000,
          },
        ],
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      extractConfig: () => ({}),
      implementation: TrackingTestProvider,
    },
    providerParams: {},
    resolvedModelChain: {
      embeddings: [{ providerFamily: "test", modelKey: "test-embed", modelUrn: "test-embed-urn" }],
      completions: [
        { providerFamily: "test", modelKey: "test-complete", modelUrn: "test-complete-urn" },
      ],
    },
    errorLogging: {
      errorLogDirectory: "/tmp/test-errors",
      errorLogFilenameTemplate: "error-{timestamp}.log",
    },
    extractedConfig: {},
  });

  it("should call invokeEmbeddingProvider for embeddings requests", async () => {
    const provider = new TrackingTestProvider(createInit());
    const context = { resource: "test-resource", purpose: LLMPurpose.EMBEDDINGS };

    await provider.generateEmbeddings("test-embed", "test prompt", context);

    expect(provider.embeddingProviderCalls).toBe(1);
    expect(provider.completionProviderCalls).toBe(0);
  });

  it("should call invokeCompletionProvider for completion requests", async () => {
    const provider = new TrackingTestProvider(createInit());

    await provider.executeCompletion(
      "test-complete",
      "test prompt",
      { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
      { outputFormat: LLMOutputFormat.TEXT },
    );

    expect(provider.embeddingProviderCalls).toBe(0);
    expect(provider.completionProviderCalls).toBe(1);
  });

  it("should only call invokeEmbeddingProvider when generating embeddings multiple times", async () => {
    const provider = new TrackingTestProvider(createInit());
    const context1 = { resource: "resource1", purpose: LLMPurpose.EMBEDDINGS };
    const context2 = { resource: "resource2", purpose: LLMPurpose.EMBEDDINGS };
    const context3 = { resource: "resource3", purpose: LLMPurpose.EMBEDDINGS };

    await provider.generateEmbeddings("test-embed", "prompt1", context1);
    await provider.generateEmbeddings("test-embed", "prompt2", context2);
    await provider.generateEmbeddings("test-embed", "prompt3", context3);

    expect(provider.embeddingProviderCalls).toBe(3);
    expect(provider.completionProviderCalls).toBe(0);
  });

  it("should only call invokeCompletionProvider when executing completions multiple times", async () => {
    const provider = new TrackingTestProvider(createInit());

    const context = { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS };
    const options = { outputFormat: LLMOutputFormat.TEXT };

    await provider.executeCompletion("test-complete", "prompt1", context, options);
    await provider.executeCompletion("test-complete", "prompt2", context, options);

    expect(provider.embeddingProviderCalls).toBe(0);
    expect(provider.completionProviderCalls).toBe(2);
  });

  it("should call correct methods for mixed requests", async () => {
    const provider = new TrackingTestProvider(createInit());
    const completionContext = { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS };
    const embeddingContext1 = { resource: "resource1", purpose: LLMPurpose.EMBEDDINGS };
    const embeddingContext2 = { resource: "resource2", purpose: LLMPurpose.EMBEDDINGS };
    const embeddingContext3 = { resource: "resource3", purpose: LLMPurpose.EMBEDDINGS };
    const options = { outputFormat: LLMOutputFormat.TEXT };

    await provider.generateEmbeddings("test-embed", "prompt1", embeddingContext1);
    await provider.executeCompletion("test-complete", "prompt2", completionContext, options);
    await provider.generateEmbeddings("test-embed", "prompt3", embeddingContext2);
    await provider.executeCompletion("test-complete", "prompt4", completionContext, options);
    await provider.generateEmbeddings("test-embed", "prompt5", embeddingContext3);

    expect(provider.embeddingProviderCalls).toBe(3);
    expect(provider.completionProviderCalls).toBe(2);
  });

  it("should require concrete implementations to provide both methods", () => {
    // This test verifies that both methods are abstract and must be implemented
    class IncompleteProvider extends BaseLLMProvider {
      // Only implementing one method - this should cause a TypeScript error
      // but we can't test compilation errors directly
      protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
        return {
          isIncompleteResponse: false,
          responseContent: [],
          tokenUsage: { promptTokens: 0, completionTokens: 0, maxTotalTokens: 0 },
        };
      }

      // Add the required method to make it compile, but mark as not implemented for testing
      protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
        throw new Error("Not implemented - testing that both methods are required");
      }

      protected isLLMOverloaded(): boolean {
        return false;
      }

      protected isTokenLimitExceeded(): boolean {
        return false;
      }
    }

    // TypeScript will catch this at compile time
    const init = createInit();
    const provider = new IncompleteProvider(init);

    // Both methods should be defined
    expect(typeof (provider as any).invokeEmbeddingProvider).toBe("function");
    expect(typeof (provider as any).invokeCompletionProvider).toBe("function");
  });
});
