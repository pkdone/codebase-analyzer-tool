import "reflect-metadata";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { z } from "zod";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import {
  executeInsightCompletion,
  type InsightCompletionOptions,
} from "../../../../../src/app/components/insights/completion-strategies/completion-executor";
import {
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
} from "../../../../../src/app/components/insights/insights.types";
import { appSummaryPromptMetadata } from "../../../../../src/app/prompts/definitions/app-summaries";

// Mock dependencies
jest.mock("../../../../../src/common/utils/logging", () => ({
  logOneLineWarning: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../../../src/common/utils/text-utils", () => ({
  joinArrayWithSeparators: jest.fn((arr: string[]) => arr.join("\n")),
}));

jest.mock("../../../../../src/app/prompts/prompt-renderer", () => ({
  renderPrompt: jest.fn().mockReturnValue("mock rendered prompt"),
}));

describe("executeInsightCompletion - Type Inference", () => {
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLLMRouter = {
      executeCompletion: jest.fn(),
      getModelsUsedDescription: jest.fn(),
      generateEmbeddings: jest.fn(),
      getModelFamily: jest.fn(),
      getEmbeddingModelDimensions: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;
  });

  describe("category-specific result type inference", () => {
    test("should return correctly typed result for entities category", async () => {
      const mockResponse = {
        entities: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "entities", [
        "* file1.ts: implementation",
      ]);

      // Type should be inferred as CategoryInsightResult<"entities">
      expect(result).toEqual(mockResponse);
      if (result) {
        // No type assertion needed - should compile with correct type
        expect(result.entities).toBeDefined();
        expect(result.entities[0].name).toBe("User");
      }
    });

    test("should return correctly typed result for technologies category", async () => {
      const mockResponse = {
        technologies: [
          { name: "TypeScript", version: "5.7.3" },
          { name: "React", version: "18.0.0" },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "technologies", [
        "* file1.ts: implementation",
      ]);

      expect(result).toEqual(mockResponse);
      if (result) {
        expect(result.technologies).toBeDefined();
        expect(result.technologies[0].name).toBe("TypeScript");
        expect(result.technologies[0].version).toBe("5.7.3");
      }
    });

    test("should return correctly typed result for appDescription category", async () => {
      const mockResponse = {
        appDescription: "This is a test application description",
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "appDescription", [
        "* file1.ts: implementation",
      ]);

      expect(result).toEqual(mockResponse);
      if (result) {
        expect(result.appDescription).toBe("This is a test application description");
      }
    });

    test("should return correctly typed result for boundedContexts category", async () => {
      const mockResponse = {
        boundedContexts: [
          {
            name: "Sales",
            description: "Sales bounded context",
            responsibilities: ["Orders", "Customers"],
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "boundedContexts", [
        "* file1.ts: implementation",
      ]);

      expect(result).toEqual(mockResponse);
      if (result) {
        expect(result.boundedContexts).toBeDefined();
        expect(result.boundedContexts[0].responsibilities).toContain("Orders");
      }
    });

    test("should return correctly typed result for aggregates category", async () => {
      const mockResponse = {
        aggregates: [
          {
            name: "OrderAggregate",
            description: "Aggregate for orders",
            entities: ["Order", "OrderItem"],
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "aggregates", [
        "* file1.ts: implementation",
      ]);

      expect(result).toEqual(mockResponse);
      if (result) {
        expect(result.aggregates).toBeDefined();
        expect(result.aggregates[0].entities).toContain("Order");
      }
    });
  });

  describe("generic type parameter inference", () => {
    test("should infer type from category enum parameter", async () => {
      const category: AppSummaryCategoryEnum = "entities";
      const mockResponse = {
        entities: [{ name: "User", description: "User entity" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      // Type should be inferred from the category parameter
      const result = await executeInsightCompletion(mockLLMRouter, category, [
        "* file1.ts: implementation",
      ]);

      expect(result).toEqual(mockResponse);
    });

    test("should handle all supported category types", async () => {
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
        const mockResponse = { [category]: [] };
        (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

        const result = await executeInsightCompletion(mockLLMRouter, category, [
          "* file1.ts: implementation",
        ]);

        expect(result).toEqual(mockResponse);
      }
    });
  });

  describe("no unsafe casts in return path", () => {
    test("should return result without type assertions", async () => {
      const mockResponse = {
        repositories: [
          { name: "UserRepository", description: "Repository for users" },
          { name: "OrderRepository", description: "Repository for orders" },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "repositories", [
        "* file1.ts: implementation",
      ]);

      // Should not need any type assertions to access properties
      expect(result).toEqual(mockResponse);
      if (result) {
        expect(result.repositories.length).toBe(2);
        expect(result.repositories[0].name).toBe("UserRepository");
      }
    });

    test("should handle null response without type assertions", async () => {
      mockLLMRouter.executeCompletion.mockResolvedValue(null);

      const result = await executeInsightCompletion(mockLLMRouter, "entities", [
        "* file1.ts: implementation",
      ]);

      expect(result).toBeNull();
    });

    test("should handle errors without breaking type safety", async () => {
      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("LLM error"));

      const result = await executeInsightCompletion(mockLLMRouter, "entities", [
        "* file1.ts: implementation",
      ]);

      expect(result).toBeNull();
    });
  });

  describe("schema validation and type alignment", () => {
    test("should call executeCompletion with correct schema for each category", async () => {
      const category: AppSummaryCategoryEnum = "businessProcesses";
      const mockResponse = {
        businessProcesses: [{ name: "Order Processing", description: "Process orders" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      await executeInsightCompletion(mockLLMRouter, category, ["* file1.ts: implementation"]);

      // Verify the correct schema was used
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        category,
        expect.any(String),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: appSummaryCategorySchemas[category],
        }),
      );
    });

    test("should validate that schema inference matches category type", () => {
      // Compile-time validation
      const _entitiesSchema = appSummaryCategorySchemas.entities;
      type EntitiesType = z.infer<typeof _entitiesSchema>;

      // This should compile correctly
      const validEntities: EntitiesType = {
        entities: [{ name: "User", description: "User entity" }],
      };

      expect(validEntities.entities).toBeDefined();
    });
  });

  describe("type narrowing for all supported categories", () => {
    test("should narrow type for potentialMicroservices category", async () => {
      const mockResponse = {
        potentialMicroservices: [
          {
            name: "Order Service",
            description: "Handles orders",
            responsibilities: ["Order management"],
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "potentialMicroservices", [
        "* file1.ts: implementation",
      ]);

      expect(result).toEqual(mockResponse);
      if (result) {
        // Type should be narrowed to the specific category result
        expect(result.potentialMicroservices).toBeDefined();
        expect(result.potentialMicroservices[0].responsibilities).toBeDefined();
      }
    });

    test("should work with partial analysis note option", async () => {
      const mockResponse = {
        entities: [{ name: "User", description: "User entity" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const options: InsightCompletionOptions = {
        partialAnalysisNote: "This is a partial analysis",
        taskCategory: "entities-chunk",
      };

      const result = await executeInsightCompletion(
        mockLLMRouter,
        "entities",
        ["* file1.ts: implementation"],
        options,
      );

      expect(result).toEqual(mockResponse);
      if (result) {
        expect(result.entities).toBeDefined();
      }
    });
  });

  describe("compile-time type safety demonstrations", () => {
    test("should demonstrate that return type matches schema type", () => {
      // Compile-time test - validates type definitions
      const _technologiesSchema = appSummaryCategorySchemas.technologies;
      type TechnologiesResult = z.infer<typeof _technologiesSchema>;

      const validResult: TechnologiesResult = {
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };

      // Should compile without errors
      expect(validResult.technologies[0].name).toBe("TypeScript");
    });

    test("should validate that all categories have corresponding schemas", () => {
      // Compile-time validation that schema mapping is complete
      const allCategories: AppSummaryCategoryEnum[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "aggregates",
        "entities",
        "repositories",
        "potentialMicroservices",
      ];

      // This should compile, confirming all categories have schemas
      allCategories.forEach((category) => {
        expect(appSummaryCategorySchemas[category]).toBeDefined();
      });
    });

    test("should demonstrate integration with LLM router type inference", async () => {
      const mockResponse = {
        entities: [{ name: "User", description: "User entity" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "entities", [
        "* file1.ts: implementation",
      ]);

      // Demonstrates end-to-end type flow from schema through LLM router
      if (result) {
        // No casts needed - type flows correctly
        const entityName: string = result.entities[0].name;
        expect(entityName).toBe("User");
      }
    });
  });

  describe("prompt configuration validation", () => {
    test("should use correct configuration for each category", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const config = appSummaryPromptMetadata[category];
      const mockResponse = {
        technologies: [{ name: "TypeScript" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(mockResponse);

      await executeInsightCompletion(mockLLMRouter, category, ["* file1.ts: implementation"]);

      // Verify the configuration is correct
      expect(config).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.responseSchema).toBeDefined();
    });
  });
});
