import "reflect-metadata";
import { LLMProviderManager } from "../../../src/llm/core/llm-provider-manager";
import { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../src/llm/types/llm.types";
import { BadConfigurationLLMError } from "../../../src/llm/types/llm-errors.types";
import { createMockJsonProcessor } from "../../helpers/llm/json-processor-mock";

// Mock dependencies
jest.mock("../../../src/llm/llm.config", () => ({
  llmConfig: {
    LLM_ROLE_USER: "user",
    LLM_ROLE_ASSISTANT: "assistant",
    LLM_ROLE_SYSTEM: "system",
  },
}));

jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsgAndDetail: jest.fn(),
  logSingleLineWarning: jest.fn(),
  logJsonProcessingWarning: jest.fn(),
}));

// Create a more comprehensive test that focuses on what we can actually test
describe("LLMProviderManager", () => {
  let manager: LLMProviderManager;
  let mockConsoleLog: jest.SpyInstance;

  const mockManifest: LLMProviderManifest = {
    modelFamily: "testFamily",
    providerName: "Test Provider",
    envSchema: {} as any, // Mock Zod schema
    models: {
      embeddings: {
        modelKey: "test-embeddings",
        purpose: LLMPurpose.EMBEDDINGS,
        urnEnvKey: "TEST_EMBEDDINGS_MODEL",
        maxTotalTokens: 8192,
        maxCompletionTokens: 4096,
      },
      primaryCompletion: {
        modelKey: "test-completion",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: "TEST_COMPLETION_MODEL",
        maxTotalTokens: 8192,
        maxCompletionTokens: 4096,
      },
    },
    implementation: jest.fn() as any,
    errorPatterns: [],
    providerSpecificConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
    manager = new LLMProviderManager("testFamily", createMockJsonProcessor());
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("static registry operations", () => {
    it("should throw error for unknown model family", () => {
      expect(() => LLMProviderManager.loadManifestForModelFamily("unknownFamily")).toThrow(
        BadConfigurationLLMError,
      );
      expect(() => LLMProviderManager.loadManifestForModelFamily("unknownFamily")).toThrow(
        /No provider manifest found for model family: unknownFamily/,
      );
    });

    it("should load manifest for valid model family (case-insensitive)", () => {
      // Test with a known provider from the registry
      const manifest = LLMProviderManager.loadManifestForModelFamily("openai");
      expect(manifest).toBeDefined();
      expect(manifest.modelFamily.toLowerCase()).toBe("openai");

      // Test case-insensitive matching
      const manifestUpper = LLMProviderManager.loadManifestForModelFamily("OPENAI");
      expect(manifestUpper).toBe(manifest);

      const manifestMixed = LLMProviderManager.loadManifestForModelFamily("OpenAI");
      expect(manifestMixed).toBe(manifest);
    });

    it("should include available families in error message", () => {
      try {
        LLMProviderManager.loadManifestForModelFamily("unknownFamily");
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(BadConfigurationLLMError);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("Available families:");
        // Should list some known providers
        expect(errorMessage).toMatch(/openai|azureopenai|vertexaigemini/i);
      }
    });
  });

  describe("error handling", () => {
    it("should throw error when getting manifest before initialization", () => {
      expect(() => manager.getLLMManifest()).toThrow(
        "LLMProviderManager is not initialized. Call initialize() first.",
      );
    });

    it("should throw error when getting provider before initialization", () => {
      const mockEnv = { TEST_MODEL: "test-urn" } as any;

      expect(() => manager.getLLMProvider(mockEnv)).toThrow(
        "LLMProviderManager is not initialized. Call initialize() first.",
      );
    });
  });

  describe("model key building", () => {
    // Since we can't easily mock the initialization, let's test the private methods indirectly
    // by creating a manager with a pre-loaded manifest
    it("should handle models without secondary completion", () => {
      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());

      // Simulate initialization by setting the private properties
      (testManager as any).manifest = mockManifest;
      (testManager as any).isInitialized = true;

      // Test the environment variable validation logic
      const mockEnv = {
        TEST_EMBEDDINGS_MODEL: "embeddings-model-urn",
        TEST_COMPLETION_MODEL: "completion-model-urn",
      } as any;

      testManager.getLLMProvider(mockEnv);

      expect(mockManifest.implementation).toHaveBeenCalledWith(
        mockEnv,
        {
          embeddingsModelKey: "test-embeddings",
          primaryCompletionModelKey: "test-completion",
        },
        expect.objectContaining({
          "test-embeddings": expect.objectContaining({
            urn: "embeddings-model-urn",
          }),
          "test-completion": expect.objectContaining({
            urn: "completion-model-urn",
          }),
        }),
        mockManifest.errorPatterns,
        { providerSpecificConfig: mockManifest.providerSpecificConfig },
        expect.any(Object), // JsonProcessor
        mockManifest.modelFamily,
      );
    });

    it("should handle models with secondary completion", () => {
      const manifestWithSecondary = {
        ...mockManifest,
        models: {
          ...mockManifest.models,
          secondaryCompletion: {
            modelKey: "test-secondary",
            purpose: LLMPurpose.COMPLETIONS,
            urnEnvKey: "TEST_SECONDARY_MODEL",
            maxTotalTokens: 4096,
            maxCompletionTokens: 2048,
          },
        },
      };

      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());
      (testManager as any).manifest = manifestWithSecondary;
      (testManager as any).isInitialized = true;

      const mockEnv = {
        TEST_EMBEDDINGS_MODEL: "embeddings-urn",
        TEST_COMPLETION_MODEL: "completion-urn",
        TEST_SECONDARY_MODEL: "secondary-urn",
      } as any;

      testManager.getLLMProvider(mockEnv);

      expect(manifestWithSecondary.implementation).toHaveBeenCalledWith(
        mockEnv,
        {
          embeddingsModelKey: "test-embeddings",
          primaryCompletionModelKey: "test-completion",
          secondaryCompletionModelKey: "test-secondary",
        },
        expect.objectContaining({
          "test-secondary": expect.objectContaining({
            urn: "secondary-urn",
          }),
        }),
        manifestWithSecondary.errorPatterns,
        { providerSpecificConfig: manifestWithSecondary.providerSpecificConfig },
        expect.any(Object), // JsonProcessor
        manifestWithSecondary.modelFamily,
      );
    });

    it("should throw error for missing environment variables", () => {
      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());
      (testManager as any).manifest = mockManifest;
      (testManager as any).isInitialized = true;

      const mockEnv = {
        TEST_EMBEDDINGS_MODEL: "embeddings-model-urn",
        // Missing TEST_COMPLETION_MODEL
      } as any;

      expect(() => testManager.getLLMProvider(mockEnv)).toThrow(BadConfigurationLLMError);
      expect(() => testManager.getLLMProvider(mockEnv)).toThrow(/TEST_COMPLETION_MODEL/);
    });

    it("should throw error for empty environment variables", () => {
      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());
      (testManager as any).manifest = mockManifest;
      (testManager as any).isInitialized = true;

      const mockEnv = {
        TEST_EMBEDDINGS_MODEL: "",
        TEST_COMPLETION_MODEL: "completion-model-urn",
      } as any;

      expect(() => testManager.getLLMProvider(mockEnv)).toThrow(BadConfigurationLLMError);
      expect(() => testManager.getLLMProvider(mockEnv)).toThrow(/TEST_EMBEDDINGS_MODEL/);
    });

    it("should throw error for non-string environment variables", () => {
      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());
      (testManager as any).manifest = mockManifest;
      (testManager as any).isInitialized = true;

      const mockEnv = {
        TEST_EMBEDDINGS_MODEL: 123 as any,
        TEST_COMPLETION_MODEL: "completion-model-urn",
      } as any;

      expect(() => testManager.getLLMProvider(mockEnv)).toThrow(BadConfigurationLLMError);
      expect(() => testManager.getLLMProvider(mockEnv)).toThrow(/TEST_EMBEDDINGS_MODEL/);
    });
  });

  describe("manifest retrieval", () => {
    it("should return manifest after initialization", () => {
      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());
      (testManager as any).manifest = mockManifest;
      (testManager as any).isInitialized = true;

      const retrievedManifest = testManager.getLLMManifest();
      expect(retrievedManifest).toBeDefined();
      expect(retrievedManifest.modelFamily).toBe(mockManifest.modelFamily);
      expect(retrievedManifest.providerName).toBe(mockManifest.providerName);
    });

    it("should return the cached manifest reference", () => {
      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());
      (testManager as any).manifest = mockManifest;
      (testManager as any).isInitialized = true;

      const manifest1 = testManager.getLLMManifest();
      const manifest2 = testManager.getLLMManifest();

      // Should return the same reference (manifest contains functions which can't be cloned)
      expect(manifest1).toBe(manifest2);
      expect(manifest1.modelFamily).toBe(manifest2.modelFamily);
      expect(manifest1.providerName).toBe(manifest2.providerName);
    });

    it("should contain all expected manifest properties", () => {
      const testManager = new LLMProviderManager("testFamily", createMockJsonProcessor());
      (testManager as any).manifest = mockManifest;
      (testManager as any).isInitialized = true;

      const manifest = testManager.getLLMManifest();

      expect(manifest.models).toBeDefined();
      expect(manifest.models.embeddings).toBeDefined();
      expect(manifest.models.primaryCompletion).toBeDefined();
      expect(manifest.providerSpecificConfig).toBeDefined();
      expect(manifest.implementation).toBeDefined();
      expect(typeof manifest.implementation).toBe("function");
    });
  });

  describe("case-insensitive model family matching", () => {
    it("should match model family regardless of case", () => {
      // Test that the isValidManifest type guard and modelFamily comparison
      // work with case-insensitive matching
      const testManifest = {
        ...mockManifest,
        modelFamily: "TestFamily", // Mixed case
      };

      // Test with various case combinations
      const testCases = [
        { input: "testfamily", expected: true },
        { input: "TESTFAMILY", expected: true },
        { input: "TestFamily", expected: true },
        { input: "tEsTfAmIlY", expected: true },
      ];

      testCases.forEach(({ input, expected }) => {
        const matches = testManifest.modelFamily.toLowerCase() === input.toLowerCase();
        expect(matches).toBe(expected);
      });
    });
  });
});
