import "reflect-metadata";
import { InsightsProcessorSelector } from "../../../../../src/app/components/insights/generators/insights-processor-selector";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { EnvVars } from "../../../../../src/app/env/env.types";
import InsightsFromDBGenerator from "../../../../../src/app/components/insights/generators/db-insights-generator";
import InsightsFromRawCodeGenerator from "../../../../../src/app/components/insights/generators/raw-code-insights-generator";
import { formatSourceFilesAsMarkdown } from "../../../../../src/app/utils/codebase-formatting";
import { fileProcessingConfig } from "../../../../../src/app/config/file-processing.config";
import { llmProviderConfig } from "../../../../../src/common/llm/config/llm.config";
import { z } from "zod";
import { LLMProviderManifest } from "../../../../../src/common/llm/providers/llm-provider.types";

// Mock dependencies
jest.mock("../../../../../src/app/utils/codebase-formatting");
jest.mock("../../../../../src/common/llm/config/llm.config", () => ({
  llmConfig: {
    LLM_ROLE_USER: "user",
    LLM_ROLE_ASSISTANT: "assistant",
    LLM_ROLE_SYSTEM: "system",
  },
  llmProviderConfig: {
    AVERAGE_CHARS_PER_TOKEN: 4,
  },
}));

describe("InsightsProcessorSelector", () => {
  let selector: InsightsProcessorSelector;
  let mockEnvVars: EnvVars;
  let mockDbGenerator: jest.Mocked<InsightsFromDBGenerator>;
  let mockRawCodeGenerator: jest.Mocked<InsightsFromRawCodeGenerator>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockConsoleLog: jest.SpyInstance;

  const mockManifest: LLMProviderManifest = {
    modelFamily: "test-family",
    providerName: "TestProvider",
    models: {
      primaryCompletion: {
        modelKey: "primary",
        maxTotalTokens: 1000,
        urnEnvKey: "TEST_MODEL_URN",
      } as any,
      embeddings: {
        modelKey: "embeddings",
        maxTotalTokens: 500,
        urnEnvKey: "TEST_EMBEDDINGS_URN",
      } as any,
    },
    errorPatterns: [],
    envSchema: z.object({
      TEST_MODEL_URN: z.string(),
      TEST_EMBEDDINGS_URN: z.string(),
    }),
    providerSpecificConfig: {
      requestTimeoutMillis: 30000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 10000,
    },
    implementation: jest.fn() as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console.log
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    // Create mock environment variables
    mockEnvVars = {
      LLM: "test-family",
      CODEBASE_DIR_PATH: "/test/path",
    } as EnvVars;

    // Create mock generators
    mockDbGenerator = {
      generateAndStoreInsights: jest.fn(),
    } as unknown as jest.Mocked<InsightsFromDBGenerator>;

    mockRawCodeGenerator = {
      generateAndStoreInsights: jest.fn(),
    } as unknown as jest.Mocked<InsightsFromRawCodeGenerator>;

    // Create mock LLMRouter
    mockLLMRouter = {
      getLLMManifest: jest.fn().mockReturnValue(mockManifest),
    } as unknown as jest.Mocked<LLMRouter>;

    // Create selector instance
    selector = new InsightsProcessorSelector(
      mockEnvVars,
      mockDbGenerator,
      mockRawCodeGenerator,
      mockLLMRouter,
    );
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("selectInsightsProcessor", () => {
    it("should use LLMRouter to get manifest", async () => {
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue("test code");

      await selector.selectInsightsProcessor();

      expect(mockLLMRouter.getLLMManifest).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.getLLMManifest).toHaveBeenCalledWith();
    });

    it("should select raw code generator when codebase fits within token limit", async () => {
      const smallCodebase = "a".repeat(500); // 500 chars / 4 = 125 tokens
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue(smallCodebase);

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
      expect(formatSourceFilesAsMarkdown).toHaveBeenCalledWith(
        "/test/path",
        fileProcessingConfig.FOLDER_IGNORE_LIST,
        fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Codebase chars length: 500"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Estimated prompt tokens: 125"),
      );
    });

    it("should select db generator when codebase exceeds token limit", async () => {
      const largeCodebase = "a".repeat(5000); // 5000 chars / 4 = 1250 tokens (exceeds 1000)
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue(largeCodebase);

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockDbGenerator);
      expect(formatSourceFilesAsMarkdown).toHaveBeenCalledWith(
        "/test/path",
        fileProcessingConfig.FOLDER_IGNORE_LIST,
        fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Codebase chars length: 5000"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Estimated prompt tokens: 1250"),
      );
    });

    it("should select raw code generator when tokens exactly equal limit", async () => {
      const exactCodebase = "a".repeat(4000); // 4000 chars / 4 = 1000 tokens (exactly at limit)
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue(exactCodebase);

      const result = await selector.selectInsightsProcessor();

      // Should NOT select raw code since we need to be strictly less than the limit
      expect(result).toBe(mockDbGenerator);
    });

    it("should select raw code generator when tokens are just below limit", async () => {
      const justBelowCodebase = "a".repeat(3996); // 3996 chars / 4 = 999 tokens (just below limit)
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue(justBelowCodebase);

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
    });

    it("should handle empty codebase", async () => {
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue("");

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Codebase chars length: 0"),
      );
    });

    it("should use correct token calculation formula", async () => {
      const codebase = "test code";
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue(codebase);

      await selector.selectInsightsProcessor();

      const expectedTokens = codebase.length / llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`Estimated prompt tokens: ${Math.floor(expectedTokens)}`),
      );
    });

    it("should propagate errors from bundleCodebaseIntoMarkdown", async () => {
      const bundleError = new Error("Failed to bundle codebase");
      (formatSourceFilesAsMarkdown as jest.Mock).mockRejectedValue(bundleError);

      await expect(selector.selectInsightsProcessor()).rejects.toThrow("Failed to bundle codebase");

      expect(mockLLMRouter.getLLMManifest).toHaveBeenCalled();
      expect(formatSourceFilesAsMarkdown).toHaveBeenCalledWith(
        "/test/path",
        fileProcessingConfig.FOLDER_IGNORE_LIST,
        fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      );
    });

    it("should propagate errors from getLLMManifest", async () => {
      const manifestError = new Error("Failed to get manifest");
      mockLLMRouter.getLLMManifest.mockImplementation(() => {
        throw manifestError;
      });

      await expect(selector.selectInsightsProcessor()).rejects.toThrow("Failed to get manifest");

      expect(mockLLMRouter.getLLMManifest).toHaveBeenCalled();
      expect(formatSourceFilesAsMarkdown).not.toHaveBeenCalled();
    });

    it("should use manifest from injected router", async () => {
      const customManifest: LLMProviderManifest = {
        ...mockManifest,
        models: {
          ...mockManifest.models,
          primaryCompletion: {
            ...mockManifest.models.primaryCompletion,
            maxTotalTokens: 2000, // Different token limit
          } as any,
        },
      };
      mockLLMRouter.getLLMManifest.mockReturnValue(customManifest);

      const mediumCodebase = "a".repeat(6000); // 6000 chars / 4 = 1500 tokens
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue(mediumCodebase);

      const result = await selector.selectInsightsProcessor();

      // With 2000 token limit, 1500 tokens should fit
      expect(result).toBe(mockRawCodeGenerator);
      expect(mockLLMRouter.getLLMManifest).toHaveBeenCalled();
    });
  });

  describe("dependency injection", () => {
    it("should use injected dependencies correctly", async () => {
      (formatSourceFilesAsMarkdown as jest.Mock).mockResolvedValue("small");

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
      expect(mockLLMRouter.getLLMManifest).toHaveBeenCalled();
      expect(formatSourceFilesAsMarkdown).toHaveBeenCalledWith(
        mockEnvVars.CODEBASE_DIR_PATH,
        fileProcessingConfig.FOLDER_IGNORE_LIST,
        fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      );
    });
  });
});
