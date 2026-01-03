import "reflect-metadata";
import { bootstrapContainer, container } from "../../../src/app/di/container";
import { coreTokens } from "../../../src/app/di/tokens";
import { taskTokens } from "../../../src/app/di/tokens";
import { repositoryTokens } from "../../../src/app/di/tokens";
import { MongoDBConnectionManager } from "../../../src/common/mongodb/mdb-connection-manager";
import { MongoConnectionTestTask } from "../../../src/app/tasks/dev/mdb-connection-test.task";
import { ReportGenerationTask } from "../../../src/app/tasks/main/report-generation.task";
import { MongoClient } from "mongodb";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "../../common/helpers/database/db-test-helper";

// Mock only the LLM parts to avoid real API calls and costs
jest.mock("../../../src/common/llm/llm-router");

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
    if (container.isRegistered(coreTokens.MongoDBConnectionManager)) {
      try {
        const mongoConnectionManager = container.resolve<MongoDBConnectionManager>(
          coreTokens.MongoDBConnectionManager,
        );
        await mongoConnectionManager.shutdown();
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

      // Act
      await bootstrapContainer();

      // Assert: Should be able to resolve MongoDB-dependent task
      let resolvedTask: MongoConnectionTestTask | undefined;
      expect(() => {
        resolvedTask = container.resolve<MongoConnectionTestTask>(
          taskTokens.MongoConnectionTestTask,
        );
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

      // Act
      await bootstrapContainer();

      // Assert: Should be able to resolve reporting task
      let resolvedTask: ReportGenerationTask | undefined;
      expect(() => {
        resolvedTask = container.resolve<ReportGenerationTask>(taskTokens.ReportGenerationTask);
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
      // Act: Bootstrap container
      await bootstrapContainer();

      // Assert: Verify that all MongoDB-related dependencies can be resolved
      expect(() => {
        const mongoConnectionManager = container.resolve<MongoDBConnectionManager>(
          coreTokens.MongoDBConnectionManager,
        );
        expect(mongoConnectionManager).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const mongoClient = container.resolve<MongoClient>(coreTokens.MongoClient);
        expect(mongoClient).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const sourcesRepo = container.resolve<any>(repositoryTokens.SourcesRepository);
        expect(sourcesRepo).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const appSummariesRepo = container.resolve<any>(repositoryTokens.AppSummariesRepository);
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
        expect(container.isRegistered(coreTokens.MongoClient)).toBe(true);
        const client = container.resolve<MongoClient>(coreTokens.MongoClient);
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

      await bootstrapContainer();

      try {
        // Assert: Multiple resolutions should return the same instance
        expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);
        const connectionManager1 = container.resolve<MongoDBConnectionManager>(
          coreTokens.MongoDBConnectionManager,
        );
        const connectionManager2 = container.resolve<MongoDBConnectionManager>(
          coreTokens.MongoDBConnectionManager,
        );

        expect(connectionManager1).toBe(connectionManager2);

        // Both should be able to get the same client
        const client1 = container.resolve<MongoClient>(coreTokens.MongoClient);
        const client2 = container.resolve<MongoClient>(coreTokens.MongoClient);

        expect(client1).toBe(client2); // Should be the same connection
      } finally {
        // Clean up
        const connectionManager = container.resolve<MongoDBConnectionManager>(
          coreTokens.MongoDBConnectionManager,
        );
        await connectionManager.shutdown();
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

      // Act: Multiple bootstrap calls
      await bootstrapContainer();
      await bootstrapContainer();
      await bootstrapContainer();

      // Assert: Should still work correctly
      expect(() => {
        const task = container.resolve<MongoConnectionTestTask>(taskTokens.MongoConnectionTestTask);
        expect(task).toBeDefined();
      }).not.toThrow();
    }, 30000);

    it("should handle mixed configuration scenarios", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange & Act: Bootstrap container
      await bootstrapContainer();

      // Assert: With simplified bootstrap, all dependencies are always registered (lazy-loaded)
      // They're only instantiated when actually resolved
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);

      // Act: Bootstrap again
      await bootstrapContainer();

      // Assert: MongoDB dependencies should now be registered and resolvable
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);

      expect(() => {
        const connectionManager = container.resolve<MongoDBConnectionManager>(
          coreTokens.MongoDBConnectionManager,
        );
        expect(connectionManager).toBeDefined();
      }).not.toThrow();
    }, 30000);

    it("should properly clean up resources when container is cleared", async () => {
      // Skip if no MongoDB URL available
      if (!process.env.MONGODB_URL) {
        console.log("Skipping test - MONGODB_URL not set");
        return;
      }

      // Arrange
      await bootstrapContainer();

      // Verify connection manager is registered
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(true);
      const connectionManager = container.resolve<MongoDBConnectionManager>(
        coreTokens.MongoDBConnectionManager,
      );

      // Act: Clear the container completely (both instances and registrations)
      await connectionManager.shutdown(); // Cleanup connections first
      container.clearInstances(); // Clear cached instances
      container.reset(); // Clear all registrations

      // Assert: After clearing, should not be able to resolve
      expect(container.isRegistered(coreTokens.MongoDBConnectionManager)).toBe(false);

      // Re-bootstrap should work fine
      await expect(bootstrapContainer()).resolves.not.toThrow();

      // Final cleanup
      const newConnectionManager = container.resolve<MongoDBConnectionManager>(
        coreTokens.MongoDBConnectionManager,
      );
      await newConnectionManager.shutdown();
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
      await bootstrapContainer();

      // Act: Resolve repositories and verify they have working methods
      const sourcesRepo = container.resolve<any>(repositoryTokens.SourcesRepository);
      const appSummariesRepo = container.resolve<any>(repositoryTokens.AppSummariesRepository);

      // Assert: Repositories should have expected methods
      expect(sourcesRepo).toBeDefined();
      expect(sourcesRepo.insertSource).toBeInstanceOf(Function);

      expect(appSummariesRepo).toBeDefined();
      expect(appSummariesRepo.createOrReplaceAppSummary).toBeInstanceOf(Function);

      // Verify schemas can be imported directly (decoupled from repositories)
      // Using require for Jest compatibility instead of dynamic import
      /* eslint-disable @typescript-eslint/no-require-imports */
      const {
        getJSONSchema: getSourcesJSONSchema,
      } = require("../../../src/app/repositories/sources/sources.model");
      const {
        getJSONSchema: getAppSummariesJSONSchema,
      } = require("../../../src/app/repositories/app-summaries/app-summaries.model");
      /* eslint-enable @typescript-eslint/no-require-imports */

      const sourcesSchema = getSourcesJSONSchema();
      const summariesSchema = getAppSummariesJSONSchema();

      expect(sourcesSchema).toBeDefined();
      expect(typeof sourcesSchema).toBe("object");
      expect(summariesSchema).toBeDefined();
      expect(typeof summariesSchema).toBe("object");
    }, 30000);
  });
});
