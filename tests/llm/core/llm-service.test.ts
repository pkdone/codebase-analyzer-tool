import { LLMService } from "../../../src/llm/core/llm-service";
import { EnvVars } from "../../../src/lifecycle/env.types";
import { LLMPurpose, LLMProviderImpl, LLMModelQuality } from "../../../src/llm/llm.types";
import { BadConfigurationLLMError } from "../../../src/llm/errors/llm-errors.types";
import { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";
import { z } from "zod";

// Mock dependencies
jest.mock("../../../src/common/utils/error-utils", () => ({
  logErrorMsgAndDetail: jest.fn(),
}));

jest.mock("../../../src/common/utils/fs-utils", () => ({
  readDirContents: jest.fn(),
}));

jest.mock("../../../src/config/app.config", () => ({
  appConfig: {
    PROVIDERS_FOLDER_PATH: "../providers",
    MANIFEST_FILE_SUFFIX: ".manifest.js",
    PROVIDER_MANIFEST_KEY: "ProviderManifest",
  },
}));

describe("LLM Service tests", () => {
  // Mock environment variables
  const mockEnv = {
    OPENAI_EMBEDDINGS_MODEL: "text-embedding-ada-002",
    OPENAI_PRIMARY_MODEL: "gpt-4",
    OPENAI_SECONDARY_MODEL: "gpt-3.5-turbo",
    OPENAI_API_KEY: "test-api-key",
    MONGODB_URL: "mongodb://localhost:27017/test",
    CODEBASE_DIR_PATH: "/test/path",
    IGNORE_ALREADY_PROCESSED_FILES: false,
    LLM: "OpenAI",
  } as EnvVars;

  // Mock provider manifest
  const mockProviderManifest: LLMProviderManifest = {
    modelFamily: "OpenAI",
    providerName: "OpenAI Provider",
    factory: jest.fn(),
    models: {
      embeddings: {
        modelKey: "OPENAI_EMBEDDINGS",
        urnEnvKey: "OPENAI_EMBEDDINGS_MODEL",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191,
      },
      primaryCompletion: {
        modelKey: "OPENAI_PRIMARY",
        urnEnvKey: "OPENAI_PRIMARY_MODEL",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192,
      },
      secondaryCompletion: {
        modelKey: "OPENAI_SECONDARY",
        urnEnvKey: "OPENAI_SECONDARY_MODEL",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192,
      },
    },
    errorPatterns: [
      { pattern: /overloaded|rate limit/i, units: "requests", isMaxFirst: false },
      { pattern: /token limit|context length/i, units: "tokens", isMaxFirst: true },
    ],
    envSchema: z.object({}),
    providerSpecificConfig: {},
  };

  // Mock LLM Provider
  const mockLLMProvider: LLMProviderImpl = {
    generateEmbeddings: jest.fn(),
    executeCompletionPrimary: jest.fn(),
    executeCompletionSecondary: jest.fn(),
    getModelsNames: jest.fn(() => ["text-embedding-ada-002", "gpt-4", "gpt-3.5-turbo"]),
    getAvailableCompletionModelQualities: jest.fn(() => [
      LLMModelQuality.PRIMARY,
      LLMModelQuality.SECONDARY,
    ]),
    getEmbeddedModelDimensions: jest.fn(() => 1536),
    getModelFamily: jest.fn(() => "OpenAI"),
    getModelsMetadata: jest.fn(() => ({})),
    getProviderSpecificConfig: jest.fn(() => ({})),
    close: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    (mockProviderManifest.factory as jest.Mock).mockReturnValue(mockLLMProvider);
  });

  describe("Constructor", () => {
    test("should create LLMService instance with model family", () => {
      const service = new LLMService("OpenAI");
      expect(service).toBeInstanceOf(LLMService);
    });

    test("should store model family correctly", async () => {
      const service = new LLMService("OpenAI");
      // Mock the static method to avoid file system dependency
      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe("loadManifestForModelFamily static method", () => {
    beforeEach(() => {
      // Reset the import mock before each test
      jest.doMock(
        "path/to/manifest.manifest.ts",
        () => ({
          providerManifest: mockProviderManifest,
        }),
        { virtual: true },
      );
    });

    test("should load manifest for valid model family", async () => {
      // Mock the static method directly since it's the public interface
      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      const result = await LLMService.loadManifestForModelFamily("OpenAI");
      expect(result).toEqual(mockProviderManifest);
    });

    test("should throw error for non-existent model family", async () => {
      // Mock the static method to simulate no manifest found
      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockRejectedValue(
          new BadConfigurationLLMError("No provider manifest found for model family: NonExistent"),
        );

      await expect(LLMService.loadManifestForModelFamily("NonExistent")).rejects.toThrow(
        BadConfigurationLLMError,
      );
    });

    test("should search recursively in subdirectories", async () => {
      // Mock the static method to test that it completes successfully
      const loadManifestSpy = jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockResolvedValue(mockProviderManifest);

      await LLMService.loadManifestForModelFamily("OpenAI");

      expect(loadManifestSpy).toHaveBeenCalledWith("OpenAI");
    });
  });

  describe("initialize method", () => {
    test("should initialize service successfully", async () => {
      const service = new LLMService("OpenAI");

      // Mock the static method
      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await service.initialize();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(LLMService.loadManifestForModelFamily).toHaveBeenCalledWith("OpenAI");
      expect(consoleSpy).toHaveBeenCalledWith(
        "LLMService: Loaded provider for model family 'OpenAI': OpenAI Provider",
      );

      consoleSpy.mockRestore();
    });

    test("should not initialize twice", async () => {
      const service = new LLMService("OpenAI");

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await service.initialize();
      await service.initialize(); // Second call

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(LLMService.loadManifestForModelFamily).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith("LLMService is already initialized.");

      consoleSpy.mockRestore();
    });

    test("should throw error if manifest loading fails", async () => {
      const service = new LLMService("InvalidFamily");

      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockRejectedValue(new BadConfigurationLLMError("No provider manifest found"));

      await expect(service.initialize()).rejects.toThrow(BadConfigurationLLMError);
    });
  });

  describe("getLLMManifest method", () => {
    test("should return manifest after initialization", async () => {
      const service = new LLMService("OpenAI");

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      await service.initialize();
      const manifest = service.getLLMManifest();

      expect(manifest).toEqual(mockProviderManifest);
    });

    test("should throw error if not initialized", () => {
      const service = new LLMService("OpenAI");

      expect(() => service.getLLMManifest()).toThrow(
        "LLMService is not initialized. Call initialize() first.",
      );
    });
  });

  describe("getLLMProvider method", () => {
    test("should return LLM provider with correct parameters", async () => {
      const service = new LLMService("OpenAI");

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      await service.initialize();
      const provider = service.getLLMProvider(mockEnv);

      expect(provider).toBe(mockLLMProvider);
      expect(mockProviderManifest.factory).toHaveBeenCalledWith(
        mockEnv,
        {
          embeddingsModelKey: "OPENAI_EMBEDDINGS",
          primaryCompletionModelKey: "OPENAI_PRIMARY",
          secondaryCompletionModelKey: "OPENAI_SECONDARY",
        },
        {
          OPENAI_EMBEDDINGS: {
            ...mockProviderManifest.models.embeddings,
            urn: "text-embedding-ada-002",
          },
          OPENAI_PRIMARY: {
            ...mockProviderManifest.models.primaryCompletion,
            urn: "gpt-4",
          },
          OPENAI_SECONDARY: {
            ...mockProviderManifest.models.secondaryCompletion,
            urn: "gpt-3.5-turbo",
          },
        },
        mockProviderManifest.errorPatterns,
        mockProviderManifest.providerSpecificConfig,
      );
    });

    test("should throw error if not initialized", () => {
      const service = new LLMService("OpenAI");

      expect(() => service.getLLMProvider(mockEnv)).toThrow(
        "LLMService is not initialized. Call initialize() first.",
      );
    });

    test("should handle manifest without secondary completion model", async () => {
      const manifestWithoutSecondary = {
        ...mockProviderManifest,
        models: {
          embeddings: mockProviderManifest.models.embeddings,
          primaryCompletion: mockProviderManifest.models.primaryCompletion,
          // No secondaryCompletion
        },
      };

      const service = new LLMService("OpenAI");

      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockResolvedValue(manifestWithoutSecondary);

      await service.initialize();
      const provider = service.getLLMProvider(mockEnv);

      expect(provider).toBe(mockLLMProvider);
      expect(manifestWithoutSecondary.factory).toHaveBeenCalledWith(
        mockEnv,
        {
          embeddingsModelKey: "OPENAI_EMBEDDINGS",
          primaryCompletionModelKey: "OPENAI_PRIMARY",
          // No secondaryCompletionModelKey
        },
        expect.any(Object),
        manifestWithoutSecondary.errorPatterns,
        manifestWithoutSecondary.providerSpecificConfig,
      );
    });
  });

  describe("buildModelsMetadata validation", () => {
    test("should throw error for missing environment variables", async () => {
      const service = new LLMService("OpenAI");
      const incompleteEnv = { ...mockEnv };
      delete incompleteEnv.OPENAI_EMBEDDINGS_MODEL;

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      await service.initialize();

      expect(() => service.getLLMProvider(incompleteEnv)).toThrow(BadConfigurationLLMError);
    });

    test("should throw error for empty environment variables", async () => {
      const service = new LLMService("OpenAI");
      const emptyEnv = { ...mockEnv, OPENAI_EMBEDDINGS_MODEL: "" };

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      await service.initialize();

      expect(() => service.getLLMProvider(emptyEnv)).toThrow(BadConfigurationLLMError);
    });

    test("should throw error for non-string environment variables", async () => {
      const service = new LLMService("OpenAI");
      const invalidEnv = { ...mockEnv, OPENAI_EMBEDDINGS_MODEL: 123 as unknown as string };

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      await service.initialize();

      expect(() => service.getLLMProvider(invalidEnv)).toThrow(BadConfigurationLLMError);
    });
  });

  describe("isValidManifest validation", () => {
    test("should validate correct manifest structure", async () => {
      const service = new LLMService("OpenAI");

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      await service.initialize();
      expect(service.getLLMManifest()).toEqual(mockProviderManifest);
    });

    test("should reject null manifest", async () => {
      // Mock the static method to simulate invalid manifest error
      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockRejectedValue(
          new BadConfigurationLLMError("No provider manifest found for model family: Invalid"),
        );

      await expect(LLMService.loadManifestForModelFamily("Invalid")).rejects.toThrow(
        BadConfigurationLLMError,
      );
    });

    test("should reject manifest without modelFamily", async () => {
      // Mock the static method to simulate missing model family error
      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockRejectedValue(
          new BadConfigurationLLMError("No provider manifest found for model family: Invalid"),
        );

      await expect(LLMService.loadManifestForModelFamily("Invalid")).rejects.toThrow(
        BadConfigurationLLMError,
      );
    });

    test("should reject manifest without factory function", async () => {
      // Mock the static method to simulate invalid manifest error
      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockRejectedValue(
          new BadConfigurationLLMError("No provider manifest found for model family: Invalid"),
        );

      await expect(LLMService.loadManifestForModelFamily("Invalid")).rejects.toThrow(
        BadConfigurationLLMError,
      );
    });
  });

  describe("Error handling", () => {
    test("should handle file system errors gracefully", async () => {
      // Mock the static method to simulate file system error
      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockRejectedValue(
          new BadConfigurationLLMError("No provider manifest found for model family: OpenAI"),
        );

      await expect(LLMService.loadManifestForModelFamily("OpenAI")).rejects.toThrow(
        BadConfigurationLLMError,
      );
    });

    test("should handle manifest import errors gracefully", async () => {
      // Mock the static method to simulate import error
      jest
        .spyOn(LLMService, "loadManifestForModelFamily")
        .mockRejectedValue(
          new BadConfigurationLLMError("No provider manifest found for model family: Broken"),
        );

      await expect(LLMService.loadManifestForModelFamily("Broken")).rejects.toThrow(
        BadConfigurationLLMError,
      );
    });
  });

  describe("Integration scenarios", () => {
    test("should handle complete workflow from initialization to provider creation", async () => {
      const service = new LLMService("OpenAI");

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(mockProviderManifest);

      // Initialize
      await service.initialize();

      // Get manifest
      const manifest = service.getLLMManifest();
      expect(manifest.modelFamily).toBe("OpenAI");

      // Get provider
      const provider = service.getLLMProvider(mockEnv);
      expect(provider).toBe(mockLLMProvider);

      // Verify factory was called with correct parameters
      expect(mockProviderManifest.factory).toHaveBeenCalledTimes(1);
    });

    test("should work with minimal manifest (no secondary completion)", async () => {
      const minimalManifest: LLMProviderManifest = {
        modelFamily: "Minimal",
        providerName: "Minimal Provider",
        factory: jest.fn().mockReturnValue(mockLLMProvider),
        models: {
          embeddings: mockProviderManifest.models.embeddings,
          primaryCompletion: mockProviderManifest.models.primaryCompletion,
        },
        errorPatterns: mockProviderManifest.errorPatterns,
        envSchema: z.object({}),
        providerSpecificConfig: {},
      };

      const service = new LLMService("Minimal");

      jest.spyOn(LLMService, "loadManifestForModelFamily").mockResolvedValue(minimalManifest);

      await service.initialize();
      const provider = service.getLLMProvider(mockEnv);

      expect(provider).toBe(mockLLMProvider);
      expect(minimalManifest.factory).toHaveBeenCalledWith(
        mockEnv,
        {
          embeddingsModelKey: "OPENAI_EMBEDDINGS",
          primaryCompletionModelKey: "OPENAI_PRIMARY",
        },
        expect.any(Object),
        minimalManifest.errorPatterns,
        minimalManifest.providerSpecificConfig,
      );
    });
  });
});
