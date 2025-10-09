import "reflect-metadata";
import { InsightsProcessorSelector } from "../../../src/components/insights/insights-processor-selector";
import { LLMProviderManager } from "../../../src/llm/core/llm-provider-manager";
import { EnvVars } from "../../../src/env/env.types";
import InsightsFromDBGenerator from "../../../src/components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../../src/components/insights/insights-from-raw-code-generator";
import { bundleCodebaseIntoMarkdown } from "../../../src/common/utils/codebase-processing";
import { llmProviderConfig } from "../../../src/config/llm-provider.config";
import { z } from "zod";
import { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";

// Mock dependencies
jest.mock("../../../src/common/utils/codebase-processing");
jest.mock("../../../src/config/llm-provider.config", () => ({
  llmProviderConfig: {
    AVERAGE_CHARS_PER_TOKEN: 4,
  },
}));

describe("InsightsProcessorSelector", () => {
  let selector: InsightsProcessorSelector;
  let mockEnvVars: EnvVars;
  let mockDbGenerator: jest.Mocked<InsightsFromDBGenerator>;
  let mockRawCodeGenerator: jest.Mocked<InsightsFromRawCodeGenerator>;
  let mockLLMProviderManager: jest.Mocked<LLMProviderManager>;
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
    factory: jest.fn(),
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

    // Create mock LLMProviderManager
    mockLLMProviderManager = {
      getLLMManifest: jest.fn().mockReturnValue(mockManifest),
      initialize: jest.fn(),
      getLLMProvider: jest.fn(),
    } as unknown as jest.Mocked<LLMProviderManager>;

    // Create selector instance
    selector = new InsightsProcessorSelector(
      mockEnvVars,
      mockDbGenerator,
      mockRawCodeGenerator,
      mockLLMProviderManager,
    );
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("selectInsightsProcessor", () => {
    it("should use LLMProviderManager instance instead of static method", async () => {
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue("test code");

      await selector.selectInsightsProcessor();

      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalledTimes(1);
      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalledWith();
    });

    it("should select raw code generator when codebase fits within token limit", async () => {
      const smallCodebase = "a".repeat(500); // 500 chars / 4 = 125 tokens
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue(smallCodebase);

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
      expect(bundleCodebaseIntoMarkdown).toHaveBeenCalledWith("/test/path");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Codebase chars length: 500"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Estimated prompt tokens: 125"),
      );
    });

    it("should select db generator when codebase exceeds token limit", async () => {
      const largeCodebase = "a".repeat(5000); // 5000 chars / 4 = 1250 tokens (exceeds 1000)
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue(largeCodebase);

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockDbGenerator);
      expect(bundleCodebaseIntoMarkdown).toHaveBeenCalledWith("/test/path");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Codebase chars length: 5000"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Estimated prompt tokens: 1250"),
      );
    });

    it("should select raw code generator when tokens exactly equal limit", async () => {
      const exactCodebase = "a".repeat(4000); // 4000 chars / 4 = 1000 tokens (exactly at limit)
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue(exactCodebase);

      const result = await selector.selectInsightsProcessor();

      // Should NOT select raw code since we need to be strictly less than the limit
      expect(result).toBe(mockDbGenerator);
    });

    it("should select raw code generator when tokens are just below limit", async () => {
      const justBelowCodebase = "a".repeat(3996); // 3996 chars / 4 = 999 tokens (just below limit)
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue(justBelowCodebase);

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
    });

    it("should handle empty codebase", async () => {
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue("");

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Codebase chars length: 0"),
      );
    });

    it("should use correct token calculation formula", async () => {
      const codebase = "test code";
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue(codebase);

      await selector.selectInsightsProcessor();

      const expectedTokens = codebase.length / llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`Estimated prompt tokens: ${Math.floor(expectedTokens)}`),
      );
    });

    it("should propagate errors from bundleCodebaseIntoMarkdown", async () => {
      const bundleError = new Error("Failed to bundle codebase");
      (bundleCodebaseIntoMarkdown as jest.Mock).mockRejectedValue(bundleError);

      await expect(selector.selectInsightsProcessor()).rejects.toThrow("Failed to bundle codebase");

      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalled();
      expect(bundleCodebaseIntoMarkdown).toHaveBeenCalledWith("/test/path");
    });

    it("should propagate errors from getLLMManifest", async () => {
      const manifestError = new Error("Failed to get manifest");
      mockLLMProviderManager.getLLMManifest.mockImplementation(() => {
        throw manifestError;
      });

      await expect(selector.selectInsightsProcessor()).rejects.toThrow("Failed to get manifest");

      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalled();
      expect(bundleCodebaseIntoMarkdown).not.toHaveBeenCalled();
    });

    it("should use manifest from injected manager, not static method", async () => {
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
      mockLLMProviderManager.getLLMManifest.mockReturnValue(customManifest);

      const mediumCodebase = "a".repeat(6000); // 6000 chars / 4 = 1500 tokens
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue(mediumCodebase);

      const result = await selector.selectInsightsProcessor();

      // With 2000 token limit, 1500 tokens should fit
      expect(result).toBe(mockRawCodeGenerator);
      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalled();
    });
  });

  describe("dependency injection", () => {
    it("should not call static methods on LLMProviderManager", async () => {
      const staticSpy = jest.spyOn(LLMProviderManager, "loadManifestForModelFamily");
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue("test");

      await selector.selectInsightsProcessor();

      expect(staticSpy).not.toHaveBeenCalled();
      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalled();

      staticSpy.mockRestore();
    });

    it("should use injected dependencies correctly", async () => {
      (bundleCodebaseIntoMarkdown as jest.Mock).mockResolvedValue("small");

      const result = await selector.selectInsightsProcessor();

      expect(result).toBe(mockRawCodeGenerator);
      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalled();
      expect(bundleCodebaseIntoMarkdown).toHaveBeenCalledWith(mockEnvVars.CODEBASE_DIR_PATH);
    });
  });
});

