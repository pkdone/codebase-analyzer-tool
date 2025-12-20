import "reflect-metadata";
import { container } from "tsyringe";
import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";
import { coreTokens } from "../../../../src/app/di/tokens";
import { databaseConfig } from "../../../../src/app/components/database/database.config";
import { registerAppDependencies } from "../../../../src/app/di/registration-modules";
import { loadManifestForModelFamily } from "../../../../src/common/llm/utils/manifest-loader";

// Store client and dbName to be accessible in teardown
let testMongoClient: MongoClient | null = null;
let testDbName: string | null = null;

/**
 * Get the vector dimensions from the configured LLM provider for database initialization
 */
async function getVectorDimensions(): Promise<number> {
  const modelFamily = process.env.LLM;
  if (!modelFamily) {
    console.warn("LLM environment variable is not set. Using default 1536 dimensions.");
    return databaseConfig.DEFAULT_VECTOR_DIMENSIONS;
  }

  try {
    const manifest = loadManifestForModelFamily(modelFamily);
    const dimensions =
      manifest.models.embeddings.dimensions ?? databaseConfig.DEFAULT_VECTOR_DIMENSIONS;
    console.log(`Using ${dimensions} vector dimensions for model family: ${modelFamily}`);
    return dimensions;
  } catch (error) {
    console.warn(
      `Failed to load manifest for ${modelFamily}, using default ${databaseConfig.DEFAULT_VECTOR_DIMENSIONS} dimensions:`,
      error,
    );
    return databaseConfig.DEFAULT_VECTOR_DIMENSIONS;
  }
}

// Load environment variables if not already loaded
function ensureEnvLoaded(): void {
  if (!process.env.MONGODB_URL) {
    // Try to load from .env file
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("dotenv").config();
    } catch {
      // dotenv might not be installed, that's ok
    }
  }
}

/**
 * Sets up a temporary, isolated MongoDB database for integration tests.
 * - Creates a unique database name.
 * - Establishes a new MongoDB connection.
 * - Registers the client and database name in the DI container.
 * - Initializes the database schema (collections, indexes).
 * @returns The connected MongoClient instance.
 */
export async function setupTestDatabase(): Promise<MongoClient> {
  // Ensure environment variables are loaded
  ensureEnvLoaded();

  if (!process.env.MONGODB_URL) {
    throw new Error(
      "MONGODB_URL environment variable is not set. Cannot run integration tests. Please check your .env file.",
    );
  }

  testDbName = `test-db-${randomUUID()}`;
  testMongoClient = new MongoClient(process.env.MONGODB_URL);
  await testMongoClient.connect();

  // Clear previous registrations and register test-specific dependencies
  container.clearInstances();
  container.registerInstance(coreTokens.MongoClient, testMongoClient);
  container.registerInstance(coreTokens.DatabaseName, testDbName);

  // Set test environment for project name registration
  process.env.CODEBASE_DIR_PATH ??= "/test/project";

  // Register other application dependencies needed for the initializer
  registerAppDependencies();

  // Initialize the schema in the new test database
  const databaseInitializer = container.resolve<
    import("../../../../src/app/components/database/database-initializer").DatabaseInitializer
  >(coreTokens.DatabaseInitializer);
  const vectorDimensions = await getVectorDimensions();
  await databaseInitializer.initializeDatabaseSchema(vectorDimensions);

  console.log(`Test database '${testDbName}' created and initialized.`);
  return testMongoClient;
}

/**
 * Tears down the temporary database.
 * - Drops the entire test database.
 * - Closes the MongoDB connection.
 * - Clears the DI container.
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testMongoClient && testDbName) {
    try {
      // Try to drop the database - if it fails, that's okay (connection might be closed already)
      await testMongoClient.db(testDbName).dropDatabase();
      console.log(`Test database '${testDbName}' dropped.`);
    } catch (error) {
      console.error(`Failed to drop test database '${testDbName}':`, error);
    } finally {
      try {
        await testMongoClient.close();
      } catch (error) {
        console.error(`Error closing MongoDB client:`, error);
      }
      testMongoClient = null;
      testDbName = null;
      container.clearInstances();
    }
  }
}

/**
 * Populate test database with sample data for testing.
 * Call this after setupTestDatabase() if your tests need data.
 */
export async function populateTestData(): Promise<void> {
  if (!testMongoClient || !testDbName) {
    throw new Error("Test database not set up. Call setupTestDatabase() first.");
  }

  // You can add sample data insertion here if needed for specific tests
  // const db = testMongoClient.db(testDbName);
  // const appSummariesCollection = db.collection(databaseConfig.SUMMARIES_COLLECTION_NAME);
  // const sourcesCollection = db.collection(databaseConfig.SOURCES_COLLECTION_NAME);

  // These are optional - only insert if tests need pre-populated data
  console.log(`Test data populated in database '${testDbName}'.`);
}
