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
import { LLMService } from "../../../src/llm/core/llm-service";
import type { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";

// Mock the concrete implementations
jest.mock("../../../src/components/insights/insights-from-db-generator");
jest.mock("../../../src/components/insights/insights-from-raw-code-generator");
jest.mock("../../../src/llm/core/llm-service");

describe("createInsightsGenerator", () => {
  const mockLLMServiceLoadManifest = jest.spyOn(LLMService, 'loadManifestForModelFamily');

  beforeEach(() => {
    container.clearInstances();
    jest.clearAllMocks();
  });

  afterEach(() => {
    container.clearInstances();
  });

  it("should return InsightsFromRawCodeGenerator when LLM supports full codebase analysis", async () => {
    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "VertexAIGemini",
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockManifest: Partial<LLMProviderManifest> = {
      supportsFullCodebaseAnalysis: true,
    };
    mockLLMServiceLoadManifest.mockResolvedValue(mockManifest as LLMProviderManifest);

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
    const result = await createInsightsGenerator();

    // Assert
    expect(result).toBe(mockRawCodeGenerator);
    expect(mockLLMServiceLoadManifest).toHaveBeenCalledWith("VertexAIGemini");
  });

  it("should return InsightsFromDBGenerator when LLM does not support full codebase analysis", async () => {
    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "OpenAI",
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockManifest: Partial<LLMProviderManifest> = {
      supportsFullCodebaseAnalysis: false,
    };
    mockLLMServiceLoadManifest.mockResolvedValue(mockManifest as LLMProviderManifest);

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
    const result = await createInsightsGenerator();

    // Assert
    expect(result).toBe(mockDBGenerator);
    expect(mockLLMServiceLoadManifest).toHaveBeenCalledWith("OpenAI");
  });

  it("should return InsightsFromDBGenerator for providers without full codebase analysis support", async () => {
    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "BedrockClaude",
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockManifest: Partial<LLMProviderManifest> = {
      supportsFullCodebaseAnalysis: false,
    };
    mockLLMServiceLoadManifest.mockResolvedValue(mockManifest as LLMProviderManifest);

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
    const result = await createInsightsGenerator();

    // Assert
    expect(result).toBe(mockDBGenerator);
    expect(mockLLMServiceLoadManifest).toHaveBeenCalledWith("BedrockClaude");
  });

  it("should use manifest-based decision making instead of hardcoded arrays", async () => {
    // This test verifies that the factory uses manifest flags instead of hardcoded arrays

    // Arrange
    const mockEnvVars: EnvVars = {
      LLM: "CustomProvider", // Not in any hardcoded array
      MONGODB_URL: "mongodb://localhost:27017",
      CODEBASE_DIR_PATH: "/test/path",
      IGNORE_ALREADY_PROCESSED_FILES: false,
    };
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    const mockManifest: Partial<LLMProviderManifest> = {
      supportsFullCodebaseAnalysis: true, // Custom provider supports full codebase analysis
    };
    mockLLMServiceLoadManifest.mockResolvedValue(mockManifest as LLMProviderManifest);

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
    const result = await createInsightsGenerator();

    // Assert
    expect(result).toBe(mockRawCodeGenerator);
    expect(mockLLMServiceLoadManifest).toHaveBeenCalledWith("CustomProvider");
  });
});
