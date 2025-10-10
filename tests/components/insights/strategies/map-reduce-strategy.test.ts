import "reflect-metadata";
import { MapReduceInsightStrategy } from "../../../../src/components/insights/strategies/map-reduce-strategy";
import LLMRouter from "../../../../src/llm/core/llm-router";
import { LLMProviderManager } from "../../../../src/llm/core/llm-provider-manager";
import { LLMOutputFormat } from "../../../../src/llm/types/llm.types";
import { llmProviderConfig } from "../../../../src/llm/llm.config";

// Mock logging utilities
jest.mock("../../../../src/common/utils/logging", () => ({
  logWarningMsg: jest.fn(),
}));

describe("MapReduceInsightStrategy", () => {
  let strategy: MapReduceInsightStrategy;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockLLMProviderManager: jest.Mocked<LLMProviderManager>;
  let mockConsoleLog: jest.SpyInstance;

  const mockManifest = {
    modelFamily: "TestFamily",
    providerName: "TestProvider",
    models: {
      embeddings: { modelKey: "embed-1", maxTotalTokens: 8192 },
      primaryCompletion: { modelKey: "gpt-4", maxTotalTokens: 128000 },
      secondaryCompletion: { modelKey: "gpt-3.5", maxTotalTokens: 16000 },
    },
    envSchema: {},
    factory: jest.fn(),
    providerSpecificConfig: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    mockLLMRouter = {
      executeCompletion: jest.fn(),
      getModelsUsedDescription: jest.fn().mockReturnValue("TestLLM"),
    } as unknown as jest.Mocked<LLMRouter>;

    mockLLMProviderManager = {
      getLLMManifest: jest.fn().mockReturnValue(mockManifest),
    } as unknown as jest.Mocked<LLMProviderManager>;

    strategy = new MapReduceInsightStrategy(mockLLMRouter, mockLLMProviderManager);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("generateInsights", () => {
    it("should use map-reduce for large codebases", async () => {
      // Create summaries that exceed token limit to trigger map-reduce
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));

      const summaries = [largeSummary, largeSummary, largeSummary];

      // Mock MAP phase responses (partial results from each chunk)
      const partialResult1 = {
        entities: [{ name: "User", description: "User entity", location: "user.ts" }],
      };
      const partialResult2 = {
        entities: [{ name: "Product", description: "Product entity", location: "product.ts" }],
      };
      const partialResult3 = {
        entities: [{ name: "Order", description: "Order entity", location: "order.ts" }],
      };

      // Mock REDUCE phase response (consolidated result)
      const finalResult = {
        entities: [
          { name: "User", description: "User entity", location: "user.ts" },
          { name: "Product", description: "Product entity", location: "product.ts" },
          { name: "Order", description: "Order entity", location: "order.ts" },
        ],
      };

      // Setup mock to return different values for MAP and REDUCE phases
      mockLLMRouter.executeCompletion
        .mockResolvedValueOnce(partialResult1)
        .mockResolvedValueOnce(partialResult2)
        .mockResolvedValueOnce(partialResult3)
        .mockResolvedValueOnce(finalResult);

      const result = await strategy.generateInsights("entities", summaries);

      expect(result).toEqual(finalResult);
      // Should call LLM 4 times: 3 MAP + 1 REDUCE
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(4);

      // Verify MAP phase calls
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "entities-chunk",
        expect.any(String),
        expect.objectContaining({ outputFormat: LLMOutputFormat.JSON }),
      );

      // Verify REDUCE phase call
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "entities-reduce",
        expect.any(String),
        expect.objectContaining({ outputFormat: LLMOutputFormat.JSON }),
      );

      // Verify console logs
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Using map-reduce strategy"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Split summaries into"));
    });

    it("should handle MAP phase failures gracefully", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // First MAP call succeeds, second fails
      const partialResult = {
        entities: [{ name: "User", description: "User entity", location: "user.ts" }],
      };

      mockLLMRouter.executeCompletion
        .mockResolvedValueOnce(partialResult)
        .mockRejectedValueOnce(new Error("MAP phase error"))
        .mockResolvedValueOnce(partialResult); // REDUCE phase

      const result = await strategy.generateInsights("entities", summaries);

      // Should still consolidate the successful partial result
      expect(result).toEqual(partialResult);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(3); // 2 MAP + 1 REDUCE
    });

    it("should return null when all MAP phases fail", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("All MAP phases failed"));

      const result = await strategy.generateInsights("entities", summaries);

      expect(result).toBeNull();
    });

    it("should return null when REDUCE phase fails", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      const partialResult = {
        entities: [{ name: "User", description: "User entity", location: "user.ts" }],
      };

      // MAP phases succeed, REDUCE fails
      mockLLMRouter.executeCompletion
        .mockResolvedValueOnce(partialResult)
        .mockResolvedValueOnce(partialResult)
        .mockRejectedValueOnce(new Error("REDUCE phase error"));

      const result = await strategy.generateInsights("entities", summaries);

      expect(result).toBeNull();
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(3); // 2 MAP + 1 REDUCE
    });

    it("should handle summaries that are individually too large", async () => {
      // Create a summary that exceeds the chunk limit
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const oversizedSummary = "x".repeat(Math.floor(charsPerChunk * 1.5));

      const mockResponse = {
        entities: [{ name: "User", description: "User entity", location: "user.ts" }],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights("entities", [oversizedSummary]);

      // Should truncate and still process
      expect(result).toBeDefined();
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalled();
    });

    it("should work with different category types", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      const partialResult = {
        boundedContexts: [{ name: "UserContext", description: "User context" }],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(partialResult);

      const result = await strategy.generateInsights("boundedContexts", summaries);

      expect(result).toBeDefined();
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "boundedContexts-chunk",
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
