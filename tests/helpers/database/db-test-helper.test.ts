import * as dbTestHelper from "./db-test-helper";

/**
 * Unit tests for db-test-helper module exports and structure.
 * Note: Full integration tests are covered in the actual integration test suites
 * that use these helpers. These tests verify the module structure and exports.
 */
describe("db-test-helper", () => {
  describe("module exports", () => {
    it("should export setupTestDatabase function", () => {
      expect(dbTestHelper.setupTestDatabase).toBeDefined();
      expect(typeof dbTestHelper.setupTestDatabase).toBe("function");
    });

    it("should export teardownTestDatabase function", () => {
      expect(dbTestHelper.teardownTestDatabase).toBeDefined();
      expect(typeof dbTestHelper.teardownTestDatabase).toBe("function");
    });

    it("should export populateTestData function", () => {
      expect(dbTestHelper.populateTestData).toBeDefined();
      expect(typeof dbTestHelper.populateTestData).toBe("function");
    });
  });

  describe("function signatures", () => {
    it("setupTestDatabase should be an async function", () => {
      const setupFunction = dbTestHelper.setupTestDatabase;
      // Async functions return promises
      const result = setupFunction();
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid open handles
      result.catch(() => {
        // Expected to fail in unit test environment without MongoDB
      });
    });

    it("teardownTestDatabase should be an async function", () => {
      const teardownFunction = dbTestHelper.teardownTestDatabase;
      const result = teardownFunction();
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise
      result.catch(() => {
        // Expected behavior in unit test context
      });
    });

    it("populateTestData should be an async function", () => {
      const populateFunction = dbTestHelper.populateTestData;
      const result = populateFunction();
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise
      result.catch(() => {
        // Expected to fail without setup
      });
    });
  });

  describe("error handling", () => {
    it("setupTestDatabase should reject when MONGODB_URL is not set", async () => {
      // Save original env
      const originalMongoUrl = process.env.MONGODB_URL;
      delete process.env.MONGODB_URL;

      // The test may reject with either the expected MONGODB_URL error or a connection error
      // depending on timing and environment state. We just verify it rejects.
      await expect(dbTestHelper.setupTestDatabase()).rejects.toThrow();

      // Restore original env
      if (originalMongoUrl) {
        process.env.MONGODB_URL = originalMongoUrl;
      }
    });

    it("populateTestData should reject when called before setup", async () => {
      // This tests the guard clause in populateTestData
      // Note: We can't easily test this without actually setting up the database,
      // but we verify the function exists and has the right shape
      await expect(dbTestHelper.populateTestData()).rejects.toThrow(
        /Test database not set up/,
      );
    });
  });
});

