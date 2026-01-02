import "reflect-metadata";
import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { z } from "zod";
import InsightsFromRawCodeGenerator from "../../../../../src/app/components/insights/generators/raw-code-insights-generator";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import type { AppSummariesRepository } from "../../../../../src/app/repositories/app-summaries/app-summaries.repository.interface";
import type { EnvVars } from "../../../../../src/app/env/env.types";
import { LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import { appSummaryRecordCategoriesSchema } from "../../../../../src/app/components/insights/insights.types";
import { ok, err } from "../../../../../src/common/types/result.types";
import { LLMError, LLMErrorCode } from "../../../../../src/common/llm/types/llm-errors.types";

// Mock dependencies
jest.mock("../../../../../src/common/utils/logging", () => ({
  logOneLineWarning: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../../../src/app/utils/codebase-formatting", () => ({
  formatSourceFilesAsMarkdown: jest
    .fn<() => Promise<string>>()
    .mockResolvedValue("mock codebase content"),
}));

jest.mock("../../../../../src/app/prompts/prompt-renderer", () => ({
  renderPrompt: jest.fn<() => string>().mockReturnValue("mock rendered prompt"),
}));

describe("InsightsFromRawCodeGenerator - Type Inference", () => {
  let mockAppSummariesRepository: jest.Mocked<AppSummariesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockEnvVars: EnvVars;
  let generator: InsightsFromRawCodeGenerator;
  let mockConsoleLog: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Mock the repository
    mockAppSummariesRepository = {
      createOrReplaceAppSummary: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      findAppSummaryByProjectName: jest.fn(),
      listAppSummaries: jest.fn(),
    } as unknown as jest.Mocked<AppSummariesRepository>;

    // Mock the LLM router
    mockLLMRouter = {
      executeCompletion: jest.fn(),
      getModelsUsedDescription: jest.fn().mockReturnValue("Mock LLM Provider"),
      generateEmbeddings: jest.fn(),
      getModelFamily: jest.fn(),
      getEmbeddingModelDimensions: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    // Mock environment variables
    mockEnvVars = {
      CODEBASE_DIR_PATH: "/mock/codebase/path",
    } as unknown as EnvVars;

    // Mock console.log
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

    // Create the generator instance
    generator = new InsightsFromRawCodeGenerator(
      mockAppSummariesRepository,
      mockLLMRouter,
      "test-project",
      mockEnvVars,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
  });

  describe("Type safety for getAllCategoriesSummaryAsValidatedJSON", () => {
    test("should return correctly typed data matching appSummaryRecordCategoriesSchema", async () => {
      // Create mock response that matches the partial schema
      const mockResponse = {
        appDescription: "Test application",
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
        boundedContexts: [
          {
            name: "UserContext",
            description: "User bounded context",
            aggregates: [
              {
                name: "UserAggregate",
                description: "User aggregate",
                repository: { name: "UserRepository", description: "User repository" },
                entities: [{ name: "User", description: "User entity" }],
              },
            ],
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(ok(mockResponse));

      await generator.generateAndStoreInsights();

      // Verify the LLM was called with the correct schema
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "all-categories",
        expect.any(String),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: appSummaryRecordCategoriesSchema,
        }),
      );

      // Verify the repository was called with the spread data
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: "test-project",
          llmProvider: "Mock LLM Provider",
          appDescription: "Test application",
          technologies: mockResponse.technologies,
        }),
      );
    });

    test("should handle partial properties correctly (not double-partial)", async () => {
      // Test with only some categories present
      const partialResponse = {
        technologies: [{ name: "Node.ts", description: "Node.ts runtime", version: "20.0.0" }],
        // Other categories intentionally omitted
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(ok(partialResponse));

      await generator.generateAndStoreInsights();

      // The schema should validate partial data correctly
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: "test-project",
          llmProvider: "Mock LLM Provider",
          technologies: partialResponse.technologies,
        }),
      );
    });

    test("should type-check with compile-time validation", async () => {
      // This test demonstrates compile-time type safety
      const mockResponse: z.infer<typeof appSummaryRecordCategoriesSchema> = {
        appDescription: "Test",
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(ok(mockResponse));

      await generator.generateAndStoreInsights();

      // The type of mockResponse should be assignable to the repository method parameter
      // This is validated at compile-time by TypeScript
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).toHaveBeenCalled();
    });

    test("should validate schema inference matches expected structure", () => {
      // Type inference test - this validates that the inferred type has the expected shape
      type InferredType = z.infer<typeof appSummaryRecordCategoriesSchema>;

      // These assignments should compile without errors, demonstrating correct type inference
      const validData: InferredType = {
        appDescription: "Test app",
      };

      const validDataWithMultipleFields: InferredType = {
        appDescription: "Test app",
        technologies: [{ name: "React", description: "React library" }],
        entities: [{ name: "User", description: "User entity" }],
      };

      // All properties should be optional (Partial)
      const emptyData: InferredType = {};

      expect(validData).toBeDefined();
      expect(validDataWithMultipleFields).toBeDefined();
      expect(emptyData).toBeDefined();
    });

    test("should not require double-unwrapping of Partial types", async () => {
      // This test ensures we're not using Partial<Partial<T>>
      const mockResponse = {
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(ok(mockResponse));

      await generator.generateAndStoreInsights();

      // The response should be directly spreadable without type casting
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: "test-project",
          ...mockResponse,
        }),
      );
    });

    test("should handle error response gracefully", async () => {
      mockLLMRouter.executeCompletion.mockResolvedValue(
        err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Mock error")),
      );

      await generator.generateAndStoreInsights();

      // Should not call repository when LLM returns null
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).not.toHaveBeenCalled();
    });

    test("should handle LLM errors without breaking type safety", async () => {
      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("LLM error"));

      await generator.generateAndStoreInsights();

      // Should not call repository when LLM throws an error
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).not.toHaveBeenCalled();
    });
  });

  describe("Type compatibility with repository interface", () => {
    test("should spread LLM response into repository method without type errors", async () => {
      const mockResponse = {
        appDescription: "Test application",
        technologies: [{ name: "TypeScript", version: "5.7.3" }],
        businessProcesses: [{ name: "Order Processing", description: "Process orders" }],
        boundedContexts: [
          { name: "Sales", description: "Sales context", responsibilities: ["Orders"] },
        ],
        aggregates: [{ name: "Order", description: "Order aggregate", entities: ["Order"] }],
        entities: [{ name: "Order", description: "Order entity" }],
        repositories: [{ name: "OrderRepository", description: "Order repo" }],
        potentialMicroservices: [
          { name: "Order Service", description: "Orders", responsibilities: ["Orders"] },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(ok(mockResponse));

      await generator.generateAndStoreInsights();

      // Verify all fields are correctly typed and spread
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).toHaveBeenCalledWith({
        projectName: "test-project",
        llmProvider: "Mock LLM Provider",
        ...mockResponse,
      });
    });

    test("should maintain type safety with empty arrays", async () => {
      const mockResponse = {
        technologies: [],
        entities: [],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(ok(mockResponse));

      await generator.generateAndStoreInsights();

      expect(mockAppSummariesRepository.createOrReplaceAppSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          technologies: [],
          entities: [],
        }),
      );
    });
  });

  describe("Integration with LLMRouter type inference", () => {
    test("should correctly infer return type from executeCompletion", async () => {
      // This test validates that the type flows correctly from executeCompletion
      const mockResponse = {
        appDescription: "Test",
        technologies: [{ name: "TypeScript", description: "TypeScript language" }],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(ok(mockResponse));

      await generator.generateAndStoreInsights();

      // The mock should have been called with the schema that enables type inference
      const executeCompletionCalls = mockLLMRouter.executeCompletion.mock.calls;
      expect(executeCompletionCalls.length).toBe(1);

      const [_resourceName, _prompt, options] = executeCompletionCalls[0];
      expect((options as any).jsonSchema).toBe(appSummaryRecordCategoriesSchema);

      // The return type should be inferred as z.infer<typeof appSummaryRecordCategoriesSchema> | null
      // This is validated at compile-time
    });
  });
});
