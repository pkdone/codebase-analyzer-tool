import "reflect-metadata";
import { MapReduceCompletionStrategy } from "../../../../src/components/insights/completion-strategies/map-reduce-completion-strategy";
import {
  PartialAppSummaryRecord,
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../../../../src/components/insights/insights.types";
import LLMRouter from "../../../../src/llm/llm-router";
import { LLMOutputFormat } from "../../../../src/llm/types/llm.types";
import { appSummaryPromptMetadata } from "../../../../src/prompts/definitions/app-summaries";
import { z } from "zod";

describe("MapReduceCompletionStrategy", () => {
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

  describe("generateInsights", () => {
    it("should export MapReduceCompletionStrategy class", () => {
      expect(MapReduceCompletionStrategy).toBeDefined();
      expect(typeof MapReduceCompletionStrategy).toBe("function");
    });

    it("should implement ICompletionStrategy interface", () => {
      expect(strategy.generateInsights).toBeDefined();
      expect(typeof strategy.generateInsights).toBe("function");
    });

    it("should call executeCompletion for map and reduce phases", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const mockMapResponse: PartialAppSummaryRecord = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };
      const mockReduceResponse: PartialAppSummaryRecord = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockMapResponse) // Map phase
        .mockResolvedValueOnce(mockReduceResponse); // Reduce phase

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockReduceResponse);
    });

    it("should return null when all map phases return null", async () => {
      const category: AppSummaryCategoryEnum = "entities";

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(null);

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      // Only map phase should be called, reduce phase should be skipped
      expect(result).toBeNull();
    });

    it("should return null when reduce phase returns null", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const mockMapResponse: PartialAppSummaryRecord = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockMapResponse)
        .mockResolvedValueOnce(null); // Reduce returns null

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(result).toBeNull();
    });

    it("should return null when an error is thrown", async () => {
      const category: AppSummaryCategoryEnum = "entities";

      mockLLMRouter.executeCompletion = jest.fn().mockRejectedValue(new Error("LLM error"));

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(result).toBeNull();
    });
  });

  describe("type inference through the call chain", () => {
    it("should infer return type from category schema without explicit casts", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const _config = appSummaryPromptMetadata[category];
      const mockResponse = { appDescription: "Test description" };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      // Type check: result should be compatible with PartialAppSummaryRecord
      expect(result).toEqual(mockResponse);
      if (result) {
        const schemaType: z.infer<typeof _config.responseSchema> = result;
        expect(schemaType).toBeDefined();
      }
    });

    it("should handle entities category with proper type inference", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const _config = appSummaryPromptMetadata[category];
      const mockResponse = {
        entities: [{ name: "Entity1", description: "Desc" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights(category, ["* file1.ts: implementation"]);

      expect(result).toEqual(mockResponse);
      if (result) {
        const schemaType: z.infer<typeof _config.responseSchema> = result;
        expect(schemaType.entities).toBeDefined();
        expect(Array.isArray(schemaType.entities)).toBe(true);
      }
    });

    it("should handle technologies category with proper type inference", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const _config = appSummaryPromptMetadata[category];
      const mockResponse = {
        technologies: [{ name: "TypeScript", version: "5.7.3" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights(category, ["* file1.ts: implementation"]);

      expect(result).toEqual(mockResponse);
      if (result) {
        const schemaType: z.infer<typeof _config.responseSchema> = result;
        expect(schemaType.technologies).toBeDefined();
      }
    });
  });

  describe("executeCompletion call validation", () => {
    it("should call executeCompletion with correct options for map phase", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const config = appSummaryPromptMetadata[category];
      const mockResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      await strategy.generateInsights(category, ["* file1.ts: implementation"]);

      // Verify the map phase call includes the correct options
      const mapCall = mockLLMRouter.executeCompletion.mock.calls[0];
      expect(mapCall[0]).toBe(`${category}-chunk`);
      expect(mapCall[2]).toEqual(
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.responseSchema,
          hasComplexSchema: false,
        }),
      );
    });

    it("should call executeCompletion with correct options for reduce phase", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const mockResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      await strategy.generateInsights(category, ["* file1.ts: implementation"]);

      // Verify the reduce phase call includes the correct options
      // The reduce phase now uses the strongly-typed appSummaryCategorySchemas
      const reduceCall = mockLLMRouter.executeCompletion.mock.calls[1];
      expect(reduceCall[0]).toBe(`${category}-reduce`);
      expect(reduceCall[2]).toEqual(
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: appSummaryCategorySchemas[category],
          hasComplexSchema: false,
        }),
      );
    });
  });

  describe("type safety without unsafe casts", () => {
    it("should demonstrate type safety with strongly-typed result", async () => {
      const mockResponse = {
        boundedContexts: [{ name: "Context1", description: "Desc", responsibilities: [] }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      // This should compile without any type assertions
      // The result is strongly typed based on the category
      const result = await strategy.generateInsights("boundedContexts", [
        "* file1.ts: implementation",
      ]);

      // Type check: result should be the boundedContexts-specific type
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["boundedContexts"]> = result;
        expect(typed.boundedContexts[0].name).toBe("Context1");

        // Also assignable to PartialAppSummaryRecord for repository storage
        const recordForDB: PartialAppSummaryRecord = result;
        expect(recordForDB).toBeDefined();
      }
    });

    it("should maintain type safety across all category types", async () => {
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

      for (const category of categories) {
        const _config = appSummaryPromptMetadata[category];
        const mockResponse = { [category]: [] };

        mockLLMRouter.executeCompletion = jest
          .fn()
          .mockResolvedValueOnce(mockResponse)
          .mockResolvedValueOnce(mockResponse);

        const result = await strategy.generateInsights(category, ["* file1.ts: implementation"]);

        expect(result).toEqual(mockResponse);
        // Verify type inference works for each category
        if (result) {
          const schemaType: z.infer<typeof _config.responseSchema> = result;
          expect(schemaType).toBeDefined();
        }
      }
    });
  });
});
