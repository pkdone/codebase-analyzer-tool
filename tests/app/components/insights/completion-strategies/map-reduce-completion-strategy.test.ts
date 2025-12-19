import "reflect-metadata";
import { MapReduceCompletionStrategy } from "../../../../../src/app/components/insights/completion-strategies/map-reduce-completion-strategy";
import {
  PartialAppSummaryRecord,
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../../../../../src/app/components/insights/insights.types";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import { promptRegistry } from "../../../../../src/app/prompts/prompt-registry";
const appSummaryPromptMetadata = promptRegistry.appSummaries;
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
      // Use category-specific type instead of PartialAppSummaryRecord for stronger typing
      const mockMapResponse = {
        entities: [{ name: "Entity1", description: "Description 1" }],
      };
      const mockReduceResponse = {
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
      // Use category-specific type for stronger typing
      const mockMapResponse = {
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

      // Type check: result is category-specific but also compatible with PartialAppSummaryRecord
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
          sanitizerConfig: expect.any(Object),
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
          sanitizerConfig: expect.any(Object),
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

  describe("CategoryInsightResult type inference", () => {
    it("should correctly infer CategoryInsightResult for entities category", async () => {
      const mockResponse = {
        entities: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights("entities", ["* file1.ts: implementation"]);

      // Type should be inferred as CategoryInsightResult<"entities">
      if (result) {
        expect(result.entities).toBeDefined();
        expect(Array.isArray(result.entities)).toBe(true);
        expect(result.entities.length).toBe(2);
      }
    });

    it("should correctly infer CategoryInsightResult for technologies category", async () => {
      const mockResponse = {
        technologies: [
          { name: "TypeScript", version: "5.7.3" },
          { name: "Node.ts", version: "20.0.0" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights("technologies", [
        "* file1.ts: implementation",
      ]);

      // Type should be inferred as CategoryInsightResult<"technologies">
      if (result) {
        expect(result.technologies).toBeDefined();
        expect(result.technologies[0].name).toBe("TypeScript");
      }
    });

    it("should correctly infer CategoryInsightResult for aggregates category", async () => {
      const mockResponse = {
        aggregates: [{ name: "OrderAggregate", description: "Order aggregate", entities: [] }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights("aggregates", ["* file1.ts: implementation"]);

      // Type should be inferred as CategoryInsightResult<"aggregates">
      if (result) {
        expect(result.aggregates).toBeDefined();
        expect(result.aggregates[0].name).toBe("OrderAggregate");
      }
    });
  });

  describe("reducePartialInsights type safety", () => {
    it("should return correctly typed data without casts for entities", async () => {
      const mapResponse = {
        entities: [{ name: "User", description: "User entity" }],
      };
      const reduceResponse = {
        entities: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mapResponse)
        .mockResolvedValueOnce(reduceResponse);

      const result = await strategy.generateInsights("entities", ["* file1.ts: implementation"]);

      // The reduce step should return correctly typed data
      expect(result).toEqual(reduceResponse);
      if (result) {
        // No type assertion needed - type is inferred
        expect(result.entities.length).toBe(2);
      }
    });

    it("should handle indexed access type inference correctly", async () => {
      // This test validates that appSummaryCategorySchemas[C] works correctly
      const mockResponse = {
        repositories: [{ name: "UserRepository", description: "User repo" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights("repositories", [
        "* file1.ts: implementation",
      ]);

      // Type should be correctly inferred from indexed access
      if (result) {
        expect(result.repositories).toBeDefined();
        expect(result.repositories[0].name).toBe("UserRepository");
      }
    });
  });

  describe("type compatibility between partial and final results", () => {
    it("should allow partial results to be combined into final result", async () => {
      const partialResult1 = {
        entities: [{ name: "User", description: "User entity" }],
      };
      const finalResult = {
        entities: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      // For this test, we'll use a single chunk to simplify
      // The map phase returns partialResult1, then reduce combines and returns finalResult
      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(partialResult1) // Map phase for chunk 1
        .mockResolvedValueOnce(finalResult); // Reduce phase

      const result = await strategy.generateInsights("entities", ["* file1.ts: implementation"]);

      // Final result should be properly typed
      expect(result).toEqual(finalResult);
      if (result) {
        expect(result.entities.length).toBe(2);
      }
    });

    it("should maintain type safety when consolidating partial results", async () => {
      const mockMapResponse = {
        boundedContexts: [{ name: "Sales", description: "Sales context", responsibilities: [] }],
      };
      const mockReduceResponse = {
        boundedContexts: [
          { name: "Sales", description: "Sales context", responsibilities: ["Orders"] },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockMapResponse)
        .mockResolvedValueOnce(mockReduceResponse);

      const result = await strategy.generateInsights("boundedContexts", [
        "* file1.ts: implementation",
      ]);

      // Type should be correctly inferred throughout the map-reduce pipeline
      if (result) {
        expect(result.boundedContexts).toBeDefined();
        expect(result.boundedContexts[0].responsibilities).toBeDefined();
      }
    });
  });

  describe("compile-time type safety demonstrations", () => {
    it("should validate that result type matches category schema", async () => {
      const mockResponse = {
        businessProcesses: [{ name: "Order Processing", description: "Process orders" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await strategy.generateInsights("businessProcesses", [
        "* file1.ts: implementation",
      ]);

      // This demonstrates compile-time type checking
      if (result) {
        // Should compile without any type assertions
        const categoryData = result.businessProcesses;
        expect(categoryData).toBeDefined();
        expect(categoryData[0].name).toBe("Order Processing");
      }
    });

    it("should demonstrate type inference works for all supported categories", () => {
      // Compile-time validation that all categories have proper type support
      type ValidCategories = AppSummaryCategoryEnum;

      const allCategories: ValidCategories[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "aggregates",
        "entities",
        "repositories",
        "potentialMicroservices",
      ];

      // This should compile, demonstrating that TypeScript understands all category types
      expect(allCategories.length).toBe(8);
    });
  });

  describe("reducePartialInsights type safety improvements", () => {
    it("should maintain strong typing in reduce operation without unsafe casts", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: {
          primaryCompletion: {
            maxTotalTokens: 100,
          },
        },
      });
      strategy = new MapReduceCompletionStrategy(mockLLMRouter);

      // Create long summary strings to force chunking
      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      // Create multiple partial results to test the reduce operation
      const partialResult1 = {
        entities: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };
      const partialResult2 = {
        entities: [
          { name: "Product", description: "Product entity" },
          { name: "Category", description: "Category entity" },
        ],
      };
      const consolidatedResult = {
        entities: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
          { name: "Product", description: "Product entity" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(partialResult1) // Map phase chunk 1
        .mockResolvedValueOnce(partialResult2) // Map phase chunk 2
        .mockResolvedValueOnce(consolidatedResult); // Reduce phase

      const result = await strategy.generateInsights("entities", [longSummary1, longSummary2]);

      // Verify the reduce operation properly consolidated the results
      if (result) {
        // TypeScript should infer this without any casts
        expect(result.entities).toBeDefined();
        expect(result.entities.length).toBe(3);
        expect(result.entities[0].name).toBe("User");
        expect(result.entities[2].name).toBe("Product");
      }
    });

    it("should correctly type categoryKey as keyof CategoryInsightResult", async () => {
      const mockMapResponse = {
        technologies: [
          { name: "TypeScript", version: "5.7.3" },
          { name: "Node.js", version: "20.0.0" },
        ],
      };
      const mockReduceResponse = {
        technologies: [
          { name: "TypeScript", version: "5.7.3" },
          { name: "Node.js", version: "20.0.0" },
          { name: "MongoDB", version: "7.0" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockMapResponse)
        .mockResolvedValueOnce(mockReduceResponse);

      const result = await strategy.generateInsights("technologies", [
        "* file1.ts: implementation",
      ]);

      // The improved typing should allow direct access without casts
      if (result) {
        expect(result.technologies).toBeDefined();
        expect(result.technologies.length).toBe(3);
        // Should be able to access properties without type assertions
        expect(result.technologies[0].name).toBe("TypeScript");
        expect(result.technologies[2].name).toBe("MongoDB");
      }
    });

    it("should handle complex nested structures without type loss", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: {
          primaryCompletion: {
            maxTotalTokens: 100,
          },
        },
      });
      strategy = new MapReduceCompletionStrategy(mockLLMRouter);

      // Create long summary strings to force chunking
      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
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
      const partialResult2 = {
        potentialMicroservices: [
          {
            name: "OrderService",
            description: "Handles order processing",
            entities: [{ name: "Order", description: "Order entity" }],
            endpoints: [{ path: "/orders", method: "GET", description: "Get orders" }],
            operations: [{ operation: "CreateOrder", method: "POST", description: "Create order" }],
          },
        ],
      };
      const consolidatedResult = {
        potentialMicroservices: [
          {
            name: "UserService",
            description: "Handles user management",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/users", method: "GET", description: "Get users" }],
            operations: [{ operation: "CreateUser", method: "POST", description: "Create user" }],
          },
          {
            name: "OrderService",
            description: "Handles order processing",
            entities: [{ name: "Order", description: "Order entity" }],
            endpoints: [{ path: "/orders", method: "GET", description: "Get orders" }],
            operations: [{ operation: "CreateOrder", method: "POST", description: "Create order" }],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(partialResult1)
        .mockResolvedValueOnce(partialResult2)
        .mockResolvedValueOnce(consolidatedResult);

      const result = await strategy.generateInsights("potentialMicroservices", [
        longSummary1,
        longSummary2,
      ]);

      // Verify complex nested structures maintain their types through the reduce operation
      if (result) {
        expect(result.potentialMicroservices).toBeDefined();
        expect(result.potentialMicroservices.length).toBe(2);
        // Direct property access without type assertions
        expect(result.potentialMicroservices[0].name).toBe("UserService");
        expect(result.potentialMicroservices[0].entities[0].name).toBe("User");
        expect(result.potentialMicroservices[0].endpoints[0].path).toBe("/users");
        expect(result.potentialMicroservices[1].operations[0].operation).toBe("CreateOrder");
      }
    });

    it("should handle aggregates with entity arrays and repository strings", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: {
          primaryCompletion: {
            maxTotalTokens: 100,
          },
        },
      });
      strategy = new MapReduceCompletionStrategy(mockLLMRouter);

      // Create long summary strings to force chunking
      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        aggregates: [
          {
            name: "OrderAggregate",
            description: "Order aggregate root",
            entities: ["Order", "OrderItem"],
            repository: "OrderRepository",
          },
        ],
      };
      const partialResult2 = {
        aggregates: [
          {
            name: "UserAggregate",
            description: "User aggregate root",
            entities: ["User", "UserProfile"],
            repository: "UserRepository",
          },
        ],
      };
      const consolidatedResult = {
        aggregates: [
          {
            name: "OrderAggregate",
            description: "Order aggregate root",
            entities: ["Order", "OrderItem"],
            repository: "OrderRepository",
          },
          {
            name: "UserAggregate",
            description: "User aggregate root",
            entities: ["User", "UserProfile"],
            repository: "UserRepository",
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(partialResult1)
        .mockResolvedValueOnce(partialResult2)
        .mockResolvedValueOnce(consolidatedResult);

      const result = await strategy.generateInsights("aggregates", [longSummary1, longSummary2]);

      // Verify strongly-typed nested arrays and properties
      if (result) {
        expect(result.aggregates).toBeDefined();
        expect(result.aggregates.length).toBe(2);
        expect(result.aggregates[0].entities).toEqual(["Order", "OrderItem"]);
        expect(result.aggregates[0].repository).toBe("OrderRepository");
        expect(result.aggregates[1].entities).toEqual(["User", "UserProfile"]);
      }
    });

    it("should properly handle empty arrays from partial results", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: {
          primaryCompletion: {
            maxTotalTokens: 100,
          },
        },
      });
      strategy = new MapReduceCompletionStrategy(mockLLMRouter);

      // Create long summary strings to force chunking
      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        entities: [{ name: "User", description: "User entity" }],
      };
      const partialResult2 = {
        entities: [] as { name: string; description: string; relatedEntities?: string[] }[],
      };
      const consolidatedResult = {
        entities: [{ name: "User", description: "User entity" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(partialResult1)
        .mockResolvedValueOnce(partialResult2)
        .mockResolvedValueOnce(consolidatedResult);

      const result = await strategy.generateInsights("entities", [longSummary1, longSummary2]);

      // Verify empty arrays are handled correctly without type errors
      if (result) {
        expect(result.entities).toBeDefined();
        expect(result.entities.length).toBe(1);
      }
    });

    it("should maintain type safety for repositories with aggregate relationships", async () => {
      const partialResult = {
        repositories: [
          {
            name: "UserRepository",
            description: "User repository for persistence",
            aggregate: "UserAggregate",
          },
          {
            name: "OrderRepository",
            description: "Order repository for persistence",
            aggregate: "OrderAggregate",
          },
        ],
      };
      const consolidatedResult = {
        repositories: [
          {
            name: "UserRepository",
            description: "User repository for persistence",
            aggregate: "UserAggregate",
          },
          {
            name: "OrderRepository",
            description: "Order repository for persistence",
            aggregate: "OrderAggregate",
          },
          {
            name: "ProductRepository",
            description: "Product repository for persistence",
            aggregate: "ProductAggregate",
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(partialResult)
        .mockResolvedValueOnce(consolidatedResult);

      const result = await strategy.generateInsights("repositories", [
        "* file1.ts: implementation",
      ]);

      // Verify repository-specific properties are strongly typed
      if (result) {
        expect(result.repositories).toBeDefined();
        expect(result.repositories[0].aggregate).toBe("UserAggregate");
        expect(result.repositories[2].aggregate).toBe("ProductAggregate");
      }
    });
  });
});
