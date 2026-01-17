import { executeInsightCompletion } from "../../../../../src/app/components/insights/strategies/insights-completion-executor";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import {
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../../../../../src/app/components/insights/insights.types";
import { z } from "zod";
import { ok, err } from "../../../../../src/common/types/result.types";
import { LLMError, LLMErrorCode } from "../../../../../src/common/llm/types/llm-errors.types";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../../../src/app/prompts/app-templates";

/**
 * Test suite to verify type inference improvements in completion-executor.ts
 *
 * This validates that the removal of the redundant type cast allows proper
 * type inference from the LLM router, addressing the issue identified in
 * requirement23.result.
 */
describe("completion-executor type inference improvements", () => {
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLLMRouter = {
      executeCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;
  });

  describe("type inference without explicit casts", () => {
    it("should infer correct type for appDescription category", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const mockResponse = {
        appDescription: "A comprehensive application for managing user data",
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: User management"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Type should be inferred without explicit cast
      expect(result).not.toBeNull();
      if (result) {
        // No cast needed - type is inferred from schema
        const typed: z.infer<AppSummaryCategorySchemas["appDescription"]> = result;
        expect(typed.appDescription).toBe("A comprehensive application for managing user data");
      }
    });

    it("should infer correct type for technologies category", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [
          { name: "TypeScript", description: "Typed JavaScript" },
          { name: "React", description: "UI library" },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).not.toBeNull();
      if (result) {
        // Type inference should work for array types
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(typed.technologies).toHaveLength(2);
        expect(typed.technologies[0].name).toBe("TypeScript");
        expect(typed.technologies[1].description).toBe("UI library");
      }
    });

    it("should infer correct type for entities category", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [
          { name: "User", description: "User entity with profile data" },
          { name: "Order", description: "Order entity with transaction details" },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Entity definitions"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).not.toBeNull();
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(Array.isArray(typed.technologies)).toBe(true);
        expect(typed.technologies[0].name).toBe("User");
        expect(typed.technologies[1].name).toBe("Order");
      }
    });

    it("should infer correct type for boundedContexts category", async () => {
      const category: AppSummaryCategoryEnum = "boundedContexts";
      const mockResponse = {
        boundedContexts: [
          {
            name: "User Management",
            description: "Handles user authentication and profiles",
            responsibilities: ["Authentication", "User profiles", "Permissions"],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Context implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).not.toBeNull();
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["boundedContexts"]> = result;
        expect(typed.boundedContexts[0].name).toBe("User Management");
        expect(typed.boundedContexts[0].responsibilities).toHaveLength(3);
      }
    });

    it("should infer correct type for businessProcesses category", async () => {
      const category: AppSummaryCategoryEnum = "businessProcesses";
      const mockResponse = {
        businessProcesses: [
          { name: "User Registration", description: "New user signup flow" },
          { name: "Order Processing", description: "Handle customer orders" },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Process flows"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).not.toBeNull();
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["businessProcesses"]> = result;
        expect(typed.businessProcesses).toHaveLength(2);
        expect(typed.businessProcesses[0].name).toBe("User Registration");
      }
    });

    it("should infer correct type for boundedContexts category", async () => {
      const category: AppSummaryCategoryEnum = "boundedContexts";
      const mockResponse = {
        boundedContexts: [
          {
            name: "UserContext",
            description: "User bounded context",
            aggregates: [
              {
                name: "UserAggregate",
                description: "Aggregates user-related entities",
                repository: { name: "UserRepository", description: "User repository" },
                entities: [{ name: "User", description: "User entity" }],
              },
            ],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Aggregate roots"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).not.toBeNull();
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["boundedContexts"]> = result;
        expect(typed.boundedContexts[0].name).toBe("UserContext");
      }
    });

    it("should infer correct type for businessProcesses category", async () => {
      const category: AppSummaryCategoryEnum = "businessProcesses";
      const mockResponse = {
        businessProcesses: [
          {
            name: "UserRegistration",
            description: "Handles user registration",
            keyBusinessActivities: [],
          },
          {
            name: "OrderProcessing",
            description: "Handles order processing",
            keyBusinessActivities: [],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Business process implementations"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).not.toBeNull();
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["businessProcesses"]> = result;
        expect(typed.businessProcesses).toHaveLength(2);
        expect(typed.businessProcesses[0].name).toBe("UserRegistration");
      }
    });

    it("should infer correct type for potentialMicroservices category", async () => {
      const category: AppSummaryCategoryEnum = "potentialMicroservices";
      const mockResponse = {
        potentialMicroservices: [
          { name: "AuthService", description: "Authentication microservice" },
          { name: "OrderService", description: "Order processing microservice" },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Service boundaries"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).not.toBeNull();
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["potentialMicroservices"]> = result;
        expect(typed.potentialMicroservices).toHaveLength(2);
        expect(typed.potentialMicroservices[0].name).toBe("AuthService");
      }
    });
  });

  describe("type safety through call chain", () => {
    it("should preserve type information from LLM router to caller", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [{ name: "Node.ts", description: "JavaScript runtime" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      // Call executeInsightCompletion
      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Verify the call to LLM router used correct schema
      const schema = appSummaryCategorySchemas[category];
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        category,
        expect.any(String),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
          hasComplexSchema: false,
          sanitizerConfig: expect.any(Object),
        }),
      );

      // Result should be properly typed
      expect(result).not.toBeNull();
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(typed.technologies[0].name).toBe("Node.ts");
      }
    });

    it("should not require explicit casts when assigning to typed variables", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const mockResponse = { appDescription: "Test application" };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Direct assignment without cast
      if (result) {
        const description: string = result.appDescription;
        expect(description).toBe("Test application");
      }
    });

    it("should support destructuring without explicit casts", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [
          { name: "User", description: "User entity" },
          { name: "Order", description: "Order entity" },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Entities"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Destructuring should work without casts
      if (result) {
        const { technologies } = result;
        expect(technologies).toHaveLength(2);
        expect(technologies[0].name).toBe("User");
      }
    });
  });

  describe("null handling with type safety", () => {
    it("should return null with correct type when LLM returns err", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";

      mockLLMRouter.executeCompletion = jest
        .fn()
        .mockResolvedValue(err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "No response")));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Result type should be inferred union type | null
      expect(result).toBeNull();

      // Type check should work
      if (result === null) {
        expect(result).toBeNull();
      } else {
        // This branch should not execute
        expect(false).toBe(true);
      }
    });

    it("should return null with correct type when LLM throws error", async () => {
      const category: AppSummaryCategoryEnum = "technologies";

      mockLLMRouter.executeCompletion = jest.fn().mockRejectedValue(new Error("LLM error"));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      expect(result).toBeNull();
    });
  });

  describe("options handling with type inference", () => {
    it("should preserve types when using custom taskCategory", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const customTaskCategory = "custom-tech-analysis";
      const mockResponse = {
        technologies: [{ name: "TypeScript", description: "Typed JS" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE, taskCategory: customTaskCategory },
      );

      // Verify custom category was used
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        customTaskCategory,
        expect.any(String),
        expect.any(Object),
      );

      // Type should still be inferred correctly
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(typed.technologies[0].name).toBe("TypeScript");
      }
    });

    it("should preserve types when using PARTIAL_ANALYSIS_TEMPLATE", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [{ name: "Entity1", description: "Description" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: PARTIAL_ANALYSIS_TEMPLATE },
      );

      // Type should be preserved regardless of options
      if (result) {
        const typed: z.infer<AppSummaryCategorySchemas["technologies"]> = result;
        expect(typed.technologies[0].name).toBe("Entity1");
      }
    });
  });

  describe("generic type parameter inference", () => {
    it("should correctly infer generic type parameter C from category argument", async () => {
      // This test validates that the generic type C is correctly inferred
      // from the category argument and used for return type inference

      async function testCategoryInference<C extends AppSummaryCategoryEnum>(
        cat: C,
        mockResp: z.infer<AppSummaryCategorySchemas[C]>,
      ): Promise<void> {
        mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResp));

        const result = await executeInsightCompletion(
          mockLLMRouter,
          cat,
          ["* file1.ts: Implementation"],
          { template: ANALYSIS_PROMPT_TEMPLATE },
        );

        if (result) {
          // Type should be inferred as z.infer<AppSummaryCategorySchemas[C]>
          const typed: z.infer<AppSummaryCategorySchemas[C]> = result;
          expect(typed).toEqual(mockResp);
        }
      }

      // Test with different categories
      await testCategoryInference("appDescription", {
        appDescription: "Test",
      });

      await testCategoryInference("technologies", {
        technologies: [{ name: "Tech", description: "Desc" }],
      });

      await testCategoryInference("technologies", {
        technologies: [{ name: "Entity", description: "Desc" }],
      });
    });

    it("should maintain type safety with literal category types", async () => {
      // Use literal type instead of enum member
      const category = "technologies" as const;
      const mockResponse = {
        technologies: [{ name: "TypeScript", description: "Typed JS" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      if (result) {
        // Type should be inferred from the literal type
        const typed: z.infer<(typeof appSummaryCategorySchemas)["technologies"]> = result;
        expect(typed.technologies[0].name).toBe("TypeScript");
      }
    });
  });

  describe("regression tests for type cast removal", () => {
    it("should not require cast for simple property access", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const mockResponse = { appDescription: "Description text" };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Direct property access without cast
      if (result) {
        const desc: string = result.appDescription;
        expect(desc).toBe("Description text");
      }
    });

    it("should not require cast for array access", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [{ name: "Tech1", description: "Desc1" }],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Array access without cast
      if (result) {
        const firstTech = result.technologies[0];
        expect(firstTech.name).toBe("Tech1");
        expect(typeof firstTech.description).toBe("string");
      }
    });

    it("should not require cast for nested property access", async () => {
      const category: AppSummaryCategoryEnum = "boundedContexts";
      const mockResponse = {
        boundedContexts: [
          {
            name: "Context1",
            description: "Description",
            responsibilities: ["Resp1", "Resp2"],
          },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Nested access without cast
      if (result) {
        const responsibilities = result.boundedContexts[0].responsibilities;
        expect(Array.isArray(responsibilities)).toBe(true);
        expect(responsibilities).toHaveLength(2);
      }
    });

    it("should work with spread operator without casts", async () => {
      const category: AppSummaryCategoryEnum = "technologies";
      const mockResponse = {
        technologies: [
          { name: "Entity1", description: "Desc1" },
          { name: "Entity2", description: "Desc2" },
        ],
      };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Spread operator should work without cast
      if (result) {
        const entityNames = result.technologies.map((e) => e.name);
        expect(entityNames).toEqual(["Entity1", "Entity2"]);

        const spreadEntities = [...result.technologies];
        expect(spreadEntities).toHaveLength(2);
      }
    });

    it("should work with Object methods without casts", async () => {
      const category: AppSummaryCategoryEnum = "appDescription";
      const mockResponse = { appDescription: "Test description" };

      mockLLMRouter.executeCompletion = jest.fn().mockResolvedValue(ok(mockResponse));

      const result = await executeInsightCompletion(
        mockLLMRouter,
        category,
        ["* file1.ts: Implementation"],
        { template: ANALYSIS_PROMPT_TEMPLATE },
      );

      // Object methods should work without cast
      if (result) {
        const keys = Object.keys(result);
        expect(keys).toContain("appDescription");

        const hasProperty = Object.prototype.hasOwnProperty.call(result, "appDescription");
        expect(hasProperty).toBe(true);
      }
    });
  });
});
