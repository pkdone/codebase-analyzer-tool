/* eslint-disable @typescript-eslint/unbound-method */
import "reflect-metadata";
import { z } from "zod";
import { container } from "tsyringe";
import { TOKENS } from "../../../src/di/tokens";
import {
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
} from "../../../src/di/registration-modules/env-registration";
import { LLMService } from "../../../src/llm/core/llm-service";
import { BadConfigurationLLMError } from "../../../src/llm/errors/llm-errors.types";
import { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";
import { getProjectNameFromPath } from "../../../src/common/utils/path-utils";
import { loadBaseEnvVarsOnly } from "../../../src/lifecycle/env";
import { LLMPurpose } from "../../../src/llm/llm.types";
import dotenv from "dotenv";

// Mock dependencies
jest.mock("../../../src/llm/core/llm-service");
jest.mock("../../../src/lifecycle/env");
jest.mock("../../../src/common/utils/path-utils");
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
        urnEnvKey: "TEST_EMBEDDINGS_URN",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: 1000,
        dimensions: 512,
      },
      primaryCompletion: {
        modelKey: "primary",
        urnEnvKey: "TEST_PRIMARY_URN",
        purpose: LLMPurpose.COMPLETIONS,
        maxTotalTokens: 4000,
        maxCompletionTokens: 1000,
      },
    },
    errorPatterns: [],
    factory: jest.fn(),
  };

  const mockBaseEnvVars = {
    MONGODB_URL: "mongodb://localhost:27017/test",
    CODEBASE_DIR_PATH: "/test/project",
    IGNORE_ALREADY_PROCESSED_FILES: false,
    LLM: "TestProvider",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
    container.reset();

    // Reset process.env for each test
    delete process.env.LLM;
    delete process.env.TEST_API_KEY;
    delete process.env.TEST_ENDPOINT;
    delete process.env.MONGODB_URL;
    delete process.env.CODEBASE_DIR_PATH;

    // Mock default implementations
    (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
    (loadBaseEnvVarsOnly as jest.Mock).mockReturnValue(mockBaseEnvVars);
    (getProjectNameFromPath as jest.Mock).mockReturnValue("test-project");
  });

  describe("registerBaseEnvDependencies", () => {
    it("should register base environment variables when not already registered", () => {
      registerBaseEnvDependencies();

      expect(loadBaseEnvVarsOnly).toHaveBeenCalledTimes(1);
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.ProjectName)).toBe(true);

      const envVars = container.resolve(TOKENS.EnvVars);
      expect(envVars).toEqual(mockBaseEnvVars);

      const projectName = container.resolve(TOKENS.ProjectName);
      expect(projectName).toBe("test-project");
    });

    it("should not register environment variables when already registered", () => {
      // Pre-register environment variables
      container.registerInstance(TOKENS.EnvVars, mockBaseEnvVars);

      registerBaseEnvDependencies();

      expect(loadBaseEnvVarsOnly).not.toHaveBeenCalled();
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
    });

    it("should not register project name when already registered", () => {
      container.registerInstance(TOKENS.EnvVars, mockBaseEnvVars);
      container.registerInstance(TOKENS.ProjectName, "existing-project");

      registerBaseEnvDependencies();

      expect(getProjectNameFromPath).not.toHaveBeenCalled();
      const projectName = container.resolve(TOKENS.ProjectName);
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

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await registerLlmEnvDependencies();

      expect(LLMService.loadManifestForModelFamily).toHaveBeenCalledWith("TestProvider");
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.ProjectName)).toBe(true);
      expect(container.isRegistered(TOKENS.LLMModelFamily)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(TOKENS.EnvVars) as Record<string, unknown>;
      expect(envVars.LLM).toBe("TestProvider");
      expect(envVars.TEST_API_KEY).toBe("test-key");

      const llmModelFamily = container.resolve(TOKENS.LLMModelFamily);
      expect(llmModelFamily).toBe("TestProvider");
    });

    it("should throw error when LLM environment variable is missing", async () => {
      // Don't set LLM environment variable
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      await expect(registerLlmEnvDependencies()).rejects.toThrow(
        "LLM environment variable is not set or is empty in your .env file.",
      );
    });

    it("should throw error when LLM environment variable is empty", async () => {
      process.env.LLM = "";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      await expect(registerLlmEnvDependencies()).rejects.toThrow(
        "LLM environment variable is not set or is empty in your .env file.",
      );
    });

    it("should throw error when required provider-specific environment variables are missing", async () => {
      process.env.LLM = "TestProvider";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";
      // Missing TEST_API_KEY which is required by the mock manifest

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await expect(registerLlmEnvDependencies()).rejects.toThrow(BadConfigurationLLMError);
      await expect(registerLlmEnvDependencies()).rejects.toThrow(
        "Missing required environment variables for TestProvider provider: TEST_API_KEY",
      );
    });

    it("should throw error when LLM does not match manifest modelFamily", async () => {
      process.env.LLM = "DifferentProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await expect(registerLlmEnvDependencies()).rejects.toThrow(BadConfigurationLLMError);
      await expect(registerLlmEnvDependencies()).rejects.toThrow(
        "LLM environment variable ('DifferentProvider') does not precisely match modelFamily ('TestProvider')",
      );
    });

    it("should handle LLMService.loadManifestForModelFamily errors", async () => {
      process.env.LLM = "TestProvider";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      const serviceError = new Error("Failed to load manifest");
      (LLMService.loadManifestForModelFamily as jest.Mock).mockRejectedValue(serviceError);

      await expect(registerLlmEnvDependencies()).rejects.toThrow(BadConfigurationLLMError);
      await expect(registerLlmEnvDependencies()).rejects.toThrow(
        "Failed to load and validate environment variables for LLM configuration",
      );
    });

    it("should handle zod validation errors with proper error messages", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "invalid-url"; // Invalid URL format
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await expect(registerLlmEnvDependencies()).rejects.toThrow(BadConfigurationLLMError);
    });

    it("should not register environment variables when already registered", async () => {
      // Pre-register environment variables
      const existingEnvVars = { ...mockBaseEnvVars, LLM: "TestProvider" };
      container.registerInstance(TOKENS.EnvVars, existingEnvVars);

      await registerLlmEnvDependencies();

      expect(LLMService.loadManifestForModelFamily).not.toHaveBeenCalled();
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);

      const envVars = container.resolve(TOKENS.EnvVars);
      expect(envVars).toEqual(existingEnvVars);
    });

    it("should not register LLM model family when already registered", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      // Pre-register LLM model family
      container.registerInstance(TOKENS.LLMModelFamily, "ExistingProvider");

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await registerLlmEnvDependencies();

      const llmModelFamily = container.resolve(TOKENS.LLMModelFamily);
      expect(llmModelFamily).toBe("ExistingProvider");
    });

    it("should handle missing LLM in environment variables for LLM model family registration", async () => {
      const envVarsWithoutLLM = {
        MONGODB_URL: "mongodb://localhost:27017/test",
        CODEBASE_DIR_PATH: "/test/project",
        IGNORE_ALREADY_PROCESSED_FILES: false,
      };

      container.registerInstance(TOKENS.EnvVars, envVarsWithoutLLM);

      await registerLlmEnvDependencies();

      expect(container.isRegistered(TOKENS.LLMModelFamily)).toBe(false);
    });

    it("should handle optional environment variables correctly", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      // TEST_ENDPOINT is optional and not set
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await registerLlmEnvDependencies();

      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(TOKENS.EnvVars) as Record<string, unknown>;
      expect(envVars.TEST_API_KEY).toBe("test-key");
      expect(envVars.TEST_ENDPOINT).toBeUndefined();
    });

    it("should include optional environment variables when provided", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.TEST_ENDPOINT = "https://api.test.com";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await registerLlmEnvDependencies();

      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(TOKENS.EnvVars) as Record<string, unknown>;
      expect(envVars.TEST_API_KEY).toBe("test-key");
      expect(envVars.TEST_ENDPOINT).toBe("https://api.test.com");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete registration flow", async () => {
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await registerLlmEnvDependencies();

      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.ProjectName)).toBe(true);
      expect(container.isRegistered(TOKENS.LLMModelFamily)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const envVars = container.resolve(TOKENS.EnvVars) as Record<string, unknown>;
      const projectName = container.resolve(TOKENS.ProjectName);
      const llmModelFamily = container.resolve(TOKENS.LLMModelFamily);

      expect(envVars.LLM).toBe("TestProvider");
      expect(envVars.TEST_API_KEY).toBe("test-key");
      expect(projectName).toBe("test-project");
      expect(llmModelFamily).toBe("TestProvider");
    });

    it("should handle base registration followed by LLM registration", async () => {
      // First register base dependencies
      registerBaseEnvDependencies();

      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.ProjectName)).toBe(true);
      expect(container.isRegistered(TOKENS.LLMModelFamily)).toBe(false);

      // Then register LLM dependencies
      process.env.LLM = "TestProvider";
      process.env.TEST_API_KEY = "test-key";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      (LLMService.loadManifestForModelFamily as jest.Mock).mockResolvedValue(mockManifest);

      await registerLlmEnvDependencies();

      expect(container.isRegistered(TOKENS.LLMModelFamily)).toBe(true);
      const llmModelFamily = container.resolve(TOKENS.LLMModelFamily);
      expect(llmModelFamily).toBe("TestProvider");
    });
  });
});
