import "reflect-metadata";
import { z } from "zod";
import { container } from "tsyringe";
import { coreTokens } from "../../../../src/app/di/tokens";
import {
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
} from "../../../../src/app/di/registration-modules/env-registration";
import { loadManifestForProviderFamily } from "../../../../src/common/llm/utils/manifest-loader";
import type { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import { getBaseNameFromPath } from "../../../../src/common/fs/path-utils";
import { loadBaseEnvVarsOnly } from "../../../../src/app/env/env";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import dotenv from "dotenv";

// Mock dependencies
jest.mock("../../../../src/common/llm/utils/manifest-loader");
jest.mock("../../../../src/app/env/env");
jest.mock("../../../../src/common/fs/path-utils");
jest.mock("dotenv");
// Mock the provider registry to avoid loading real providers in tests
jest.mock("../../../../src/app/llm/provider-registry", () => ({
  APP_PROVIDER_REGISTRY: new Map(),
}));

describe("Environment Registration Module", () => {
  const mockManifest: LLMProviderManifest = {
    providerFamily: "test",
    envSchema: z.object({
      TEST_API_KEY: z.string(),
      TEST_ENDPOINT: z.string().optional(),
    }),
    models: {
      embeddings: [
        {
          modelKey: "test-embeddings",
          urnEnvKey: "TEST_EMBEDDINGS_URN",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 1000,
          dimensions: 512,
        },
      ],
      completions: [
        {
          modelKey: "test-completion",
          urnEnvKey: "TEST_COMPLETION_URN",
          purpose: LLMPurpose.COMPLETIONS,
          maxTotalTokens: 4000,
          maxCompletionTokens: 1000,
        },
      ],
    },
    errorPatterns: [],
    providerSpecificConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    },
    implementation: jest.fn() as unknown as LLMProviderManifest["implementation"],
  };

  const mockBaseEnvVars = {
    MONGODB_URL: "mongodb://localhost:27017/test",
    CODEBASE_DIR_PATH: "/test/project",
    SKIP_ALREADY_PROCESSED_FILES: false,
    LLM_COMPLETIONS: "TestProvider:test-completion",
    LLM_EMBEDDINGS: "TestProvider:test-embeddings",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
    container.reset();

    // Reset process.env for each test
    delete process.env.LLM_COMPLETIONS;
    delete process.env.LLM_EMBEDDINGS;
    delete process.env.TEST_API_KEY;
    delete process.env.TEST_ENDPOINT;
    delete process.env.MONGODB_URL;
    delete process.env.CODEBASE_DIR_PATH;

    // Mock default implementations
    (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
    (loadBaseEnvVarsOnly as jest.Mock).mockReturnValue(mockBaseEnvVars);
    (getBaseNameFromPath as jest.Mock).mockReturnValue("test-project");
    (loadManifestForProviderFamily as jest.Mock).mockReturnValue(mockManifest);
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
      process.env.LLM_COMPLETIONS = "TestProvider:test-completion";
      process.env.LLM_EMBEDDINGS = "TestProvider:test-embeddings";
      process.env.TEST_API_KEY = "test-key";
      process.env.TEST_EMBEDDINGS_URN = "test-embed-urn";
      process.env.TEST_COMPLETION_URN = "test-comp-urn";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      registerLlmEnvDependencies();

      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.ProjectName)).toBe(true);
    });

    it("should fall back to base registration when LLM chains are missing", async () => {
      // Don't set LLM chain environment variables
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
    });

    it("should fall back to base registration when LLM chains are empty", async () => {
      process.env.LLM_COMPLETIONS = "";
      process.env.LLM_EMBEDDINGS = "";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
    });

    it("should fall back to base registration when loadManifestForProviderFamily errors", async () => {
      process.env.LLM_COMPLETIONS = "TestProvider:test-completion";
      process.env.LLM_EMBEDDINGS = "TestProvider:test-embeddings";
      process.env.MONGODB_URL = "mongodb://localhost:27017/test";
      process.env.CODEBASE_DIR_PATH = "/test/project";

      const serviceError = new Error("Failed to load manifest");
      (loadManifestForProviderFamily as jest.Mock).mockImplementation(() => {
        throw serviceError;
      });

      // Should not throw, but fall back to base registration
      registerLlmEnvDependencies();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
    });

    it("should not register environment variables when already registered", async () => {
      // Pre-register environment variables
      const existingEnvVars = { ...mockBaseEnvVars };
      container.registerInstance(coreTokens.EnvVars, existingEnvVars);

      registerLlmEnvDependencies();

      // Should not have loaded base env vars since already registered
      expect(loadBaseEnvVarsOnly).not.toHaveBeenCalled();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
    });
  });

  describe("project name registration", () => {
    it("should derive project name from codebase directory path", () => {
      (getBaseNameFromPath as jest.Mock).mockReturnValue("my-awesome-project");

      registerBaseEnvDependencies();

      const projectName = container.resolve(coreTokens.ProjectName);
      expect(projectName).toBe("my-awesome-project");
      expect(getBaseNameFromPath).toHaveBeenCalledWith("/test/project");
    });

    it("should only compute project name once via registerInstance singleton behavior", () => {
      registerBaseEnvDependencies();

      // First resolution
      const projectName1 = container.resolve(coreTokens.ProjectName);
      // Second resolution
      const projectName2 = container.resolve(coreTokens.ProjectName);

      // getBaseNameFromPath is called once during registration (not on each resolution)
      // as the value is registered as an instance, not a factory
      expect(getBaseNameFromPath).toHaveBeenCalledTimes(1);
      expect(projectName1).toBe(projectName2);
    });
  });
});
