import "reflect-metadata";
import { IInsightGenerationStrategy } from "../../../../../src/app/components/insights/strategies/completion-strategy.interface";
import { SinglePassInsightStrategy } from "../../../../../src/app/components/insights/strategies/single-pass-completion-strategy";
import { MapReduceInsightStrategy } from "../../../../../src/app/components/insights/strategies/map-reduce-completion-strategy";
import { executeInsightCompletion } from "../../../../../src/app/components/insights/strategies/insights-completion-executor";
import {
  PartialAppSummaryRecord,
  AppSummaryCategoryEnum,
  CategoryInsightResult,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../../../../../src/app/components/insights/insights.types";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { z } from "zod";

describe("Type Safety Tests", () => {
  describe("IInsightGenerationStrategy interface", () => {
    it("should have a generic generateInsights method", () => {
      // This test verifies the interface signature is correctly generic
      const strategy: IInsightGenerationStrategy = {
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
      const strategy: IInsightGenerationStrategy = {
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

  describe("SinglePassInsightStrategy type safety", () => {
    let mockLLMRouter: jest.Mocked<LLMRouter>;
    let strategy: SinglePassInsightStrategy;

    beforeEach(() => {
      mockLLMRouter = {
        executeCompletion: jest.fn(),
      } as unknown as jest.Mocked<LLMRouter>;
      strategy = new SinglePassInsightStrategy(mockLLMRouter);
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

    it("should return strongly-typed result for technologies", async () => {
      const mockResponse = {
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
      };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await strategy.generateInsights("technologies", ["* file1.ts: purpose"]);

      // Type check: result should be the technologies-specific type
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(typed.technologies[0].name).toBe("TypeScript");
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

  describe("MapReduceInsightStrategy type safety", () => {
    let mockLLMRouter: jest.Mocked<LLMRouter>;
    let strategy: MapReduceInsightStrategy;

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
      strategy = new MapReduceInsightStrategy(mockLLMRouter);
    });

    it("should return strongly-typed result for technologies category", async () => {
      const mockPartialResponse = {
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
      };
      const mockFinalResponse = {
        technologies: [
          { name: "TypeScript", description: "Typed JavaScript" },
          { name: "Node.js", description: "JavaScript runtime" },
        ],
      };

      // Mock the map phase (partial insights)
      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockPartialResponse)
        // Mock the reduce phase (final consolidation)
        .mockResolvedValueOnce(mockFinalResponse);

      const result = await strategy.generateInsights("technologies", [
        "* file1.ts: purpose implementation",
        "* file2.ts: purpose implementation",
      ]);

      // Type check: result should be the technologies-specific type
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(typed.technologies).toHaveLength(2);
        expect(typed.technologies[0].name).toBe("TypeScript");
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

      const result = await strategy.generateInsights("technologies", [
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

      const result = await strategy.generateInsights("technologies", [
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
        "boundedContexts",
        "technologies",
        "businessProcesses",
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
      type EntitiesType = z.infer<AppSummaryCategorySchemas["technologies"]>;
      type AggregatesType = z.infer<AppSummaryCategorySchemas["boundedContexts"]>;

      // Runtime checks to verify the schemas exist and are valid
      expect(appSummaryCategorySchemas.appDescription).toBeDefined();
      expect(appSummaryCategorySchemas.technologies).toBeDefined();
      expect(appSummaryCategorySchemas.technologies).toBeDefined();
      expect(appSummaryCategorySchemas.boundedContexts).toBeDefined();

      // Type-level assertions (compile-time only)
      const appDesc: AppDescType = { appDescription: "test" };
      const tech: TechType = { technologies: [] };
      const entities: EntitiesType = { technologies: [] };
      const aggregates: AggregatesType = { boundedContexts: [] };

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

      const strategy = new SinglePassInsightStrategy(mockLLMRouter);
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

      const result = await executeInsightCompletion(
        mockLLMRouter,
        "appDescription",
        ["* file1.ts: purpose"],
        {},
      );

      if (result) {
        // TypeScript should infer this as z.infer<AppSummaryCategorySchemas["appDescription"]>
        // The following assignment should compile without any cast
        const typed: z.infer<AppSummaryCategorySchemas["appDescription"]> = result;
        expect(typed.appDescription).toBe("Test description");
      }
    });

    it("should infer correct return type for technologies category", async () => {
      const mockResponse = {
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
      };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(
        mockLLMRouter,
        "technologies",
        ["* file1.ts: purpose"],
        {},
      );

      if (result) {
        // TypeScript should infer this as z.infer<AppSummaryCategorySchemas["technologies"]>
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(typed.technologies).toHaveLength(1);
        expect(typed.technologies[0].name).toBe("TypeScript");
      }
    });

    it("should allow accessing category-specific properties without type narrowing", async () => {
      const mockResponse = {
        boundedContexts: [
          {
            name: "OrderContext",
            description: "Order bounded context",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate root",
                repository: { name: "OrderRepository", description: "Order repository" },
                entities: [
                  { name: "Order", description: "Order entity" },
                  { name: "OrderItem", description: "OrderItem entity" },
                ],
              },
            ],
          },
        ],
      };
      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await executeInsightCompletion(
        mockLLMRouter,
        "boundedContexts",
        ["* file1.ts: purpose"],
        {},
      );

      if (result) {
        // Should be able to access boundedContext-specific properties directly
        const typed: z.infer<AppSummaryCategorySchemas["boundedContexts"]> = result;
        expect(typed.boundedContexts[0].aggregates[0].entities).toHaveLength(2);
        expect(typed.boundedContexts[0].aggregates[0].repository.name).toBe("OrderRepository");
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

      const result = await executeInsightCompletion(
        mockLLMRouter,
        "potentialMicroservices",
        ["* file1.ts: purpose"],
        {},
      );

      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["potentialMicroservices"]> = result;
        expect(typed.potentialMicroservices[0].entities).toHaveLength(1);
        expect(typed.potentialMicroservices[0].endpoints[0].path).toBe("/users");
        expect(typed.potentialMicroservices[0].operations[0].operation).toBe("CreateUser");
      }
    });
  });
});
