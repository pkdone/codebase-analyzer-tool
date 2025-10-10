import "reflect-metadata";
import { SinglePassInsightStrategy } from "../../../../src/components/insights/strategies/single-pass-strategy";
import LLMRouter from "../../../../src/llm/core/llm-router";
import { LLMOutputFormat } from "../../../../src/llm/types/llm.types";

// Mock logging utilities
jest.mock("../../../../src/common/utils/logging", () => ({
  logWarningMsg: jest.fn(),
}));

describe("SinglePassInsightStrategy", () => {
  let strategy: SinglePassInsightStrategy;
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLLMRouter = {
      executeCompletion: jest.fn(),
      getModelsUsedDescription: jest.fn().mockReturnValue("TestLLM"),
    } as unknown as jest.Mocked<LLMRouter>;

    strategy = new SinglePassInsightStrategy(mockLLMRouter);
  });

  describe("generateInsights", () => {
    it("should successfully generate insights for a category", async () => {
      const mockResponse = {
        entities: [
          { name: "User", description: "User entity", location: "models/user.ts" },
          { name: "Product", description: "Product entity", location: "models/product.ts" },
        ],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockResponse);

      const summaries = [
        "* models/user.ts: User entity model",
        "* models/product.ts: Product entity model",
      ];

      const result = await strategy.generateInsights("entities", summaries);

      expect(result).toEqual(mockResponse);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "entities",
        expect.stringContaining("models/user.ts"),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
        }),
      );
    });

    it("should handle empty summaries", async () => {
      const mockResponse = { entities: [] };
      mockLLMRouter.executeCompletion.mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights("entities", []);

      expect(result).toEqual(mockResponse);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
    });

    it("should return null when LLM execution fails", async () => {
      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("LLM error"));

      const summaries = ["* models/user.ts: User entity model"];
      const result = await strategy.generateInsights("entities", summaries);

      expect(result).toBeNull();
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
    });

    it("should work with different category types", async () => {
      const mockResponse = {
        boundedContexts: [{ name: "UserContext", description: "User management context" }],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockResponse);

      const summaries = ["* contexts/user.ts: User context"];
      const result = await strategy.generateInsights("boundedContexts", summaries);

      expect(result).toEqual(mockResponse);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "boundedContexts",
        expect.any(String),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
        }),
      );
    });

    it("should pass correct schema to LLM router", async () => {
      mockLLMRouter.executeCompletion.mockResolvedValue({ entities: [] });

      const summaries = ["* test.ts: Test file"];
      await strategy.generateInsights("entities", summaries);

      const callArgs = mockLLMRouter.executeCompletion.mock.calls[0];
      expect(callArgs[2]).toHaveProperty("jsonSchema");
      expect(callArgs[2].jsonSchema).toBeDefined();
    });
  });
});
