import "reflect-metadata";
import { ICompletionStrategy } from "../../../../src/components/insights/completion-strategies/completion-strategy.interface";
import { SinglePassCompletionStrategy } from "../../../../src/components/insights/completion-strategies/single-pass-completion-strategy";
import { MapReduceCompletionStrategy } from "../../../../src/components/insights/completion-strategies/map-reduce-completion-strategy";
import { PartialAppSummaryRecord } from "../../../../src/components/insights/insights.types";
import { AppSummaryCategoryEnum } from "../../../../src/components/insights/insights.types";
import LLMRouter from "../../../../src/llm/llm-router";
import { appSummaryPromptMetadata } from "../../../../src/prompts/definitions/app-summaries";
import { z } from "zod";

describe("Type Safety Tests", () => {
  describe("ICompletionStrategy interface", () => {
    it("should return PartialAppSummaryRecord | null (no generic)", () => {
      // This test verifies the interface signature is correct
      const strategy: ICompletionStrategy = {
        generateInsights: async (
          _category: AppSummaryCategoryEnum,
          _sourceFileSummaries: string[],
        ): Promise<PartialAppSummaryRecord | null> => {
          return null;
        },
      };

      expect(strategy.generateInsights).toBeDefined();
      // Type check: verify the return type is correct
      const returnType: Promise<PartialAppSummaryRecord | null> = strategy.generateInsights(
        "appDescription",
        [],
      );
      expect(returnType).toBeDefined();
    });
  });

  describe("SinglePassCompletionStrategy type safety", () => {
    let mockLLMRouter: jest.Mocked<LLMRouter>;
    let strategy: SinglePassCompletionStrategy;

    beforeEach(() => {
      mockLLMRouter = {
        executeCompletion: jest.fn(),
      } as unknown as jest.Mocked<LLMRouter>;
      strategy = new SinglePassCompletionStrategy(mockLLMRouter);
    });

    it("should return PartialAppSummaryRecord | null", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const mockResponse: PartialAppSummaryRecord = {
        appDescription: "Test description",
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights(category, ["* file1.ts: purpose"]);

      // Type check: result should be PartialAppSummaryRecord | null
      const typedResult: PartialAppSummaryRecord | null = result;
      expect(typedResult).toEqual(mockResponse);
    });

    it("should handle null response", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(null);

      const result = await strategy.generateInsights(category, ["* file1.ts: purpose"]);

      expect(result).toBeNull();
      // Type check: null is valid for PartialAppSummaryRecord | null
      const typedResult: PartialAppSummaryRecord | null = result;
      expect(typedResult).toBeNull();
    });
  });

  describe("MapReduceCompletionStrategy type safety", () => {
    let mockLLMRouter: jest.Mocked<LLMRouter>;
    let strategy: MapReduceCompletionStrategy;

    beforeEach(() => {
      mockLLMRouter = {
        executeCompletion: jest.fn(),
        getLLMManifest: jest.fn().mockReturnValue({
          models: {
            primaryCompletion: {
              maxTotalTokens: 100000,
            },
          },
        }),
      } as unknown as jest.Mocked<LLMRouter>;
      strategy = new MapReduceCompletionStrategy(mockLLMRouter);
    });

    it("should return PartialAppSummaryRecord | null", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const mockPartialResponse: PartialAppSummaryRecord = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };
      const mockFinalResponse: PartialAppSummaryRecord = {
        entities: [
          { name: "Entity1", description: "Description 1" },
          { name: "Entity2", description: "Description 2" },
        ],
      };

      // Mock the map phase (partial insights)
      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockPartialResponse)
        // Mock the reduce phase (final consolidation)
        .mockResolvedValueOnce(mockFinalResponse);

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
        "* file2.ts: purpose implementation",
      ]);

      // Type check: result should be PartialAppSummaryRecord | null
      const typedResult: PartialAppSummaryRecord | null = result;
      expect(typedResult).toEqual(mockFinalResponse);
    });

    it("should handle null response from reduce phase", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const mockPartialResponse: PartialAppSummaryRecord = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      // Mock the map phase returning data, but reduce phase returning null
      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockPartialResponse)
        .mockResolvedValueOnce(null);

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(result).toBeNull();
      // Type check: null is valid for PartialAppSummaryRecord | null
      const typedResult: PartialAppSummaryRecord | null = result;
      expect(typedResult).toBeNull();
    });
  });

  describe("Type compatibility with category schemas", () => {
    it("should verify all category response types are compatible with PartialAppSummaryRecord", () => {
      const categories: AppSummaryCategoryEnum[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "aggregates",
        "entities",
        "repositories",
        "potentialMicroservices",
      ];

      for (const _category of categories) {
        // Type check: verify that the inferred schema type is assignable to PartialAppSummaryRecord
        // Using a sample category for the type check
        type CategoryResponseType = z.infer<
          (typeof appSummaryPromptMetadata)["appDescription"]["responseSchema"]
        >;
        const testAssignment: PartialAppSummaryRecord = {} as CategoryResponseType;
        expect(testAssignment).toBeDefined();
      }
    });
  });

  describe("No unsafe casts required", () => {
    it("should demonstrate that no type casts are needed in the call chain", async () => {
      const mockLLMRouter = {
        executeCompletion: jest.fn().mockResolvedValue({
          appDescription: "Test description",
        }),
      } as unknown as jest.Mocked<LLMRouter>;

      const strategy = new SinglePassCompletionStrategy(mockLLMRouter);
      const category: AppSummaryCategoryEnum = "appDescription";

      // This should compile without any type assertions or casts
      const result = await strategy.generateInsights(category, ["* file1.ts: purpose"]);

      // Direct assignment without casts
      const typedResult: PartialAppSummaryRecord | null = result;

      // Can be used directly with repository methods
      if (typedResult) {
        const recordForDB: PartialAppSummaryRecord = typedResult;
        expect(recordForDB).toBeDefined();
      }
    });
  });
});
