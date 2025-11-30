import { bootstrapContainer, container } from "../../src/di/container";
import { coreTokens } from "../../src/di/tokens";
import { taskTokens } from "../../src/di/tokens";
import { llmTokens } from "../../src/di/tokens";

// Mock the LLM-related modules to avoid environment dependencies in tests
jest.mock("../../src/llm/llm-router");
jest.mock("../../src/common/mongodb/mdb-connection-manager", () => {
  return {
    MongoDBConnectionManager: jest.fn().mockImplementation(() => {
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
    it("should register basic dependencies", async () => {
      await bootstrapContainer();

      // Verify that environment variables and tasks are registered
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(taskTokens.CodebaseQueryTask)).toBe(true);
      expect(container.isRegistered(taskTokens.InsightsGenerationTask)).toBe(true);

      // Verify that LLM dependencies may or may not be registered depending on env vars
      // LLMRouter requires LLMModelFamily, which is only registered when LLM env vars are available
      // With simplified bootstrap, MongoDB client factory is always registered (lazy-loaded)
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);
    });

    it("should register MongoDB dependencies when required", async () => {
      await bootstrapContainer();

      // Verify that MongoDB dependencies are registered along with basic dependencies
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);
      expect(container.isRegistered(coreTokens.MongoClient)).toBe(true);
      expect(container.isRegistered(taskTokens.CodebaseQueryTask)).toBe(true);

      // Verify that LLM dependencies may or may not be registered depending on env vars
      // LLMRouter requires LLMModelFamily, which is only registered when LLM env vars are available
    });

    it("should handle multiple calls without errors (idempotent)", async () => {
      // First registration
      await bootstrapContainer();

      // Second registration should not throw errors
      await expect(bootstrapContainer()).resolves.not.toThrow();

      // Dependencies should still be registered
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(taskTokens.CodebaseQueryTask)).toBe(true);
    });

    it("should handle multiple calls with MongoDB without errors", async () => {
      // First registration
      await bootstrapContainer();
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);

      // Second registration should not throw errors
      await expect(bootstrapContainer()).resolves.not.toThrow();

      // Dependencies should still be registered
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);
      expect(container.isRegistered(coreTokens.MongoClient)).toBe(true);
    });
  });

  describe("tsyringe singleton behavior", () => {
    it("should provide access to registered environment variables", async () => {
      await bootstrapContainer();

      // Should be able to resolve environment variables
      const envVars = container.resolve(coreTokens.EnvVars);

      expect(envVars).toBeDefined();
      expect(envVars).toHaveProperty("CODEBASE_DIR_PATH");
    });

    it("should resolve MongoDB dependencies when registered", async () => {
      await bootstrapContainer();

      // Should be able to resolve MongoDB dependencies
      const mongoConnectionManager = container.resolve(coreTokens.MongoDBConnectionManager);
      const mongoClient = container.resolve(coreTokens.MongoClient);

      expect(mongoConnectionManager).toBeDefined();
      expect(mongoClient).toBeDefined();
    });

    it("should resolve MongoDB-dependent services when all dependencies are registered", async () => {
      await bootstrapContainer();

      // Should be able to resolve MongoDB-dependent task
      const mongoConnectionTestTask = container.resolve(taskTokens.MongoConnectionTestTask);

      expect(mongoConnectionTestTask).toBeDefined();
    });

    it("should maintain singleton behavior across multiple resolutions", async () => {
      await bootstrapContainer();

      // Resolve the same dependencies multiple times
      const mongoConnectionManager1 = container.resolve(coreTokens.MongoDBConnectionManager);
      const mongoConnectionManager2 = container.resolve(coreTokens.MongoDBConnectionManager);

      // Should be the same instance due to singleton registration
      expect(mongoConnectionManager1).toBe(mongoConnectionManager2);
    });

    it("should check registration state correctly", async () => {
      // Initially nothing should be registered
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(false);
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(false);
      expect(container.isRegistered(llmTokens.LLMRouter)).toBe(false);

      await bootstrapContainer();

      // Check that correct dependencies are now registered
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);
      // Note: LLMRouter registration depends on LLMModelFamily, which is only registered when LLM env vars are available
    });
  });

  describe("conditional registration behavior", () => {
    it("should only register services once even with multiple registerAppDependencies calls", async () => {
      // First registration
      await bootstrapContainer();
      expect(container.isRegistered(taskTokens.CodebaseQueryTask)).toBe(true);

      // Second registration should not cause issues
      await bootstrapContainer();
      expect(container.isRegistered(taskTokens.CodebaseQueryTask)).toBe(true);

      // Test that registration is idempotent - verify task tokens are registered
      expect(container.isRegistered(taskTokens.InsightsGenerationTask)).toBe(true);
      expect(container.isRegistered(taskTokens.PluggableLLMsTestTask)).toBe(true);
    });

    it("should handle mixed dependency scenarios", async () => {
      // First registration
      await bootstrapContainer();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      // With simplified bootstrap, MongoDB client factory is always registered (lazy-loaded)
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);

      // Then register again
      await bootstrapContainer();
      expect(container.isRegistered(coreTokens.EnvVars)).toBe(true);
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);
    });
  });
});
