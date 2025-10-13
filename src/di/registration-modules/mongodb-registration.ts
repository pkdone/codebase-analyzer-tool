import { container } from "tsyringe";
import { TOKENS } from "../../tokens";
import { MongoDBClientFactory } from "../../common/mdb/mdb-client-factory";
import { databaseConfig } from "../../config/database.config";
import type { EnvVars } from "../../env/env.types";

/**
 * Register MongoDB-related dependencies.
 * Uses a factory function to handle async initialization cleanly while maintaining compatibility with testing.
 */
export function registerMongoDBDependencies(): void {
  if (container.isRegistered(TOKENS.MongoDBClientFactory)) {
    console.log("MongoDB dependencies already registered - skipping registration");
    return;
  }

  // Register the factory as singleton
  container.registerSingleton(TOKENS.MongoDBClientFactory, MongoDBClientFactory);
  console.log("MongoDB Client Factory initialized and registered as singleton");

  // Register MongoDBClientFactory as a shutdownable component for automatic cleanup
  container.register(TOKENS.Shutdownable, {
    useFactory: (c) => c.resolve(TOKENS.MongoDBClientFactory),
  });
  console.log("MongoDBClientFactory registered as shutdownable component");
}

/**
 * Connects to MongoDB and registers the client instance.
 * This function should be called during application bootstrap after registering dependencies.
 */
export async function connectAndRegisterMongoClient(): Promise<void> {
  if (container.isRegistered(TOKENS.MongoClient)) {
    console.log("MongoDB Client already registered - skipping connection");
    return;
  }

  const factory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);

  const client = await factory.connect(
    databaseConfig.DEFAULT_MONGO_SERVICE_ID,
    envVars.MONGODB_URL,
  );

  container.registerInstance(TOKENS.MongoClient, client);
  console.log("MongoDB Client connected and registered as instance");
}
