import { executeInsightCompletion } from "../../../../src/components/insights/completion-strategies/completion-executor";
import LLMRouter from "../../../../src/llm/llm-router";
import { LLMOutputFormat } from "../../../../src/llm/types/llm.types";
import {
  AppSummaryCategoryEnum,
  PartialAppSummaryRecord,
} from "../../../../src/components/insights/insights.types";
import { appSummaryPromptMetadata } from "../../../../src/prompts/definitions/app-summaries";
import { z } from "zod";

describe("completion-executor", () => {
  describe("executeInsightCompletion", () => {
    let mockLLMRouter: jest.Mocked<LLMRouter>;

    beforeEach(() => {
      mockLLMRouter = {
        executeCompletion: jest.fn(),
      } as unknown as jest.Mocked<LLMRouter>;
    });

    it("should export executeInsightCompletion function", () => {
      expect(typeof executeInsightCompletion).toBe("function");
    });

    it("should have correct function signature (no generic parameter)", () => {
      expect(executeInsightCompletion.length).toBe(3); // Takes 3 required parameters
    });

    it("should infer return type from category schema for appDescription", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const config = appSummaryPromptMetadata[category];
      const mockResponse = { appDescription: "Test description" };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(category, expect.any(String), {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: config.responseSchema,
        hasComplexSchema: false,
      });

      expect(result).toEqual(mockResponse);
      // Type check: result should be compatible with the schema type
      if (result) {
        const schemaType: z.infer<typeof config.responseSchema> = result;
        expect(schemaType).toBeDefined();
      }
    });

    it("should infer return type from category schema for entities", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const config = appSummaryPromptMetadata[category];
      const mockResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(category, expect.any(String), {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: config.responseSchema,
        hasComplexSchema: false,
      });

      expect(result).toEqual(mockResponse);
      // Type check: result should be compatible with the schema type
      if (result) {
        const schemaType: z.infer<typeof config.responseSchema> = result;
        expect(schemaType).toBeDefined();
      }
    });

    it("should return null when LLM call fails", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";

      mockLLMRouter.executeCompletion = jest.fn().mockRejectedValue(new Error("LLM error"));

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(result).toBeNull();
    });

    it("should return null when LLM returns null", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(null);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(result).toBeNull();
    });

    it("should use custom taskCategory when provided in options", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const customTaskCategory = "custom-category";
      const config = appSummaryPromptMetadata[category];

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue({
        appDescription: "Test",
      });

      await executeInsightCompletion(mockLLMRouter, category, ["* file1.ts: purpose"], {
        taskCategory: customTaskCategory,
      });

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        customTaskCategory,
        expect.any(String),
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.responseSchema,
          hasComplexSchema: false,
        },
      );
    });

    it("should include partialAnalysisNote in prompt when provided", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const partialNote = "This is a partial analysis";

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue({
        appDescription: "Test",
      });

      await executeInsightCompletion(mockLLMRouter, category, ["* file1.ts: purpose"], {
        partialAnalysisNote: partialNote,
      });

      // Verify the prompt was rendered with the partial note
      const callArgs = mockLLMRouter.executeCompletion.mock.calls[0];
      const renderedPrompt = callArgs[1];
      expect(typeof renderedPrompt).toBe("string");
      expect(renderedPrompt).toContain(partialNote);
    });

    it("should handle all category types with correct schema inference", async () => {
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
        const config = appSummaryPromptMetadata[category];
        const mockResponse = { [category]: [] };

        mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

        const result = await executeInsightCompletion(mockLLMRouter, category, [
          "* file1.ts: purpose implementation",
        ]);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(category, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.responseSchema,
          hasComplexSchema: false,
        });

        expect(result).toEqual(mockResponse);
        // Verify type inference works for each category
        if (result) {
          const schemaType: z.infer<typeof config.responseSchema> = result;
          expect(schemaType).toBeDefined();
        }
      }
    });

    it("should preserve type inference without unsafe casts", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const _config = appSummaryPromptMetadata[category];
      const mockResponse = { appDescription: "Test description" };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: purpose implementation",
      ]);

      // Verify that type is correctly inferred from schema without explicit casting
      // The result should be z.infer<typeof config.responseSchema> | null
      expect(result).toEqual(mockResponse);
      if (result) {
        // Type should be inferred correctly - no cast needed
        const inferredType: z.infer<typeof _config.responseSchema> = result;
        expect(inferredType.appDescription).toBe("Test description");
      }
    });

    it("should maintain type safety through the call chain", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const _config = appSummaryPromptMetadata[category];
      const mockResponse = {
        technologies: [{ name: "TypeScript", version: "5.7.3" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: purpose implementation",
      ]);

      // Verify the type flows correctly through executeCompletion -> executeInsightCompletion
      expect(result).toEqual(mockResponse);
      // Type should be correctly inferred from the schema
      if (result) {
        const schemaType: z.infer<typeof _config.responseSchema> = result;
        expect(schemaType.technologies).toBeDefined();
        expect(Array.isArray(schemaType.technologies)).toBe(true);
      }
    });
  });

  describe("type inference validation", () => {
    let mockLLMRouter: jest.Mocked<LLMRouter>;

    beforeEach(() => {
      mockLLMRouter = {
        executeCompletion: jest.fn(),
      } as unknown as jest.Mocked<LLMRouter>;
    });

    it("should allow direct assignment to PartialAppSummaryRecord without cast", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const mockResponse = { appDescription: "Test description" };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      // The result type should be PartialAppSummaryRecord | null, assignable directly
      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: implementation",
      ]);

      // Direct assignment without explicit cast
      const typedResult: PartialAppSummaryRecord | null = result;
      expect(typedResult).toEqual(mockResponse);
    });

    it("should preserve specific schema type through the call chain", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const _config = appSummaryPromptMetadata[category];
      const mockResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: implementation",
      ]);

      // Type should be preserved through the call chain
      if (result) {
        const typed: z.infer<typeof _config.responseSchema> = result;
        expect(typed.entities).toBeDefined();
        expect(typed.entities[0].name).toBe("Entity1");
      }
    });

    it("should work with all category types without runtime errors", async () => {
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
        const mockResponse = { [category]: "test" };

        mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

        const result = await executeInsightCompletion(mockLLMRouter, category, [
          "* file1.ts: implementation",
        ]);

        // Should not throw and type should be assignable
        expect(result).toBeDefined();
        if (result) {
          const typed: z.infer<typeof _config.responseSchema> = result;
          expect(typed).toBeDefined();
        }
      }
    });

    it("should allow use in repository methods without additional casts", async () => {
      const category: AppSummaryCategoryEnum = "boundedContexts";
      const mockResponse = {
        boundedContexts: [{ name: "Context1", description: "Desc", responsibilities: [] }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: implementation",
      ]);

      // Simulate using the result in a repository method
      if (result) {
        const recordForDB: PartialAppSummaryRecord = result;
        // Should be usable directly
        expect(recordForDB.boundedContexts).toEqual(mockResponse.boundedContexts);
      }
    });

    it("should handle null response with correct type", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(null);

      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: implementation",
      ]);

      // Null should be a valid value for the return type
      const typedNull: PartialAppSummaryRecord | null = result;
      expect(typedNull).toBeNull();
    });
  });
});
