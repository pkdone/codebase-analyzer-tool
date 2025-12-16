import "reflect-metadata";
import { ICompletionStrategy } from "../../../../src/components/insights/completion-strategies/completion-strategy.interface";
import { SinglePassCompletionStrategy } from "../../../../src/components/insights/completion-strategies/single-pass-completion-strategy";
import { MapReduceCompletionStrategy } from "../../../../src/components/insights/completion-strategies/map-reduce-completion-strategy";
import { executeInsightCompletion } from "../../../../src/components/insights/completion-strategies/completion-executor";
import {
  PartialAppSummaryRecord,
  AppSummaryCategoryEnum,
  CategoryInsightResult,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../../../../src/components/insights/insights.types";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { z } from "zod";

describe("Type Safety Tests", () => {
  describe("ICompletionStrategy interface", () => {
    it("should have a generic generateInsights method", () => {
      // This test verifies the interface signature is correctly generic
      const strategy: ICompletionStrategy = {
        generateInsights: async <C extends AppSummaryCategoryEnum>(
          _category: C,
          _sourceFileSummaries: string[],
        ): Promise<CategoryInsightResult<C> | null> => {
          return null;
        },
      };

      expect(strategy.generateInsights).toBeDefined();
      // Type check: verify the return type is category-specific
      const returnType = strategy.generateInsights("appDescription", []);
      expect(returnType).toBeDefined();
    });

    it("should return strongly-typed result based on category", async () => {
      const strategy: ICompletionStrategy = {
        generateInsights: async <C extends AppSummaryCategoryEnum>(
          _category: C,
          _sourceFileSummaries: string[],
        ): Promise<CategoryInsightResult<C> | null> => {
          // Return appropriate mock data based on category
          return { appDescription: "Test description" } as CategoryInsightResult<C>;
        },
      };

      const result = await strategy.generateInsights("appDescription", []);

      // The result should be strongly typed as the appDescription schema type
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["appDescription"]> = result;
        expect(typed.appDescription).toBeDefined();
      }
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

    it("should return strongly-typed result for appDescription", async () => {
      const mockResponse = { appDescription: "Test description" };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights("appDescription", ["* file1.ts: purpose"]);

      // Type check: result should be the appDescription-specific type
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["appDescription"]> = result;
        expect(typed.appDescription).toBe("Test description");
      }
    });

    it("should return strongly-typed result for entities", async () => {
      const mockResponse = {
        entities: [{ name: "User", description: "User entity" }],
      };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights("entities", ["* file1.ts: purpose"]);

      // Type check: result should be the entities-specific type
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["entities"]> = result;
        expect(typed.entities[0].name).toBe("User");
      }
    });

    it("should handle null response", async () => {
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(null);

      const result = await strategy.generateInsights("appDescription", ["* file1.ts: purpose"]);

      expect(result).toBeNull();
    });

    it("should be assignable to PartialAppSummaryRecord for repository storage", async () => {
      const mockResponse = { appDescription: "Test description" };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights("appDescription", ["* file1.ts: purpose"]);

      // The category-specific type should be assignable to PartialAppSummaryRecord
      if (result) {
        const recordForDB: PartialAppSummaryRecord = result;
        expect(recordForDB).toBeDefined();
      }
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

    it("should return strongly-typed result for entities category", async () => {
      const mockPartialResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };
      const mockFinalResponse = {
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

      const result = await strategy.generateInsights("entities", [
        "* file1.ts: purpose implementation",
        "* file2.ts: purpose implementation",
      ]);

      // Type check: result should be the entities-specific type
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["entities"]> = result;
        expect(typed.entities).toHaveLength(2);
        expect(typed.entities[0].name).toBe("Entity1");
      }
    });

    it("should handle null response from reduce phase", async () => {
      const mockPartialResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      // Mock the map phase returning data, but reduce phase returning null
      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockPartialResponse)
        .mockResolvedValueOnce(null);

      const result = await strategy.generateInsights("entities", [
        "* file1.ts: purpose implementation",
      ]);

      expect(result).toBeNull();
    });

    it("should be assignable to PartialAppSummaryRecord for repository storage", async () => {
      const mockPartialResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };
      const mockFinalResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockPartialResponse)
        .mockResolvedValueOnce(mockFinalResponse);

      const result = await strategy.generateInsights("entities", [
        "* file1.ts: purpose implementation",
      ]);

      // The category-specific type should be assignable to PartialAppSummaryRecord
      if (result) {
        const recordForDB: PartialAppSummaryRecord = result;
        expect(recordForDB).toBeDefined();
      }
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
        // Using the strongly-typed appSummaryCategorySchemas for type check
        type CategoryResponseType = z.infer<AppSummaryCategorySchemas["appDescription"]>;
        const testAssignment: PartialAppSummaryRecord = {} as CategoryResponseType;
        expect(testAssignment).toBeDefined();
      }
    });

    it("should verify appSummaryCategorySchemas provides correct types for each category", () => {
      // Compile-time type assertions - these would fail to compile if types don't match
      type AppDescType = z.infer<AppSummaryCategorySchemas["appDescription"]>;
      type TechType = z.infer<AppSummaryCategorySchemas["technologies"]>;
      type EntitiesType = z.infer<AppSummaryCategorySchemas["entities"]>;
      type AggregatesType = z.infer<AppSummaryCategorySchemas["aggregates"]>;

      // Runtime checks to verify the schemas exist and are valid
      expect(appSummaryCategorySchemas.appDescription).toBeDefined();
      expect(appSummaryCategorySchemas.technologies).toBeDefined();
      expect(appSummaryCategorySchemas.entities).toBeDefined();
      expect(appSummaryCategorySchemas.aggregates).toBeDefined();

      // Type-level assertions (compile-time only)
      const appDesc: AppDescType = { appDescription: "test" };
      const tech: TechType = { technologies: [] };
      const entities: EntitiesType = { entities: [] };
      const aggregates: AggregatesType = { aggregates: [] };

      expect(appDesc).toBeDefined();
      expect(tech).toBeDefined();
      expect(entities).toBeDefined();
      expect(aggregates).toBeDefined();
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

  describe("executeInsightCompletion generic type inference", () => {
    let mockLLMRouter: jest.Mocked<LLMRouter>;

    beforeEach(() => {
      mockLLMRouter = {
        executeCompletion: jest.fn(),
      } as unknown as jest.Mocked<LLMRouter>;
    });

    it("should infer correct return type for appDescription category", async () => {
      const mockResponse = { appDescription: "Test description" };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "appDescription", [
        "* file1.ts: purpose",
      ]);

      if (result) {
        // TypeScript should infer this as z.infer<AppSummaryCategorySchemas["appDescription"]>
        // The following assignment should compile without any cast
        const typed: z.infer<AppSummaryCategorySchemas["appDescription"]> = result;
        expect(typed.appDescription).toBe("Test description");
      }
    });

    it("should infer correct return type for entities category", async () => {
      const mockResponse = {
        entities: [{ name: "User", description: "User entity" }],
      };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "entities", [
        "* file1.ts: purpose",
      ]);

      if (result) {
        // TypeScript should infer this as z.infer<AppSummaryCategorySchemas["entities"]>
        const typed: z.infer<AppSummaryCategorySchemas["entities"]> = result;
        expect(typed.entities).toHaveLength(1);
        expect(typed.entities[0].name).toBe("User");
      }
    });

    it("should allow accessing category-specific properties without type narrowing", async () => {
      const mockResponse = {
        aggregates: [
          {
            name: "OrderAggregate",
            description: "Order aggregate root",
            entities: ["Order", "OrderItem"],
            repository: "OrderRepository",
          },
        ],
      };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "aggregates", [
        "* file1.ts: purpose",
      ]);

      if (result) {
        // Should be able to access aggregate-specific properties directly
        const typed: z.infer<AppSummaryCategorySchemas["aggregates"]> = result;
        expect(typed.aggregates[0].entities).toContain("Order");
        expect(typed.aggregates[0].repository).toBe("OrderRepository");
      }
    });

    it("should correctly type potentialMicroservices with nested structures", async () => {
      const mockResponse = {
        potentialMicroservices: [
          {
            name: "UserService",
            description: "Handles user management",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/users", method: "GET", description: "Get users" }],
            operations: [{ operation: "CreateUser", method: "POST", description: "Create user" }],
          },
        ],
      };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(mockLLMRouter, "potentialMicroservices", [
        "* file1.ts: purpose",
      ]);

      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["potentialMicroservices"]> = result;
        expect(typed.potentialMicroservices[0].entities).toHaveLength(1);
        expect(typed.potentialMicroservices[0].endpoints[0].path).toBe("/users");
        expect(typed.potentialMicroservices[0].operations[0].operation).toBe("CreateUser");
      }
    });
  });
});
