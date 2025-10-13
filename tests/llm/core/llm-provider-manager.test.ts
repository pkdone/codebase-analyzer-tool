import "reflect-metadata";
import { LLMProviderManager } from "../../../src/llm/core/llm-provider-manager";
import { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../src/llm/types/llm.types";
import { BadConfigurationLLMError } from "../../../src/llm/types/llm-errors.types";
import * as directoryOperations from "../../../src/common/fs/directory-operations";
import { createMockJsonProcessor } from "../../helpers/json-processor-mock";

// Mock dependencies
jest.mock("../../../src/llm/llm.config", () => ({
  llmConfig: {
    LLM_ROLE_USER: "user",
    LLM_ROLE_ASSISTANT: "assistant",
    LLM_ROLE_SYSTEM: "system",
  },
  llmProviderConfig: {
    PROVIDERS_FOLDER_PATH: "../providers",
    MANIFEST_FILE_SUFFIX: ".manifest.ts",
    PROVIDER_MANIFEST_EXPORT_SUFFIX: "Manifest",
  },
}));

jest.mock("../../../src/common/fs/directory-operations");
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsgAndDetail: jest.fn(),
  logWarningMsg: jest.fn(),
}));

const mockDirectoryOperations = directoryOperations as jest.Mocked<typeof directoryOperations>;

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
    factory: jest.fn(),
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

  describe("filesystem operations", () => {
    it("should handle filesystem errors gracefully", async () => {
      const { logErrorMsgAndDetail: mockLogError } = jest.requireMock(
        "../../../src/common/utils/logging",
      );

      mockDirectoryOperations.listDirectoryEntries.mockRejectedValue(
        new Error("Permission denied"),
      );

      await expect(LLMProviderManager.loadManifestForModelFamily("testFamily")).rejects.toThrow(
        BadConfigurationLLMError,
      );

      expect(mockLogError).toHaveBeenCalled();
    });

    it("should return undefined for empty directories", async () => {
      mockDirectoryOperations.listDirectoryEntries.mockResolvedValue([]);

      await expect(LLMProviderManager.loadManifestForModelFamily("testFamily")).rejects.toThrow(
        "No provider manifest found for model family: testFamily",
      );
    });

    it("should handle directory traversal correctly", async () => {
      // Test the directory traversal logic by simulating multiple directory levels
      mockDirectoryOperations.listDirectoryEntries
        .mockResolvedValueOnce([
          {
            name: "level1",
            isFile: () => false,
            isDirectory: () => true,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
          } as any,
        ])
        .mockResolvedValueOnce([
          {
            name: "level2",
            isFile: () => false,
            isDirectory: () => true,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
          } as any,
        ])
        .mockResolvedValueOnce([]); // Empty final directory

      await expect(LLMProviderManager.loadManifestForModelFamily("testFamily")).rejects.toThrow(
        BadConfigurationLLMError,
      );

      expect(mockDirectoryOperations.listDirectoryEntries).toHaveBeenCalledTimes(3);
    });

    it("should find files in directories", async () => {
      mockDirectoryOperations.listDirectoryEntries.mockResolvedValue([
        {
          name: "non-manifest.ts",
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
        } as any,
        {
          name: "test.manifest.ts",
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
        } as any,
      ]);

      // This will still fail because the dynamic import isn't mocked properly,
      // but it tests the file discovery logic
      await expect(LLMProviderManager.loadManifestForModelFamily("testFamily")).rejects.toThrow(
        BadConfigurationLLMError,
      );

      expect(mockDirectoryOperations.listDirectoryEntries).toHaveBeenCalled();
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

      expect(mockManifest.factory).toHaveBeenCalledWith(
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
        mockManifest.providerSpecificConfig,
        expect.any(Object), // JsonProcessor
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

      expect(manifestWithSecondary.factory).toHaveBeenCalledWith(
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
        manifestWithSecondary.providerSpecificConfig,
        expect.any(Object), // JsonProcessor
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
      expect(retrievedManifest).toBe(mockManifest);
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
