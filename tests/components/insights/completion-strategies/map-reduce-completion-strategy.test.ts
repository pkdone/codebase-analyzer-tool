import "reflect-metadata";
import { MapReduceCompletionStrategy } from "../../../../src/components/insights/completion-strategies/map-reduce-completion-strategy";
import { executeInsightCompletion } from "../../../../src/components/insights/completion-strategies/completion-executor";
import LLMRouter from "../../../../src/llm/llm-router";
import { AppSummaryCategoryEnum } from "../../../../src/components/insights/insights.types";
import { appSummaryPromptMetadata } from "../../../../src/prompts/definitions/app-summaries";
import { z } from "zod";

// Mock the executeInsightCompletion function
jest.mock("../../../../src/components/insights/completion-strategies/completion-executor");

describe("MapReduceCompletionStrategy", () => {
  let strategy: MapReduceCompletionStrategy;
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    mockLLMRouter = {
      getLLMManifest: jest.fn().mockReturnValue({
        models: {
          primaryCompletion: {
            maxTotalTokens: 100000,
          },
        },
      }),
      executeCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;
    strategy = new MapReduceCompletionStrategy(mockLLMRouter);
    jest.clearAllMocks();
    (executeInsightCompletion as jest.Mock).mockClear();
  });

  describe("generateInsights - type preservation", () => {
    it("should preserve type through MAP and REDUCE steps", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const _config = appSummaryPromptMetadata[category];
      const sourceFileSummaries = [
        "* file1.ts: purpose implementation",
        "* file2.ts: purpose implementation",
      ];

      // Mock MAP step responses
      const partialResponse1 = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };
      const partialResponse2 = {
        entities: [{ name: "Entity2", description: "Description 2" }],
      };

      // Mock REDUCE step response
      const finalResponse = {
        entities: [
          { name: "Entity1", description: "Description 1" },
          { name: "Entity2", description: "Description 2" },
        ],
      };

      // Mock executeInsightCompletion for MAP steps
      (executeInsightCompletion as jest.Mock)
        .mockResolvedValueOnce(partialResponse1)
        .mockResolvedValueOnce(partialResponse2);

      // Mock executeCompletion for REDUCE step
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(finalResponse);

      const result = await strategy.generateInsights<typeof _config.responseSchema>(
        category,
        sourceFileSummaries,
      );

      expect(result).toEqual(finalResponse);
      if (result) {
        // Verify type is preserved through the entire chain
        const typedResult: z.infer<typeof _config.responseSchema> = result;
        expect(typedResult.entities).toBeDefined();
        expect(Array.isArray(typedResult.entities)).toBe(true);
        expect(typedResult.entities.length).toBe(2);
        expect(typeof typedResult.entities[0].name).toBe("string");
      }
    });

    it("should preserve type in MAP step (generatePartialInsightsForCategory)", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const _config = appSummaryPromptMetadata[category];
      const summaryChunk = ["* file1.ts: purpose implementation"];
      const mockResponse = { appDescription: "Partial description" };

      (executeInsightCompletion as jest.Mock).mockReset();
      (executeInsightCompletion as jest.Mock).mockResolvedValue(mockResponse);

      // Access the private method through type casting for testing
      const strategyPrivate = strategy as unknown as {
        generatePartialInsightsForCategory<S extends z.ZodType>(
          category: AppSummaryCategoryEnum,
          summaryChunk: string[],
        ): Promise<z.infer<S> | null>;
      };

      const result = await strategyPrivate.generatePartialInsightsForCategory<
        typeof _config.responseSchema
      >(category, summaryChunk);

      expect(result).toEqual(mockResponse);
      if (result) {
        const typedResult: z.infer<typeof _config.responseSchema> = result;
        expect(typedResult.appDescription).toBe("Partial description");
      }
    });

    it("should preserve type in REDUCE step (reducePartialInsights)", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const _config = appSummaryPromptMetadata[category];
      const partialResults = [
        { entities: [{ name: "Entity1", description: "Description 1" }] },
        { entities: [{ name: "Entity2", description: "Description 2" }] },
      ] as z.infer<typeof _config.responseSchema>[];

      const finalResponse = {
        entities: [
          { name: "Entity1", description: "Description 1" },
          { name: "Entity2", description: "Description 2" },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(finalResponse);

      // Access the private method through type casting for testing
      const strategyPrivate = strategy as unknown as {
        reducePartialInsights<S extends z.ZodType>(
          category: AppSummaryCategoryEnum,
          partialResults: z.infer<S>[],
        ): Promise<z.infer<S> | null>;
      };

      const result = await strategyPrivate.reducePartialInsights<typeof _config.responseSchema>(
        category,
        partialResults,
      );

      expect(result).toEqual(finalResponse);
      if (result) {
        const typedResult: z.infer<typeof _config.responseSchema> = result;
        expect(typedResult.entities).toBeDefined();
        expect(Array.isArray(typedResult.entities)).toBe(true);
      }
    });

    it("should return null when all MAP steps return null", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const sourceFileSummaries = ["* file1.ts: purpose implementation"];

      (executeInsightCompletion as jest.Mock).mockResolvedValue(null);

      const result = await strategy.generateInsights(category, sourceFileSummaries);

      expect(result).toBeNull();
    });

    it("should return null when REDUCE step returns null", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const sourceFileSummaries = [
        "* file1.ts: purpose implementation",
        "* file2.ts: purpose implementation",
      ];

      const partialResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      (executeInsightCompletion as jest.Mock).mockResolvedValue(partialResponse);
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(null);

      const result = await strategy.generateInsights(category, sourceFileSummaries);

      expect(result).toBeNull();
    });

    it("should pass generic type through both MAP and REDUCE steps", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const _config = appSummaryPromptMetadata[category];
      const sourceFileSummaries = [
        "* file1.ts: purpose implementation",
        "* file2.ts: purpose implementation",
      ];

      const partialResponse = {
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };
      const finalResponse = {
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };

      (executeInsightCompletion as jest.Mock).mockResolvedValue(partialResponse);
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(finalResponse);

      const result = await strategy.generateInsights<typeof _config.responseSchema>(
        category,
        sourceFileSummaries,
      );

      expect(result).toEqual(finalResponse);
      // Verify type is preserved
      if (result) {
        const typedResult: z.infer<typeof _config.responseSchema> = result;
        expect(typedResult.technologies).toBeDefined();
        expect(Array.isArray(typedResult.technologies)).toBe(true);
      }
    });
  });
});
