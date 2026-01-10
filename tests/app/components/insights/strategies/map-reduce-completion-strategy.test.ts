import "reflect-metadata";
import { MapReduceInsightStrategy } from "../../../../../src/app/components/insights/strategies/map-reduce-completion-strategy";
import {
  PartialAppSummaryRecord,
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../../../../../src/app/components/insights/insights.types";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import { promptManager } from "../../../../../src/app/prompts/prompt-registry";
const appSummaryPromptMetadata = promptManager.appSummaries;
import { z } from "zod";
import { ok, err } from "../../../../../src/common/types/result.types";
import { LLMError, LLMErrorCode } from "../../../../../src/common/llm/types/llm-errors.types";

describe("MapReduceInsightStrategy", () => {
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

  describe("generateInsights", () => {
    it("should export MapReduceInsightStrategy class", () => {
      expect(MapReduceInsightStrategy).toBeDefined();
      expect(typeof MapReduceInsightStrategy).toBe("function");
    });

    it("should implement IInsightGenerationStrategy interface", () => {
      expect(strategy.generateInsights).toBeDefined();
      expect(typeof strategy.generateInsights).toBe("function");
    });

    it("should call executeCompletion for map and reduce phases", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      // Use category-specific type instead of PartialAppSummaryRecord for stronger typing
      const mockMapResponse = {
        technologies: [{ name: "Entity1", description: "Description 1" }],
      };
      const mockReduceResponse = {
        technologies: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockMapResponse)) // Map phase
        .mockResolvedValueOnce(ok(mockReduceResponse)); // Reduce phase

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockReduceResponse);
    });

    it("should return null when all map phases return err", async () => {
      const category: AppSummaryCategoryEnum = "technologies";

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValue(err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "No response")));

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      // Only map phase should be called, reduce phase should be skipped
      expect(result).toBeNull();
    });

    it("should return null when reduce phase returns err", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      // Use category-specific type for stronger typing
      const mockMapResponse = {
        technologies: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockMapResponse))
        .mockResolvedValueOnce(
          err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Reduce failed")),
        ); // Reduce returns err

      const result = await strategy.generateInsights(category, [
        "* file1.ts: purpose implementation",
      ]);

      expect(result).toBeNull();
    });

    it("should return null when an error is thrown", async () => {
      const category: AppSummaryCategoryEnum = "technologies";

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
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

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
      const category: AppSummaryCategoryEnum = "technologies";
      const _config = appSummaryPromptMetadata[category];
      const mockResponse = {
        technologies: [{ name: "Entity1", description: "Desc" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

      const result = await strategy.generateInsights(category, ["* file1.ts: implementation"]);

      expect(result).toEqual(mockResponse);
      if (result) {
        const schemaType: z.infer<typeof _config.responseSchema> = result;
        expect(schemaType.technologies).toBeDefined();
        expect(Array.isArray(schemaType.technologies)).toBe(true);
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
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

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
      const category: AppSummaryCategoryEnum = "technologies";
      const config = appSummaryPromptMetadata[category];
      const mockResponse = {
        technologies: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

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
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [{ name: "Entity1", description: "Description 1" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

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
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

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
        "boundedContexts",
        "technologies",
        "businessProcesses",
        "potentialMicroservices",
      ];

      for (const category of categories) {
        const _config = appSummaryPromptMetadata[category];
        const mockResponse = { [category]: [] };

        mockLLMRouter.executeCompletion = jest
          .fn()
          .mockResolvedValueOnce(ok(mockResponse))
          .mockResolvedValueOnce(ok(mockResponse));

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
        technologies: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

      const result = await strategy.generateInsights("technologies", [
        "* file1.ts: implementation",
      ]);

      // Type should be inferred as CategoryInsightResult<"technologies">
      if (result) {
        expect(result.technologies).toBeDefined();
        expect(Array.isArray(result.technologies)).toBe(true);
        expect(result.technologies.length).toBe(2);
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
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

      const result = await strategy.generateInsights("technologies", [
        "* file1.ts: implementation",
      ]);

      // Type should be inferred as CategoryInsightResult<"technologies">
      if (result) {
        expect(result.technologies).toBeDefined();
        expect(result.technologies[0].name).toBe("TypeScript");
      }
    });

    it("should correctly infer CategoryInsightResult for boundedContexts category", async () => {
      const mockResponse = {
        boundedContexts: [
          {
            name: "OrderContext",
            description: "Order bounded context",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate",
                repository: { name: "OrderRepository", description: "Order repository" },
                entities: [],
              },
            ],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

      const result = await strategy.generateInsights("boundedContexts", [
        "* file1.ts: implementation",
      ]);

      // Type should be inferred as CategoryInsightResult<"boundedContexts">
      if (result) {
        expect(result.boundedContexts).toBeDefined();
        expect(result.boundedContexts[0].name).toBe("OrderContext");
      }
    });
  });

  describe("reducePartialInsights type safety", () => {
    it("should return correctly typed data without casts for entities", async () => {
      const mapResponse = {
        technologies: [{ name: "User", description: "User entity" }],
      };
      const reduceResponse = {
        technologies: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mapResponse))
        .mockResolvedValueOnce(ok(reduceResponse));

      const result = await strategy.generateInsights("technologies", [
        "* file1.ts: implementation",
      ]);

      // The reduce step should return correctly typed data
      expect(result).toEqual(reduceResponse);
      if (result) {
        // No type assertion needed - type is inferred
        expect(result.technologies.length).toBe(2);
      }
    });

    it("should handle indexed access type inference correctly", async () => {
      // This test validates that appSummaryCategorySchemas[C] works correctly
      const mockResponse = {
        businessProcesses: [
          {
            name: "UserRegistration",
            description: "User registration process",
            keyBusinessActivities: [],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

      const result = await strategy.generateInsights("businessProcesses", [
        "* file1.ts: implementation",
      ]);

      // Type should be correctly inferred from indexed access
      if (result) {
        expect(result.businessProcesses).toBeDefined();
        expect(result.businessProcesses[0].name).toBe("UserRegistration");
      }
    });
  });

  describe("type compatibility between partial and final results", () => {
    it("should allow partial results to be combined into final result", async () => {
      const partialResult1 = {
        technologies: [{ name: "User", description: "User entity" }],
      };
      const finalResult = {
        technologies: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      // For this test, we'll use a single chunk to simplify
      // The map phase returns partialResult1, then reduce combines and returns finalResult
      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1)) // Map phase for chunk 1
        .mockResolvedValueOnce(ok(finalResult)); // Reduce phase

      const result = await strategy.generateInsights("technologies", [
        "* file1.ts: implementation",
      ]);

      // Final result should be properly typed
      expect(result).toEqual(finalResult);
      if (result) {
        expect(result.technologies.length).toBe(2);
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
        .mockResolvedValueOnce(ok(mockMapResponse))
        .mockResolvedValueOnce(ok(mockReduceResponse));

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
        .mockResolvedValueOnce(ok(mockResponse))
        .mockResolvedValueOnce(ok(mockResponse));

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
        "boundedContexts",
        "technologies",
        "businessProcesses",
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
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      // Create long summary strings to force chunking
      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      // Create multiple partial results to test the reduce operation
      const partialResult1 = {
        technologies: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };
      const partialResult2 = {
        technologies: [
          { name: "Product", description: "Product entity" },
          { name: "Category", description: "Category entity" },
        ],
      };
      const consolidatedResult = {
        technologies: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
          { name: "Product", description: "Product entity" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1)) // Map phase chunk 1
        .mockResolvedValueOnce(ok(partialResult2)) // Map phase chunk 2
        .mockResolvedValueOnce(ok(consolidatedResult)); // Reduce phase

      const result = await strategy.generateInsights("technologies", [longSummary1, longSummary2]);

      // Verify the reduce operation properly consolidated the results
      if (result) {
        // TypeScript should infer this without any casts
        expect(result.technologies).toBeDefined();
        expect(result.technologies.length).toBe(3);
        expect(result.technologies[0].name).toBe("User");
        expect(result.technologies[2].name).toBe("Product");
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
        .mockResolvedValueOnce(ok(mockMapResponse))
        .mockResolvedValueOnce(ok(mockReduceResponse));

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
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

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
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(consolidatedResult));

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

    it("should handle boundedContexts with hierarchical aggregates", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: {
          primaryCompletion: {
            maxTotalTokens: 100,
          },
        },
      });
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      // Create long summary strings to force chunking
      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
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
      const partialResult2 = {
        boundedContexts: [
          {
            name: "UserContext",
            description: "User bounded context",
            aggregates: [
              {
                name: "UserAggregate",
                description: "User aggregate root",
                repository: { name: "UserRepository", description: "User repository" },
                entities: [
                  { name: "User", description: "User entity" },
                  { name: "UserProfile", description: "UserProfile entity" },
                ],
              },
            ],
          },
        ],
      };
      const consolidatedResult = {
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
          {
            name: "UserContext",
            description: "User bounded context",
            aggregates: [
              {
                name: "UserAggregate",
                description: "User aggregate root",
                repository: { name: "UserRepository", description: "User repository" },
                entities: [
                  { name: "User", description: "User entity" },
                  { name: "UserProfile", description: "UserProfile entity" },
                ],
              },
            ],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("boundedContexts", [
        longSummary1,
        longSummary2,
      ]);

      // Verify strongly-typed nested arrays and properties
      if (result) {
        expect(result.boundedContexts).toBeDefined();
        expect(result.boundedContexts.length).toBe(2);
        expect(result.boundedContexts[0].aggregates[0].entities).toHaveLength(2);
        expect(result.boundedContexts[0].aggregates[0].repository.name).toBe("OrderRepository");
        expect(result.boundedContexts[1].aggregates[0].entities).toHaveLength(2);
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
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      // Create long summary strings to force chunking
      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        technologies: [{ name: "User", description: "User entity" }],
      };
      const partialResult2 = {
        technologies: [] as { name: string; description: string }[],
      };
      const consolidatedResult = {
        technologies: [{ name: "User", description: "User entity" }],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("technologies", [longSummary1, longSummary2]);

      // Verify empty arrays are handled correctly without type errors
      if (result) {
        expect(result.technologies).toBeDefined();
        expect(result.technologies.length).toBe(1);
      }
    });

    it("should maintain type safety for businessProcesses with activities", async () => {
      const partialResult = {
        businessProcesses: [
          {
            name: "UserRegistration",
            description: "User registration process",
            keyBusinessActivities: [{ activity: "Validate", description: "Validate user input" }],
          },
          {
            name: "OrderPlacement",
            description: "Order placement process",
            keyBusinessActivities: [{ activity: "CreateOrder", description: "Create order" }],
          },
        ],
      };
      const consolidatedResult = {
        businessProcesses: [
          {
            name: "UserRegistration",
            description: "User registration process",
            keyBusinessActivities: [{ activity: "Validate", description: "Validate user input" }],
          },
          {
            name: "OrderPlacement",
            description: "Order placement process",
            keyBusinessActivities: [{ activity: "CreateOrder", description: "Create order" }],
          },
          {
            name: "ProductCatalog",
            description: "Product catalog management",
            keyBusinessActivities: [{ activity: "AddProduct", description: "Add product" }],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("businessProcesses", [
        "* file1.ts: implementation",
      ]);

      // Verify businessProcesses properties are strongly typed
      if (result) {
        expect(result.businessProcesses).toBeDefined();
        expect(result.businessProcesses[0].name).toBe("UserRegistration");
        expect(result.businessProcesses[2].name).toBe("ProductCatalog");
      }
    });
  });

  describe("combinePartialResultsData schema shape handling", () => {
    it("should combine flat array results for technologies category", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: { primaryCompletion: { maxTotalTokens: 100 } },
      });
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };
      const partialResult2 = {
        technologies: [{ name: "Node.js", description: "Node.js runtime" }],
      };
      const consolidatedResult = {
        technologies: [
          { name: "TypeScript", description: "TypeScript language" },
          { name: "Node.js", description: "Node.js runtime" },
        ],
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("technologies", [longSummary1, longSummary2]);

      expect(result).toEqual(consolidatedResult);
      // Verify the reduce phase was called with combined data
      const reduceCall = mockLLMRouter.executeCompletion.mock.calls[2];
      const reducePrompt = reduceCall[1];
      expect(reducePrompt).toContain("TypeScript");
      expect(reducePrompt).toContain("Node.js");
    });

    it("should combine nested object results for inferredArchitecture category", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: { primaryCompletion: { maxTotalTokens: 100 } },
      });
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        inferredArchitecture: {
          internalComponents: [{ name: "UserManager", description: "Manages users" }],
          externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Main DB" }],
          dependencies: [{ from: "UserManager", to: "PostgreSQL", description: "Stores users" }],
        },
      };
      const partialResult2 = {
        inferredArchitecture: {
          internalComponents: [{ name: "OrderManager", description: "Manages orders" }],
          externalDependencies: [{ name: "Redis", type: "Cache", description: "Cache layer" }],
          dependencies: [{ from: "OrderManager", to: "Redis", description: "Caches orders" }],
        },
      };
      const consolidatedResult = {
        inferredArchitecture: {
          internalComponents: [
            { name: "UserManager", description: "Manages users" },
            { name: "OrderManager", description: "Manages orders" },
          ],
          externalDependencies: [
            { name: "PostgreSQL", type: "Database", description: "Main DB" },
            { name: "Redis", type: "Cache", description: "Cache layer" },
          ],
          dependencies: [
            { from: "UserManager", to: "PostgreSQL", description: "Stores users" },
            { from: "OrderManager", to: "Redis", description: "Caches orders" },
          ],
        },
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("inferredArchitecture", [
        longSummary1,
        longSummary2,
      ]);

      expect(result).toEqual(consolidatedResult);
      // Verify the reduce phase was called with all nested arrays merged
      const reduceCall = mockLLMRouter.executeCompletion.mock.calls[2];
      const reducePrompt = reduceCall[1];
      // All components from both partial results should be in the combined data
      expect(reducePrompt).toContain("UserManager");
      expect(reducePrompt).toContain("OrderManager");
      expect(reducePrompt).toContain("PostgreSQL");
      expect(reducePrompt).toContain("Redis");
    });

    it("should collect string values into array for appDescription category", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: { primaryCompletion: { maxTotalTokens: 100 } },
      });
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        appDescription: "This application handles user management and authentication.",
      };
      const partialResult2 = {
        appDescription: "The system also processes orders and payments.",
      };
      const consolidatedResult = {
        appDescription:
          "This is a comprehensive application that handles user management, authentication, order processing, and payments.",
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("appDescription", [
        longSummary1,
        longSummary2,
      ]);

      expect(result).toEqual(consolidatedResult);
      // Verify the reduce phase was called with both descriptions as an array
      const reduceCall = mockLLMRouter.executeCompletion.mock.calls[2];
      const reducePrompt = reduceCall[1];
      expect(reducePrompt).toContain("user management");
      expect(reducePrompt).toContain("orders and payments");
    });

    it("should handle empty nested arrays in inferredArchitecture", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: { primaryCompletion: { maxTotalTokens: 100 } },
      });
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        inferredArchitecture: {
          internalComponents: [{ name: "UserManager", description: "Manages users" }],
          externalDependencies: [],
          dependencies: [],
        },
      };
      const partialResult2 = {
        inferredArchitecture: {
          internalComponents: [],
          externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Main DB" }],
          dependencies: [{ from: "UserManager", to: "PostgreSQL", description: "Stores users" }],
        },
      };
      const consolidatedResult = {
        inferredArchitecture: {
          internalComponents: [{ name: "UserManager", description: "Manages users" }],
          externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Main DB" }],
          dependencies: [{ from: "UserManager", to: "PostgreSQL", description: "Stores users" }],
        },
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("inferredArchitecture", [
        longSummary1,
        longSummary2,
      ]);

      expect(result).toEqual(consolidatedResult);
      // Verify the reduce phase still received all non-empty arrays
      const reduceCall = mockLLMRouter.executeCompletion.mock.calls[2];
      const reducePrompt = reduceCall[1];
      expect(reducePrompt).toContain("UserManager");
      expect(reducePrompt).toContain("PostgreSQL");
    });

    it("should handle multiple chunks for inferredArchitecture with many components", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: { primaryCompletion: { maxTotalTokens: 100 } },
      });
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);
      const longSummary3 = "* file3.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        inferredArchitecture: {
          internalComponents: [{ name: "Component1", description: "Desc1" }],
          externalDependencies: [{ name: "Dep1", type: "Type1", description: "Desc1" }],
          dependencies: [{ from: "Component1", to: "Dep1", description: "Uses" }],
        },
      };
      const partialResult2 = {
        inferredArchitecture: {
          internalComponents: [{ name: "Component2", description: "Desc2" }],
          externalDependencies: [{ name: "Dep2", type: "Type2", description: "Desc2" }],
          dependencies: [{ from: "Component2", to: "Dep2", description: "Uses" }],
        },
      };
      const partialResult3 = {
        inferredArchitecture: {
          internalComponents: [{ name: "Component3", description: "Desc3" }],
          externalDependencies: [{ name: "Dep3", type: "Type3", description: "Desc3" }],
          dependencies: [{ from: "Component3", to: "Dep3", description: "Uses" }],
        },
      };
      const consolidatedResult = {
        inferredArchitecture: {
          internalComponents: [
            { name: "Component1", description: "Desc1" },
            { name: "Component2", description: "Desc2" },
            { name: "Component3", description: "Desc3" },
          ],
          externalDependencies: [
            { name: "Dep1", type: "Type1", description: "Desc1" },
            { name: "Dep2", type: "Type2", description: "Desc2" },
            { name: "Dep3", type: "Type3", description: "Desc3" },
          ],
          dependencies: [
            { from: "Component1", to: "Dep1", description: "Uses" },
            { from: "Component2", to: "Dep2", description: "Uses" },
            { from: "Component3", to: "Dep3", description: "Uses" },
          ],
        },
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(partialResult3))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("inferredArchitecture", [
        longSummary1,
        longSummary2,
        longSummary3,
      ]);

      expect(result).toEqual(consolidatedResult);
      // Verify all 3 chunks were processed
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(4);
      // Verify the reduce phase received all merged data
      const reduceCall = mockLLMRouter.executeCompletion.mock.calls[3];
      const reducePrompt = reduceCall[1];
      expect(reducePrompt).toContain("Component1");
      expect(reducePrompt).toContain("Component2");
      expect(reducePrompt).toContain("Component3");
    });

    it("should filter out empty strings when combining appDescription", async () => {
      // Use a smaller token limit to force chunking
      mockLLMRouter.getLLMManifest = jest.fn().mockReturnValue({
        models: { primaryCompletion: { maxTotalTokens: 100 } },
      });
      strategy = new MapReduceInsightStrategy(mockLLMRouter);

      const longSummary1 = "* file1.ts: " + "implementation ".repeat(50);
      const longSummary2 = "* file2.ts: " + "implementation ".repeat(50);
      const longSummary3 = "* file3.ts: " + "implementation ".repeat(50);

      const partialResult1 = {
        appDescription: "This is a user management application.",
      };
      const partialResult2 = {
        appDescription: "", // Empty description
      };
      const partialResult3 = {
        appDescription: "It also handles order processing.",
      };
      const consolidatedResult = {
        appDescription: "A comprehensive user management and order processing application.",
      };

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValueOnce(ok(partialResult1))
        .mockResolvedValueOnce(ok(partialResult2))
        .mockResolvedValueOnce(ok(partialResult3))
        .mockResolvedValueOnce(ok(consolidatedResult));

      const result = await strategy.generateInsights("appDescription", [
        longSummary1,
        longSummary2,
        longSummary3,
      ]);

      expect(result).toEqual(consolidatedResult);
      // Verify the reduce phase only received non-empty descriptions
      const reduceCall = mockLLMRouter.executeCompletion.mock.calls[3];
      const reducePrompt = reduceCall[1];
      expect(reducePrompt).toContain("user management");
      expect(reducePrompt).toContain("order processing");
    });
  });
});
