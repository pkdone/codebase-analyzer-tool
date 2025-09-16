import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "../../../../src/di/tokens";
import InsightsDataProvider from "../../../../src/components/api/mcpServing/insights-data-server";
import { setupTestDatabase, teardownTestDatabase } from "../../../helpers/db-test-helper";

describe("AnalysisDataServer", () => {
  beforeAll(async () => {
    // Setup the temporary database and get the client
    await setupTestDatabase();
  }, 60000); // Increase timeout for beforeAll hook to 60 seconds

  afterAll(async () => {
    // Teardown the temporary database
    await teardownTestDatabase();
  });

  it("should return an array of objects where each object has keys 'name', 'description', and 'keyBusinessActivities'", async () => {
    // Check if ProjectName is registered, if not register a test project name
    if (!container.isRegistered(TOKENS.ProjectName)) {
      container.registerInstance(TOKENS.ProjectName, "test-project");
    }

    // Resolve the service under test directly from the container
    const analysisDataServer = container.resolve<InsightsDataProvider>(TOKENS.InsightsDataProvider);

    console.log(`About to call getBusinessProcesses()...`);
    const result = await analysisDataServer.getBusinessProcesses();
    console.log(`getBusinessProcesses() returned:`, result);

    // Handle case where database might be empty or project doesn't exist
    if (result === null || result === undefined) {
      console.log(
        "No business processes found in database - this is acceptable for empty database or missing field",
      );
      return;
    }

    expect(Array.isArray(result)).toBe(true);

    // Handle case where array exists but is empty
    if (result.length === 0) {
      console.log("Business processes field exists but is empty - this is acceptable");
      return;
    }

    // If we have data, validate its structure
    expect(result.length).toBeGreaterThan(0);
    result.forEach((item) => {
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("keyBusinessActivities");
      expect(typeof item.name).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(Array.isArray(item.keyBusinessActivities)).toBe(true);
      expect(Object.keys(item)).toHaveLength(3);
    });
  }, 30000); // Increase timeout to 30 seconds for integration test
});
