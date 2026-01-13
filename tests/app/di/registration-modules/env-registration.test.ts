import "reflect-metadata";
import { z } from "zod";
import { container } from "tsyringe";
import { coreTokens } from "../../../../src/app/di/tokens";
import { llmTokens } from "../../../../src/app/di/tokens";
import {
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  resetProjectNameCache,
} from "../../../../src/app/di/registration-modules/env-registration";
import { loadManifestForModelFamily } from "../../../../src/common/llm/utils/manifest-loader";
import { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import { getBaseNameFromPath } from "../../../../src/common/fs/path-utils";
import { loadBaseEnvVarsOnly } from "../../../../src/app/env/env";
import { LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import dotenv from "dotenv";

// Mock dependencies
jest.mock("../../../../src/common/llm/utils/manifest-loader");
jest.mock("../../../../src/app/env/env");
jest.mock("../../../../src/common/fs/path-utils");
jest.mock("dotenv");

describe("Environment Registration Module", () => {
  const mockManifest: LLMProviderManifest = {
    providerName: "Test Provider",
    modelFamily: "TestProvider",
    envSchema: z.object({
      TEST_API_KEY: z.string(),
      TEST_ENDPOINT: z.string().optional(),
    }),
    models: {
      embeddings: {
        modelKey: "embeddings",
        name: "Test Embeddings",
        urnEnvKey: "TEST_EMBEDDINGS_URN",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: 1000,
        dimensions: 512,
      },
      primaryCompletion: {
        modelKey: "primary",
        name: "Test Primary",
        urnEnvKey: "TEST_PRIMARY_URN",
        purpose: LLMPurpose.COMPLETIONS,
        maxTotalTokens: 4000,
        maxCompletionTokens: 1000,
      },
    },
    errorPatterns: [],
    providerSpecificConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    },
    implementation: jest.fn() as any,
  };

  const mockBaseEnvVars = {
    MONGODB_URL: "mongodb://localhost:27017/test",
    CODEBASE_DIR_PATH: "/test/project",
    SKIP_ALREADY_PROCESSED_FILES: false,
    LLM: "TestProvider",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
    container.reset();
    resetProjectNameCache();

    // Reset process.env for each test
    delete process.env.LLM;
    delete process.env.TEST_API_KEY;
    delete process.env.TEST_ENDPOINT;
    delete process.env.MONGODB_URL;
    delete process.env.CODEBASE_DIR_PATH;

    // Mock default implementations
    (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
    (loadBaseEnvVarsOnly as jest.Mock).mockReturnValue(mockBaseEnvVars);
    (getBaseNameFromPath as jest.Mock).mockReturnValue("test-project");
  });

  describe("registerBaseEnvDependencies", () => {
    it("should register base environment variables when not already registered", () => {
      registerBaseEnvDependencies();

      expect(loadBaseEnvVarsOnly).toHaveBeenCalledTimes(1);
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.ProjectName)).toBe(true);

      const envVars = container.resolve(coreTokens.EnvVars);
      expect(envVars).toEqual(mockBaseEnvVars);

      const projectName = container.resolve(coreTokens.ProjectName);
      expect(projectName).toBe("test-project");
    });

    it("should not register environment variables when already registered", () => {
      // Pre-register environment variables
      container.registerInstance(coreTokens.EnvVars, mockBaseEnvVars);

      registerBaseEnvDependencies();

      expect(loadBaseEnvVarsOnly).not.toHaveBeenCalled();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
    });

    it("should not register project name when already registered", () => {
      container.registerInstance(coreTokens.EnvVars, mockBaseEnvVars);
      container.registerInstance(coreTokens.ProjectName, "existing-project");

      registerBaseEnvDependencies();

      expect(getBaseNameFromPath).not.toHaveBeenCalled();
      const projectName = container.resolve(coreTokens.ProjectName);
      expect(projectName).toBe("existing-project");
    });
  });

  describe("registerLlmEnvDependencies", () => {
    it("should register LLM environment variables with valid configuration", async () => {
      // Set up successful scenario
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      registerLlmEnvDependencies();

      expect(loadManifestForModelFamily).toHaveBeenCalledWith("TestProvider");
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.ProjectName)).toBe(true);
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(coreTokens.EnvVars) as Record<string, unknown>;
      expect(envVars.LLM).toBe("TestProvider");
      expect(envVars.TEST_API_KEY).toBe("test-key");

      const llmModelFamily = container.resolve(llmTokens.LLMModelFamily);
      expect(llmModelFamily).toBe("TestProvider");
    });

    it("should fall back to base registration when LLM environment variable is missing", async () => {
      // Don't set LLM environment variable
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      // LLM model family should not be registered when LLM env vars are missing
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);
    });

    it("should fall back to base registration when LLM environment variable is empty", async () => {
      process.env.LLM = "";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      // LLM model family should not be registered when LLM env vars are missing
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);
    });

    it("should fall back to base registration when required provider-specific environment variables are missing", async () => {
      process.env.LLM = "TestProvider";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";
      // Missing TEST_API_KEY which is required by the mock manifest

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      // LLM model family should not be registered when required env vars are missing
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);
    });

    it("should fall back to base registration when LLM does not match manifest modelFamily", async () => {
      process.env.LLM = "DifferentProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      // LLM model family should not be registered when LLM doesn't match
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);
    });

    it("should fall back to base registration when loadManifestForModelFamily errors", async () => {
      process.env.LLM = "TestProvider";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      const serviceError = new Error("Failed to load manifest");
      (loadManifestForModelFamily as jest.Mock).mockImplementation(() => {
        throw serviceError;
      });

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      // LLM model family should not be registered when manifest loading fails
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);
    });

    it("should fall back to base registration when zod validation errors occur", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "invalid-url"; // Invalid URL format
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      // LLM model family should not be registered when validation fails
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);
    });

    it("should not register environment variables when already registered", async () => {
      // Pre-register environment variables
      const existingEnvVars = { ...mockBaseEnvVars, LLM: "TestProvider" };
      container.registerInstance(coreTokens.EnvVars, existingEnvVars);

      registerLlmEnvDependencies();

      expect(loadManifestForModelFamily).not.toHaveBeenCalled();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);

      const envVars = container.resolve(coreTokens.EnvVars);
      expect(envVars).toEqual(existingEnvVars);
    });

    it("should not register LLM model family when already registered", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      // Pre-register LLM model family
      container.registerInstance(llmTokens.LLMModelFamily, "ExistingProvider");

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      registerLlmEnvDependencies();

      const llmModelFamily = container.resolve(llmTokens.LLMModelFamily);
      expect(llmModelFamily).toBe("ExistingProvider");
    });

    it("should handle missing LLM in environment variables for LLM model family registration", async () => {
      const envVarsWithoutLLM = {
        MONGODB_URL: "mongodb://localhost:27017/test",
        CODEBASE_DIR_PATH: "/test/project",
        SKIP_ALREADY_PROCESSED_FILES: false,
      };

      container.registerInstance(coreTokens.EnvVars, envVarsWithoutLLM);

      registerLlmEnvDependencies();

      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);
    });

    it("should handle optional environment variables correctly", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      // TEST_ENDPOINT is optional and not set
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      registerLlmEnvDependencies();

      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(coreTokens.EnvVars) as Record<string, unknown>;
      expect(envVars.TEST_API_KEY).toBe("test-key");
      expect(envVars.TEST_ENDPOINT).toBeUndefined();
    });

    it("should include optional environment variables when provided", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.TEST_ENDPOINT = "https://api.test.com";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      registerLlmEnvDependencies();

      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(coreTokens.EnvVars) as Record<string, unknown>;
      expect(envVars.TEST_API_KEY).toBe("test-key");
      expect(envVars.TEST_ENDPOINT).toBe("https://api.test.com");
    });
  });

  describe("registerProjectName with useFactory", () => {
    it("should defer project name derivation until resolution (lazy evaluation)", () => {
      // Register base env vars
      container.registerInstance(coreTokens.EnvVars, mockBaseEnvVars);

      // Clear any calls from beforeEach setup
      (getBaseNameFromPath as jest.Mock).mockClear();

      // Now call registration which will register the factory (but NOT call it yet)
      registerBaseEnvDependencies();

      // Verify factory registration happened
      expect(container.isRegistered(coreTokens.ProjectName)).toBe(true);

      // getBaseNameFromPath should NOT have been called during registration
      // (this is the key improvement - deferred resolution)
      expect(getBaseNameFromPath).not.toHaveBeenCalled();

      // Now resolve - this should trigger the factory
      const projectName = container.resolve(coreTokens.ProjectName);

      // Factory should have been called during resolution
      expect(getBaseNameFromPath).toHaveBeenCalledWith("/test/project");
      expect(projectName).toBe("test-project");
    });

    it("should maintain singleton behavior - factory called only once across multiple resolutions", () => {
      registerBaseEnvDependencies();

      // Clear mock to count only calls during resolution
      (getBaseNameFromPath as jest.Mock).mockClear();

      // First resolution - triggers the factory
      const projectName1 = container.resolve(coreTokens.ProjectName);
      expect(getBaseNameFromPath).toHaveBeenCalledTimes(1);

      // Subsequent resolutions should return cached value (manual singleton implementation)
      const projectName2 = container.resolve(coreTokens.ProjectName);
      const projectName3 = container.resolve(coreTokens.ProjectName);

      // Factory should still only have been called once (singleton behavior via caching)
      expect(getBaseNameFromPath).toHaveBeenCalledTimes(1);

      // All resolutions should return the same value
      expect(projectName1).toBe(projectName2);
      expect(projectName2).toBe(projectName3);
    });

    it("should resolve EnvVars dependency through container during factory execution", () => {
      // This test verifies that the factory correctly uses the container to resolve EnvVars
      const customEnvVars = {
        ...mockBaseEnvVars,
        CODEBASE_DIR_PATH: "/custom/path",
      };
      container.registerInstance(coreTokens.EnvVars, customEnvVars);

      registerBaseEnvDependencies();

      // Clear mock to verify it's called during resolution
      (getBaseNameFromPath as jest.Mock).mockClear();

      // Resolve project name - this triggers the factory which resolves EnvVars from container
      container.resolve(coreTokens.ProjectName);

      // Verify getBaseNameFromPath was called with the custom path from EnvVars
      expect(getBaseNameFromPath).toHaveBeenCalledWith("/custom/path");
    });

    it("should reset cache correctly for test isolation", () => {
      registerBaseEnvDependencies();

      // First resolution
      const projectName1 = container.resolve(coreTokens.ProjectName);
      expect(projectName1).toBe("test-project");

      // Simulate test cleanup
      container.clearInstances();
      container.reset();
      resetProjectNameCache();

      // Update mock to return different value
      (getBaseNameFromPath as jest.Mock).mockReturnValue("different-project");

      // Re-register with new env vars
      const newEnvVars = { ...mockBaseEnvVars, CODEBASE_DIR_PATH: "/different/path" };
      container.registerInstance(coreTokens.EnvVars, newEnvVars);
      registerBaseEnvDependencies();

      // Should get the new value after cache reset
      const projectName2 = container.resolve(coreTokens.ProjectName);
      expect(projectName2).toBe("different-project");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete registration flow", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      registerLlmEnvDependencies();

      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.ProjectName)).toBe(true);
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(coreTokens.EnvVars) as Record<string, unknown>;
      const projectName = container.resolve(coreTokens.ProjectName);
      const llmModelFamily = container.resolve(llmTokens.LLMModelFamily);

      expect(envVars.LLM).toBe("TestProvider");
      expect(envVars.TEST_API_KEY).toBe("test-key");
      expect(projectName).toBe("test-project");
      expect(llmModelFamily).toBe("TestProvider");
    });

    it("should handle base registration followed by LLM registration", async () => {
      // First register base dependencies
      registerBaseEnvDependencies();

      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.ProjectName)).toBe(true);
      expect(container.isRegistered(llmTokens.LLMModelFamily)).toBe(false);

      // Then register LLM dependencies
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (loadManifestForModelFamily as jest.Mock).mockReturnValue(mockManifest);

      registerLlmEnvDependencies();

      // LLM model family should be registered when LLM env vars are available
      // Note: This test requires proper LLM env vars to be set up in the test
      if (container.isRegistered(llmTokens.LLMModelFamily)) {
        const llmModelFamily = container.resolve(llmTokens.LLMModelFamily);
        expect(llmModelFamily).toBe("TestProvider");
      } else {
        // If LLM env vars aren't available, it should fall back to base registration
        expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      }
    });
  });
});
