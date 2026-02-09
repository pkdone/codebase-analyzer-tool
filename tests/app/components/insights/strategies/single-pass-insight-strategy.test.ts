import "reflect-metadata";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { container } from "tsyringe";
import { SinglePassInsightStrategy } from "../../../../../src/app/components/insights/strategies/single-pass-insight-strategy";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { llmTokens } from "../../../../../src/app/di/tokens";
import {
  llmOk,
  llmErr,
  createExecutionMetadata,
} from "../../../../../src/common/llm/types/llm-result.types";
import { LLMExecutionError } from "../../../../../src/common/llm/types/llm-execution-error.types";
import type { AppSummaryCategoryType } from "../../../../../src/app/components/insights/insights.types";

// Mock dependencies
jest.mock("../../../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

jest.mock("../../../../../src/common/utils/text-utils", () => ({
  joinArrayWithSeparators: jest.fn((arr: string[]) => arr.join("\n")),
}));

describe("SinglePassInsightStrategy", () => {
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let strategy: SinglePassInsightStrategy;
  let testContainer: typeof container;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLLMRouter = {
      executeCompletion: jest.fn(),
      getModelsUsedDescription: jest.fn(),
      generateEmbeddings: jest.fn(),
      getProviderFamily: jest.fn(),
      getEmbeddingModelDimensions: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    // Create a child container for testing
    testContainer = container.createChildContainer();
    testContainer.register(llmTokens.LLMRouter, { useValue: mockLLMRouter });

    strategy = testContainer.resolve(SinglePassInsightStrategy);
  });

  afterEach(() => {
    testContainer.reset();
  });

  describe("constructor", () => {
    test("should be injectable with LLMRouter dependency", () => {
      expect(strategy).toBeInstanceOf(SinglePassInsightStrategy);
    });
  });

  describe("generateInsights", () => {
    test("should call executeInsightCompletion with correct parameters", async () => {
      const mockResponse = {
        technologies: [
          { name: "TypeScript", description: "TypeScript language" },
        ],
      };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const category: AppSummaryCategoryType = "technologies";
      const summaries = ["* file1.ts: TypeScript implementation"];

      const result = await strategy.generateInsights(category, summaries);

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    test("should return null when LLM execution fails", async () => {
      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmErr(new LLMExecutionError("Mock error", "test")));

      const result = await strategy.generateInsights("technologies", ["summary1"]);

      expect(result).toBeNull();
    });

    test("should handle empty summaries array", async () => {
      const mockResponse = { technologies: [] };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const result = await strategy.generateInsights("technologies", []);

      expect(result).toEqual(mockResponse);
    });

    test("should process all summaries in a single pass", async () => {
      const mockResponse = {
        technologies: [
          { name: "React", description: "React framework" },
          { name: "TypeScript", description: "TypeScript language" },
        ],
      };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const summaries = [
        "* file1.tsx: React component",
        "* file2.ts: TypeScript utility",
        "* file3.tsx: React hooks",
      ];

      await strategy.generateInsights("technologies", summaries);

      // Should be called exactly once (single pass)
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
    });
  });

  describe("type inference", () => {
    test("should return correctly typed result for technologies category", async () => {
      const mockResponse = {
        technologies: [
          { name: "TypeScript", version: "5.0.0" },
        ],
      };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const result = await strategy.generateInsights("technologies", ["summary"]);

      if (result) {
        expect(result.technologies).toBeDefined();
        expect(result.technologies[0].name).toBe("TypeScript");
      }
    });

    test("should return correctly typed result for appDescription category", async () => {
      const mockResponse = {
        appDescription: "A comprehensive application",
      };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const result = await strategy.generateInsights("appDescription", ["summary"]);

      if (result) {
        expect(result.appDescription).toBe("A comprehensive application");
      }
    });

    test("should return correctly typed result for boundedContexts category", async () => {
      const mockResponse = {
        boundedContexts: [
          {
            name: "OrderContext",
            description: "Handles orders",
            aggregates: [],
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const result = await strategy.generateInsights("boundedContexts", ["summary"]);

      if (result) {
        expect(result.boundedContexts).toBeDefined();
        expect(result.boundedContexts[0].name).toBe("OrderContext");
      }
    });

    test("should return correctly typed result for businessProcesses category", async () => {
      const mockResponse = {
        businessProcesses: [
          {
            name: "OrderProcessing",
            description: "Process orders",
            keyBusinessActivities: [],
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const result = await strategy.generateInsights("businessProcesses", ["summary"]);

      if (result) {
        expect(result.businessProcesses).toBeDefined();
        expect(result.businessProcesses[0].name).toBe("OrderProcessing");
      }
    });

    test("should return correctly typed result for potentialMicroservices category", async () => {
      const mockResponse = {
        potentialMicroservices: [
          {
            name: "OrderService",
            description: "Handles orders",
            responsibilities: ["Order management"],
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const result = await strategy.generateInsights("potentialMicroservices", ["summary"]);

      if (result) {
        expect(result.potentialMicroservices).toBeDefined();
        expect(result.potentialMicroservices[0].responsibilities).toContain("Order management");
      }
    });
  });

  describe("error handling", () => {
    test("should handle LLM execution errors gracefully", async () => {
      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmErr(new LLMExecutionError("Rate limit exceeded", "openai")));

      const result = await strategy.generateInsights("technologies", ["summary"]);

      expect(result).toBeNull();
    });

    test("should handle rejected promises gracefully", async () => {
      (mockLLMRouter.executeCompletion as any)
        .mockRejectedValue(new Error("Network error"));

      const result = await strategy.generateInsights("technologies", ["summary"]);

      expect(result).toBeNull();
    });
  });

  describe("InsightGenerationStrategy interface compliance", () => {
    test("should implement generateInsights method", () => {
      expect(typeof strategy.generateInsights).toBe("function");
    });

    test("should accept category and summaries parameters", async () => {
      const mockResponse = { technologies: [] };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      // Should not throw
      await expect(
        strategy.generateInsights("technologies", ["summary1", "summary2"]),
      ).resolves.toBeDefined();
    });

    test("should return CategoryInsightResult or null", async () => {
      const mockResponse = { technologies: [{ name: "Test" }] };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const result = await strategy.generateInsights("technologies", ["summary"]);

      // Result should be either the typed result or null
      expect(result === null || typeof result === "object").toBe(true);
    });
  });

  describe("readonly summaries handling", () => {
    test("should accept readonly string array for summaries", async () => {
      const mockResponse = { technologies: [] };

      (mockLLMRouter.executeCompletion as any)
        .mockResolvedValue(llmOk(mockResponse, createExecutionMetadata("gpt-4", "openai")));

      const readonlySummaries: readonly string[] = Object.freeze([
        "* file1.ts: summary1",
        "* file2.ts: summary2",
      ]);

      // Should handle readonly arrays without issues
      const result = await strategy.generateInsights("technologies", readonlySummaries);

      expect(result).toEqual(mockResponse);
    });
  });
});
