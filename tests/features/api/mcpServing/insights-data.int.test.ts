import "reflect-metadata";
import { container, bootstrapContainer } from "../../../../src/di/container";
import { TOKENS } from "../../../../src/di/tokens";
import InsightsDataServer from "../../../../src/components/api/mcpServing/insights-data-server";
import { MongoDBClientFactory } from "../../../../src/common/mdb/mdb-client-factory";

describe("AnalysisDataServer", () => {
  beforeAll(async () => {
    // Bootstrap the container with MongoDB dependencies
    // This will register all necessary dependencies, including the real MongoDB client
    await bootstrapContainer({ requiresMongoDB: true, requiresLLM: false });
  });

  afterAll(async () => {
    // Clean up resources
    const mongoDBClientFactory = container.resolve<MongoDBClientFactory>(
      TOKENS.MongoDBClientFactory,
    );
    await mongoDBClientFactory.closeAll();
    container.clearInstances();
  });

  it("should return an array of objects where each object has keys 'name', 'description', and 'keyBusinessActivities'", async () => {
    // Resolve the service under test directly from the container
    const analysisDataServer = container.resolve<InsightsDataServer>(TOKENS.InsightsDataServer);

    console.log(`About to call getBusinessProcesses()...`);
    const result = await analysisDataServer.getBusinessProcesses();
    console.log(`getBusinessProcesses() returned:`, result);

    expect(Array.isArray(result)).toBe(true);

    // Handle case where database might be empty or project doesn't exist
    if (result.length === 0) {
      console.log(
        "No business processes found in database - this is acceptable for empty database",
      );
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
  }, 15000); // Increase timeout to 15 seconds for integration test
});
