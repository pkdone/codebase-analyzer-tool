import "reflect-metadata";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { z } from "zod";
import { executeInsightCompletion } from "../../../../src/app/components/insights/strategies/insights-completion-executor";
import { appSummaryCategorySchemas } from "../../../../src/app/components/insights/insights.types";
import { AppSummaryCategories } from "../../../../src/app/schemas/app-summaries.schema";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../src/common/llm/types/llm.types";
import { ok, err } from "../../../../src/common/types/result.types";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

// Mock dependencies
jest.mock("../../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

/**
 * Integration test suite verifying that the type fix enables proper type inference
 * in the executeInsightCompletion function without requiring unsafe type casts.
 */
describe("Completion Executor Type Safety - Post Fix", () => {
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    // Create a mock LLM router with proper typing
    mockLLMRouter = {
      executeCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;
  });

  describe("Category-Specific Type Inference", () => {
    test("should infer correct type for technologies category", async () => {
      const mockTechnologiesData = {
        technologies: [
          { name: "TypeScript", description: "Typed JavaScript" },
          { name: "Node.js", description: "JavaScript runtime" },
        ],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockTechnologiesData) as any);

      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        ["file1.ts", "file2.ts"],
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("technologies");

      // Type should be properly inferred without casts
      if (result) {
        expect(Array.isArray(result.technologies)).toBe(true);
        expect(result.technologies).toHaveLength(2);
        expect(result.technologies[0].name).toBe("TypeScript");
      }

      // Verify the router was called with correct parameters
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        AppSummaryCategories.enum.technologies,
        expect.any(String),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: appSummaryCategorySchemas[AppSummaryCategories.enum.technologies],
        }),
      );
    });

    test("should infer correct type for boundedContexts category", async () => {
      const mockBoundedContextsData = {
        boundedContexts: [
          {
            name: "UserManagement",
            description: "Handles user operations",
            aggregates: [
              {
                name: "UserAggregate",
                description: "User aggregate",
                repository: { name: "UserRepository", description: "User repository" },
                entities: [{ name: "User", description: "User entity" }],
              },
            ],
          },
          {
            name: "ProductCatalog",
            description: "Manages products",
            aggregates: [
              {
                name: "ProductAggregate",
                description: "Product aggregate",
                repository: { name: "ProductRepository", description: "Product repository" },
                entities: [{ name: "Product", description: "Product entity" }],
              },
            ],
          },
        ],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockBoundedContextsData) as any);

      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.boundedContexts,
        ["file1.ts", "file2.ts"],
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("boundedContexts");

      if (result) {
        expect(Array.isArray(result.boundedContexts)).toBe(true);
        expect(result.boundedContexts).toHaveLength(2);
        expect(result.boundedContexts[0].name).toBe("UserManagement");
      }
    });

    test("should infer correct type for boundedContexts with aggregates", async () => {
      const mockBoundedContextsData = {
        boundedContexts: [
          {
            name: "OrderContext",
            description: "Order bounded context",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate root",
                repository: { name: "OrderRepository", description: "Order repository" },
                entities: [{ name: "Order", description: "Order entity" }],
              },
            ],
          },
          {
            name: "UserContext",
            description: "User bounded context",
            aggregates: [
              {
                name: "UserAggregate",
                description: "User aggregate root",
                repository: { name: "UserRepository", description: "User repository" },
                entities: [{ name: "User", description: "User entity" }],
              },
            ],
          },
        ],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockBoundedContextsData) as any);

      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.boundedContexts,
        ["file1.ts", "file2.ts"],
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("boundedContexts");

      if (result) {
        expect(Array.isArray(result.boundedContexts)).toBe(true);
        expect(result.boundedContexts).toHaveLength(2);
        expect(result.boundedContexts[0].name).toBe("OrderContext");
      }
    });

    test("should infer correct type for technologies category", async () => {
      const mockTechData = {
        technologies: [
          { name: "TypeScript", description: "Statically typed JavaScript" },
          { name: "Node.js", description: "JavaScript runtime" },
        ],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockTechData) as any);

      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        ["file1.ts", "file2.ts"],
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("technologies");

      if (result) {
        expect(Array.isArray(result.technologies)).toBe(true);
        expect(result.technologies).toHaveLength(2);
        expect(result.technologies[0].name).toBe("TypeScript");
      }
    });
  });

  describe("Options and Configuration", () => {
    test("should handle custom task category", async () => {
      const mockData = {
        entities: [{ name: "TestEntity", description: "Test" }],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockData) as any);

      await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        ["file1.ts"],
        { taskCategory: "custom-entities" },
      );

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "custom-entities",
        expect.any(String),
        expect.any(Object),
      );
    });

    test("should handle partial analysis note", async () => {
      const mockData = {
        entities: [{ name: "TestEntity", description: "Test" }],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockData) as any);

      await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        ["file1.ts"],
        { partialAnalysisNote: "This is a partial analysis." },
      );

      // Verify the partial analysis note was included in the prompt
      const callArgs = mockLLMRouter.executeCompletion.mock.calls[0];
      const renderedPrompt = callArgs[1];
      expect(renderedPrompt).toContain("This is a partial analysis.");
    });
  });

  describe("Error Handling", () => {
    test("should return null when LLM returns Err", async () => {
      mockLLMRouter.executeCompletion.mockResolvedValue(
        err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Mock error")),
      );

      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        ["file1.ts"],
      );

      expect(result).toBeNull();
    });

    test("should return null when LLM throws error", async () => {
      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("LLM error"));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        ["file1.ts"],
      );

      expect(result).toBeNull();
    });

    test("should handle empty source file summaries", async () => {
      const mockData = {
        technologies: [],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockData) as any);

      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        [],
      );

      expect(result).toBeDefined();
      if (result) {
        expect(result.technologies).toEqual([]);
      }
    });
  });

  describe("Type Safety Verification", () => {
    test("should maintain type safety without eslint-disable comments", async () => {
      // This test verifies that the fix allows us to remove the eslint-disable comments
      // The type should be properly inferred from the schema without requiring unsafe casts

      const mockTechnologiesData = {
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockTechnologiesData) as any);

      // This function call should now have proper type inference
      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.technologies,
        ["file1.ts"],
      );

      // The return type should be correctly inferred without unsafe casts

      expect(result).not.toBeNull();

      // This should work without type assertions
      if (result) {
        // TypeScript should know that result.technologies exists
        const entities = result.technologies;
        expect(Array.isArray(entities)).toBe(true);
      }
    });

    test("should preserve type information through generic function", async () => {
      // Test that the generic parameter C is properly preserved
      const mockData = {
        boundedContexts: [
          {
            name: "Context",
            description: "Test context",
            aggregates: [
              {
                name: "TestAggregate",
                description: "Test aggregate",
                repository: { name: "TestRepository", description: "Test repository" },
                entities: [{ name: "TestEntity", description: "Test entity" }],
              },
            ],
          },
        ],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockData) as any);

      // The function is generic over C extends AppSummaryCategoryEnum
      // The return type should be CategoryInsightResult<C> | null
      const result = await executeInsightCompletion(
        mockLLMRouter,
        AppSummaryCategories.enum.boundedContexts,
        ["file1.ts"],
      );

      // TypeScript should infer the correct type based on the category parameter
      if (result) {
        // This should work because TypeScript knows the shape of the result
        expect(result.boundedContexts).toBeDefined();
        expect(Array.isArray(result.boundedContexts)).toBe(true);
      }
    });
  });

  describe("Schema Validation", () => {
    test("should use correct schema for each category", () => {
      // Verify that each category has a proper schema defined
      const categories = [
        AppSummaryCategories.enum.technologies,
        AppSummaryCategories.enum.boundedContexts,
        AppSummaryCategories.enum.boundedContexts,
        AppSummaryCategories.enum.technologies,
      ];

      for (const category of categories) {
        const schema = appSummaryCategorySchemas[category];
        expect(schema).toBeDefined();
        expect(schema).toBeInstanceOf(z.ZodObject);
      }
    });

    test("should pass correct completion options", async () => {
      const mockData = {
        entities: [],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(ok(mockData) as any);

      await executeInsightCompletion(mockLLMRouter, AppSummaryCategories.enum.technologies, [
        "file1.ts",
      ]);

      const callArgs = mockLLMRouter.executeCompletion.mock.calls[0];
      const completionOptions = callArgs[2];

      expect(completionOptions).toMatchObject({
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: expect.any(z.ZodObject),
        hasComplexSchema: expect.any(Boolean),
        sanitizerConfig: expect.any(Object),
      });
    });
  });
});
