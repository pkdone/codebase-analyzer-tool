import "reflect-metadata";
import { SinglePassCompletionStrategy } from "../../../../src/components/insights/completion-strategies/single-pass-completion-strategy";
import { executeInsightCompletion } from "../../../../src/components/insights/completion-strategies/completion-executor";
import LLMRouter from "../../../../src/llm/llm-router";
import { AppSummaryCategoryEnum } from "../../../../src/components/insights/insights.types";
import { appSummaryPromptMetadata } from "../../../../src/prompts/definitions/app-summaries";
import { z } from "zod";

// Mock the executeInsightCompletion function
jest.mock("../../../../src/components/insights/completion-strategies/completion-executor");

describe("SinglePassCompletionStrategy", () => {
  let strategy: SinglePassCompletionStrategy;
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    mockLLMRouter = {} as jest.Mocked<LLMRouter>;
    strategy = new SinglePassCompletionStrategy(mockLLMRouter);
    jest.clearAllMocks();
  });

  describe("generateInsights", () => {
    it("should call executeInsightCompletion with correct parameters", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const sourceFileSummaries = ["* file1.ts: purpose implementation"];
      const mockResponse = { appDescription: "Test description" };

      (executeInsightCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights(category, sourceFileSummaries);

      expect(executeInsightCompletion).toHaveBeenCalledWith(
        mockLLMRouter,
        category,
        sourceFileSummaries,
      );
      expect(result).toEqual(mockResponse);
    });

    it("should preserve type when using generic generateInsights", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const _config = appSummaryPromptMetadata[category];
      const sourceFileSummaries = ["* file1.ts: purpose implementation"];
      const mockResponse = { appDescription: "Test description" };

      (executeInsightCompletion as jest.Mock).mockResolvedValue(mockResponse);

      // Call with explicit generic type parameter
      const result = await strategy.generateInsights<typeof _config.responseSchema>(
        category,
        sourceFileSummaries,
      );

      expect(result).toEqual(mockResponse);
      // Verify type is preserved
      if (result) {
        const typedResult: z.infer<typeof _config.responseSchema> = result;
        expect(typedResult.appDescription).toBe("Test description");
        expect(typeof typedResult.appDescription).toBe("string");
      }
    });

    it("should preserve type for entities category", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const _config = appSummaryPromptMetadata[category];
      const sourceFileSummaries = ["* file1.ts: purpose implementation"];
      const mockResponse = {
        entities: [{ name: "User", description: "User entity" }],
      };

      (executeInsightCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights<typeof _config.responseSchema>(
        category,
        sourceFileSummaries,
      );

      expect(result).toEqual(mockResponse);
      if (result) {
        const typedResult: z.infer<typeof _config.responseSchema> = result;
        expect(typedResult.entities).toBeDefined();
        expect(Array.isArray(typedResult.entities)).toBe(true);
        expect(typedResult.entities[0].name).toBe("User");
      }
    });

    it("should return null when executeInsightCompletion returns null", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const sourceFileSummaries = ["* file1.ts: purpose implementation"];

      (executeInsightCompletion as jest.Mock).mockResolvedValue(null);

      const result = await strategy.generateInsights(category, sourceFileSummaries);

      expect(result).toBeNull();
    });

    it("should pass generic type to executeInsightCompletion", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const _config = appSummaryPromptMetadata[category];
      const sourceFileSummaries = ["* file1.ts: purpose implementation"];
      const mockResponse = {
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };

      (executeInsightCompletion as jest.Mock).mockResolvedValue(mockResponse);

      await strategy.generateInsights<typeof _config.responseSchema>(category, sourceFileSummaries);

      // Verify executeInsightCompletion was called (type parameter is passed internally)
      expect(executeInsightCompletion).toHaveBeenCalled();
      const callArgs = (executeInsightCompletion as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toBe(category);
      expect(callArgs[2]).toEqual(sourceFileSummaries);
    });
  });
});
