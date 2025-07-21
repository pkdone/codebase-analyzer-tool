import "reflect-metadata";
import { container } from "tsyringe";
import { createInsightsGenerator } from "../../../src/components/insights/insights-generator.factory";
import { TOKENS } from "../../../src/di/tokens";
import type { EnvVars } from "../../../src/lifecycle/env.types";
import InsightsFromDBGenerator from "../../../src/components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../../src/components/insights/insights-from-raw-code-generator";
import type { AppSummariesRepository } from "../../../src/repositories/app-summary/app-summaries.repository.interface";
import type { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";
import type LLMRouter from "../../../src/llm/core/llm-router";

// Mock the concrete implementations
jest.mock("../../../src/components/insights/insights-from-db-generator");
jest.mock("../../../src/components/insights/insights-from-raw-code-generator");

describe("createInsightsGenerator", () => {
  beforeEach(() => {
    container.clearInstances();
    jest.clearAllMocks();
  });

  afterEach(() => {
    container.clearInstances();
  });

  it("should return InsightsFromRawCodeGenerator when LLM is VertexAIGemini", () => {
    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "VertexAIGemini",
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockAppSummariesRepository = {
      createOrReplaceAppSummary: jest.fn(),
      updateAppSummary: jest.fn(),
      getProjectAppSummaryDescAndLLMProvider: jest.fn(),
      getProjectAppSummaryField: jest.fn(),
    } as AppSummariesRepository;

    const mockLLMRouter = {
      getModelsUsedDescription: jest.fn().mockReturnValue("test-llm"),
    } as unknown as LLMRouter;

    const mockRawCodeGenerator = new InsightsFromRawCodeGenerator(
      mockAppSummariesRepository,
      mockLLMRouter,
      "test-project",
      mockEnvVars,
    );
    container.registerInstance(InsightsFromRawCodeGenerator, mockRawCodeGenerator);

    // Act
    const result = createInsightsGenerator();

    // Assert
    expect(result).toBe(mockRawCodeGenerator);
  });

  it("should return InsightsFromDBGenerator when LLM is not VertexAIGemini", () => {
    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "OpenAI",
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockAppSummariesRepository = {
      createOrReplaceAppSummary: jest.fn(),
      updateAppSummary: jest.fn(),
      getProjectAppSummaryDescAndLLMProvider: jest.fn(),
      getProjectAppSummaryField: jest.fn(),
    } as unknown as AppSummariesRepository;

    const mockLLMRouter = {
      getModelsUsedDescription: jest.fn().mockReturnValue("test-llm"),
    } as unknown as LLMRouter;

    const mockSourcesRepository = {
      getProjectSourcesSummaries: jest.fn(),
    } as unknown as SourcesRepository;

    const mockDBGenerator = new InsightsFromDBGenerator(
      mockAppSummariesRepository,
      mockLLMRouter,
      mockSourcesRepository,
      "test-project",
    );
    container.registerInstance(InsightsFromDBGenerator, mockDBGenerator);

    // Act
    const result = createInsightsGenerator();

    // Assert
    expect(result).toBe(mockDBGenerator);
  });

  it("should return InsightsFromDBGenerator when LLM is any other provider", () => {
    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "BedrockClaude",
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockAppSummariesRepository = {
      createOrReplaceAppSummary: jest.fn(),
      updateAppSummary: jest.fn(),
      getProjectAppSummaryDescAndLLMProvider: jest.fn(),
      getProjectAppSummaryField: jest.fn(),
    } as unknown as AppSummariesRepository;

    const mockLLMRouter = {
      getModelsUsedDescription: jest.fn().mockReturnValue("test-llm"),
    } as unknown as LLMRouter;

    const mockSourcesRepository = {
      getProjectSourcesSummaries: jest.fn(),
    } as unknown as SourcesRepository;

    const mockDBGenerator = new InsightsFromDBGenerator(
      mockAppSummariesRepository,
      mockLLMRouter,
      mockSourcesRepository,
      "test-project",
    );
    container.registerInstance(InsightsFromDBGenerator, mockDBGenerator);

    // Act
    const result = createInsightsGenerator();

    // Assert
    expect(result).toBe(mockDBGenerator);
  });

  it("should work correctly with array-based large context LLM detection", () => {
    // This test verifies that the factory uses the largeContextLLMs array approach
    // rather than hardcoded string comparison

    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "VertexAIGemini", // This is in the largeContextLLMs array
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockAppSummariesRepository = {
      createOrReplaceAppSummary: jest.fn(),
      updateAppSummary: jest.fn(),
      getProjectAppSummaryDescAndLLMProvider: jest.fn(),
      getProjectAppSummaryField: jest.fn(),
    } as unknown as AppSummariesRepository;

    const mockLLMRouter = {
      getModelsUsedDescription: jest.fn().mockReturnValue("test-llm"),
    } as unknown as LLMRouter;

    const mockRawCodeGenerator = new InsightsFromRawCodeGenerator(
      mockAppSummariesRepository,
      mockLLMRouter,
      "test-project",
      mockEnvVars,
    );
    container.registerInstance(InsightsFromRawCodeGenerator, mockRawCodeGenerator);

    // Act
    const result = createInsightsGenerator();

    // Assert
    expect(result).toBe(mockRawCodeGenerator);
  });
});
