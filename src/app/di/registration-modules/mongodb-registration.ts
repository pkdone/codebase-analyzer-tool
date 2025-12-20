import { container } from "tsyringe";
import { coreTokens } from "../tokens";
import { MongoDBConnectionManager } from "../../../common/mongodb/mdb-connection-manager";
import { databaseConfig } from "../../components/database/database.config";
import type { EnvVars } from "../../env/env.types";

/**
 * Register MongoDB-related dependencies.
 * Uses a factory function to handle async initialization cleanly while maintaining compatibility with testing.
 */
export function registerMongoDBDependencies(): void {
  if (container.isRegistered(coreTokens.MongoDBConnectionManager)) {
    console.log("MongoDB dependencies already registered - skipping registration");
    return;
  }

  // Register the connection manager as singleton
  container.registerSingleton(coreTokens.MongoDBConnectionManager, MongoDBConnectionManager);
  console.log("MongoDB Connection Manager initialized and registered as singleton");
}

/**
 * Connects to MongoDB and registers the client instance.
 * This function should be called during application bootstrap after registering dependencies.
 */
export async function connectAndRegisterMongoClient(): Promise<void> {
  if (container.isRegistered(coreTokens.MongoClient)) {
    console.log("MongoDB Client already registered - skipping connection");
    return;
  }

  const connectionManager = container.resolve<MongoDBConnectionManager>(
    coreTokens.MongoDBConnectionManager,
  );
  const envVars = container.resolve<EnvVars>(coreTokens.EnvVars);

  const client = await connectionManager.connect(
    databaseConfig.DEFAULT_MONGO_SERVICE_ID,
    envVars.MONGODB_URL,
  );

  container.registerInstance(coreTokens.MongoClient, client);
  console.log("MongoDB Client connected and registered as instance");
}
