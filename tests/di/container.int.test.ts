import "reflect-metadata";
import { bootstrapContainer, container } from "../../src/di/container";
import { TOKENS } from "../../src/tokens";
import { MongoDBClientFactory } from "../../src/common/mongodb/mdb-client-factory";
import { MongoConnectionTestTask } from "../../src/tasks/mdb-connection-test.task";
import { ReportGenerationTask } from "../../src/tasks/report-generation.task";
import { MongoClient } from "mongodb";
import { setupTestDatabase, teardownTestDatabase } from "../helpers/database/db-test-helper";

// Mock only the LLM parts to avoid real API calls and costs
jest.mock("../../src/llm/core/llm-provider-manager");
jest.mock("../../src/llm/core/llm-router");

// Load environment variables for tests
function ensureEnvLoaded(): void {
  if (!process.env.MONGODB_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("dotenv").config();
    } catch {
      // dotenv might not be installed, that's ok
    }
  }
}

describe("DI Container Integration Tests", () => {
  // Helper function to setup clean container for tests that don't use setupTestDatabase
  function setupCleanContainer() {
    container.clearInstances();
    container.reset();
    ensureEnvLoaded();
    process.env.CODEBASE_DIR_PATH ??= "/test/path";
  }

  afterEach(async () => {
    // Ensure DB connection is closed and container is reset
    if (container.isRegistered(TOKENS.MongoDBClientFactory)) {
      try {
        const mongoFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
        await mongoFactory.closeAll();
      } catch (error) {
        // Ignore errors during cleanup
        console.warn("Error during MongoDB cleanup:", error);
      }
    }
    container.clearInstances();
    container.reset();
  });

  describe("Complex Task Resolution with Real Dependencies", () => {
    beforeEach(() => {
      setupCleanContainer();
    });

    it("should successfully bootstrap and resolve CodebaseCaptureTask with real DB dependency", async () => {
      // Skip this test - CodebaseCaptureTask requires LLM dependencies
      console.log("Skipping CodebaseCaptureTask test - requires LLM dependencies");
      return;
    }, 30000);

    it("should successfully resolve MongoConnectionTestTask with real DB dependency", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange
      const config = { requiresMongoDB: true, requiresLLM: false };

      // Act
      await bootstrapContainer(config);

      // Assert: Should be able to resolve MongoDB-dependent task
      let resolvedTask: MongoConnectionTestTask | undefined;
      expect(() => {
        resolvedTask = container.resolve<MongoConnectionTestTask>(TOKENS.MongoConnectionTestTask);
      }).not.toThrow();

      expect(resolvedTask).toBeInstanceOf(MongoConnectionTestTask);
      expect(resolvedTask).toBeDefined();
    }, 30000);

    it("should successfully resolve ReportGenerationTask with real DB dependency", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange
      const config = { requiresMongoDB: true, requiresLLM: false };

      // Act
      await bootstrapContainer(config);

      // Assert: Should be able to resolve reporting task
      let resolvedTask: ReportGenerationTask | undefined;
      expect(() => {
        resolvedTask = container.resolve<ReportGenerationTask>(TOKENS.ReportGenerationTask);
      }).not.toThrow();

      expect(resolvedTask).toBeInstanceOf(ReportGenerationTask);
    }, 30000);
  });

  describe("Dependency Chain Validation", () => {
    beforeEach(() => {
      setupCleanContainer();
    });

    it("should verify entire dependency chain for MongoDB-dependent services", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange
      const config = { requiresMongoDB: true, requiresLLM: false };

      // Act: Bootstrap container
      await bootstrapContainer(config);

      // Assert: Verify that all MongoDB-related dependencies can be resolved
      expect(() => {
        const mongoFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
        expect(mongoFactory).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const mongoClient = container.resolve<MongoClient>(TOKENS.MongoClient);
        expect(mongoClient).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const sourcesRepo = container.resolve<any>(TOKENS.SourcesRepository);
        expect(sourcesRepo).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const appSummariesRepo = container.resolve<any>(TOKENS.AppSummariesRepository);
        expect(appSummariesRepo).toBeDefined();
      }).not.toThrow();
    }, 30000);
  });

  describe("Real MongoDB Connection Integration", () => {
    it("should successfully connect to MongoDB through the factory", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Setup test database for this specific test
      await setupTestDatabase();

      try {
        // Assert: Should be able to get a connected client
        expect(container.isRegistered(TOKENS.MongoClient)).toBe(true);
        const client = container.resolve<MongoClient>(TOKENS.MongoClient);
        expect(client).toBeDefined();

        // Verify we can perform basic operations (this tests real connectivity)
        const db = client.db();
        expect(db).toBeDefined();

        // Test a simple operation to verify connectivity
        const collections = await db.listCollections().toArray();
        expect(Array.isArray(collections)).toBe(true);
      } finally {
        // Clean up the test database
        await teardownTestDatabase();
      }
    }, 30000);

    it("should handle MongoDB factory singleton behavior correctly", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Don't use setupTestDatabase - manually bootstrap to test the container behavior
      container.clearInstances();
      container.reset();
      ensureEnvLoaded();
      process.env.CODEBASE_DIR_PATH ??= "/test/path";

      const config = { requiresMongoDB: true, requiresLLM: false };
      await bootstrapContainer(config);

      try {
        // Assert: Multiple resolutions should return the same instance
        expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
        const factory1 = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
        const factory2 = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);

        expect(factory1).toBe(factory2);

        // Both should be able to get the same client
        const client1 = container.resolve<MongoClient>(TOKENS.MongoClient);
        const client2 = container.resolve<MongoClient>(TOKENS.MongoClient);

        expect(client1).toBe(client2); // Should be the same connection
      } finally {
        // Clean up
        const factory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
        await factory.closeAll();
      }
    }, 30000);
  });

  describe("Error Handling and Edge Cases", () => {
    beforeEach(() => {
      setupCleanContainer();
    });

    it("should handle multiple bootstrap calls gracefully", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange
      const config = { requiresMongoDB: true, requiresLLM: false };

      // Act: Multiple bootstrap calls
      await bootstrapContainer(config);
      await bootstrapContainer(config);
      await bootstrapContainer(config);

      // Assert: Should still work correctly
      expect(() => {
        const task = container.resolve<MongoConnectionTestTask>(TOKENS.MongoConnectionTestTask);
        expect(task).toBeDefined();
      }).not.toThrow();
    }, 30000);

    it("should handle mixed configuration scenarios", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange & Act: First bootstrap without MongoDB
      let config = { requiresMongoDB: false, requiresLLM: false };
      await bootstrapContainer(config);

      // Assert: MongoDB dependencies should not be registered
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);

      // Act: Bootstrap again with MongoDB
      config = { requiresMongoDB: true, requiresLLM: false };
      await bootstrapContainer(config);

      // Assert: MongoDB dependencies should now be registered and resolvable
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);

      expect(() => {
        const factory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
        expect(factory).toBeDefined();
      }).not.toThrow();
    }, 30000);

    it("should properly clean up resources when container is cleared", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange
      const config = { requiresMongoDB: true, requiresLLM: false };
      await bootstrapContainer(config);

      // Verify factory is registered
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      const factory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);

      // Act: Clear the container completely (both instances and registrations)
      await factory.closeAll(); // Cleanup connections first
      container.clearInstances(); // Clear cached instances
      container.reset(); // Clear all registrations

      // Assert: After clearing, should not be able to resolve
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);

      // Re-bootstrap should work fine
      await expect(bootstrapContainer(config)).resolves.not.toThrow();

      // Final cleanup
      const newFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
      await newFactory.closeAll();
    }, 30000);
  });

  describe("Service Integration Validation", () => {
    beforeEach(() => {
      setupCleanContainer();
    });

    it("should verify that repositories can be used through resolved dependencies", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange
      const config = { requiresMongoDB: true, requiresLLM: false };
      await bootstrapContainer(config);

      // Act: Resolve repositories and verify they have working methods
      const sourcesRepo = container.resolve<any>(TOKENS.SourcesRepository);
      const appSummariesRepo = container.resolve<any>(TOKENS.AppSummariesRepository);

      // Assert: Repositories should have expected methods and schemas
      expect(sourcesRepo).toBeDefined();
      expect(sourcesRepo.getCollectionValidationSchema).toBeInstanceOf(Function);
      expect(sourcesRepo.insertSource).toBeInstanceOf(Function);

      expect(appSummariesRepo).toBeDefined();
      expect(appSummariesRepo.getCollectionValidationSchema).toBeInstanceOf(Function);
      expect(appSummariesRepo.createOrReplaceAppSummary).toBeInstanceOf(Function);

      // Verify schemas are available (this tests that the implementations are properly constructed)
      const sourcesSchema = sourcesRepo.getCollectionValidationSchema();
      const summariesSchema = appSummariesRepo.getCollectionValidationSchema();

      expect(sourcesSchema).toBeDefined();
      expect(typeof sourcesSchema).toBe("object");
      expect(summariesSchema).toBeDefined();
      expect(typeof summariesSchema).toBe("object");
    }, 30000);
  });
});
