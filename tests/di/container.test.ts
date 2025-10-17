import { bootstrapContainer, container } from "../../src/di/container";
import { TaskRunnerConfig } from "../../src/tasks/task.types";
import { TOKENS } from "../../src/tokens";

// Mock the LLM-related modules to avoid environment dependencies in tests
jest.mock("../../src/llm/core/llm-provider-manager");
jest.mock("../../src/llm/core/llm-router");
jest.mock("../../src/common/mongodb/mdb-client-factory", () => {
  return {
    MongoDBClientFactory: jest.fn().mockImplementation(() => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue({
              map: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      return {
        connect: jest.fn().mockResolvedValue(mockClient),
      };
    }),
  };
});

describe("Dependency Registration", () => {
  beforeEach(() => {
    // Clear the container before each test
    container.clearInstances();
    container.reset();

    // Mock environment variables
    process.env.MONGODB_URL = "mongodb://test:27017/test";
    process.env.CODEBASE_DIR_PATH = "/test/path";
  });

  describe("bootstrapContainer function", () => {
    it("should register basic dependencies without LLM or MongoDB", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false,
      };

      await bootstrapContainer(config);

      // Verify that environment variables and tasks are registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.CodebaseQueryTask)).toBe(true);
      expect(container.isRegistered(TOKENS.InsightsGenerationTask)).toBe(true);

      // Verify that LLM and MongoDB dependencies are not registered
      expect(container.isRegistered(TOKENS.LLMProviderManager)).toBe(false);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);
    });

    it("should register MongoDB dependencies when required", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true,
      };

      await bootstrapContainer(config);

      // Verify that MongoDB dependencies are registered along with basic dependencies
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoClient)).toBe(true);
      expect(container.isRegistered(TOKENS.CodebaseQueryTask)).toBe(true);

      // Verify that LLM dependencies are not registered
      expect(container.isRegistered(TOKENS.LLMProviderManager)).toBe(false);
    });

    it("should handle multiple calls without errors (idempotent)", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false,
      };

      // First registration
      await bootstrapContainer(config);

      // Second registration should not throw errors
      await expect(bootstrapContainer(config)).resolves.not.toThrow();

      // Dependencies should still be registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.CodebaseQueryTask)).toBe(true);
    });

    it("should handle multiple calls with MongoDB without errors", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true,
      };

      // First registration
      await bootstrapContainer(config);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);

      // Second registration should not throw errors
      await expect(bootstrapContainer(config)).resolves.not.toThrow();

      // Dependencies should still be registered
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoClient)).toBe(true);
    });
  });

  describe("tsyringe singleton behavior", () => {
    it("should provide access to registered environment variables", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false,
      };

      await bootstrapContainer(config);

      // Should be able to resolve environment variables
      const envVars = container.resolve(TOKENS.EnvVars);

      expect(envVars).toBeDefined();
      expect(envVars).toHaveProperty("CODEBASE_DIR_PATH");
    });

    it("should resolve MongoDB dependencies when registered", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true,
      };

      await bootstrapContainer(config);

      // Should be able to resolve MongoDB dependencies
      const mongoFactory = container.resolve(TOKENS.MongoDBClientFactory);
      const mongoClient = container.resolve(TOKENS.MongoClient);

      expect(mongoFactory).toBeDefined();
      expect(mongoClient).toBeDefined();
    });

    it("should resolve MongoDB-dependent services when all dependencies are registered", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true,
      };

      await bootstrapContainer(config);

      // Should be able to resolve MongoDB-dependent task
      const mongoConnectionTestTask = container.resolve(TOKENS.MongoConnectionTestTask);

      expect(mongoConnectionTestTask).toBeDefined();
    });

    it("should maintain singleton behavior across multiple resolutions", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true,
      };

      await bootstrapContainer(config);

      // Resolve the same dependencies multiple times
      const mongoFactory1 = container.resolve(TOKENS.MongoDBClientFactory);
      const mongoFactory2 = container.resolve(TOKENS.MongoDBClientFactory);

      // Should be the same instance due to singleton registration
      expect(mongoFactory1).toBe(mongoFactory2);
    });

    it("should check registration state correctly", async () => {
      // Initially nothing should be registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(false);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);
      expect(container.isRegistered(TOKENS.LLMProviderManager)).toBe(false);

      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true,
      };

      await bootstrapContainer(config);

      // Check that correct dependencies are now registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      expect(container.isRegistered(TOKENS.LLMProviderManager)).toBe(false);
    });
  });

  describe("conditional registration behavior", () => {
    it("should only register services once even with multiple registerAppDependencies calls", async () => {
      const config: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false,
      };

      // First registration
      await bootstrapContainer(config);
      expect(container.isRegistered(TOKENS.CodebaseQueryTask)).toBe(true);

      // Second registration should not cause issues
      await bootstrapContainer(config);
      expect(container.isRegistered(TOKENS.CodebaseQueryTask)).toBe(true);

      // Test that registration is idempotent - verify task tokens are registered
      expect(container.isRegistered(TOKENS.InsightsGenerationTask)).toBe(true);
      expect(container.isRegistered(TOKENS.PluggableLLMsTestTask)).toBe(true);
    });

    it("should handle mixed dependency scenarios", async () => {
      // First register without MongoDB
      const config1: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false,
      };

      await bootstrapContainer(config1);
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);

      // Then register with MongoDB
      const config2: TaskRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true,
      };

      await bootstrapContainer(config2);
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
    });
  });
});
