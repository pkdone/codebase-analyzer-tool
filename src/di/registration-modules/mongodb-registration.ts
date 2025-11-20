import { container } from "tsyringe";
import { coreTokens } from "../tokens";
import { MongoDBClientFactory } from "../../common/mongodb/mdb-client-factory";
import { databaseConfig } from "../../config/database.config";
import type { EnvVars } from "../../env/env.types";

/**
 * Register MongoDB-related dependencies.
 * Uses a factory function to handle async initialization cleanly while maintaining compatibility with testing.
 */
export function registerMongoDBDependencies(): void {
  if (container.isRegistered(coreTokens.MongoDBClientFactory)) {
    console.log("MongoDB dependencies already registered - skipping registration");
    return;
  }

  // Register the factory as singleton
  container.registerSingleton(coreTokens.MongoDBClientFactory, MongoDBClientFactory);
  console.log("MongoDB Client Factory initialized and registered as singleton");

  // Register MongoDBClientFactory as a shutdownable component for automatic cleanup
  container.register(coreTokens.Shutdownable, {
    useFactory: (c) => c.resolve(coreTokens.MongoDBClientFactory),
  });
  console.log("MongoDBClientFactory registered as shutdownable component");
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

  const factory = container.resolve<MongoDBClientFactory>(coreTokens.MongoDBClientFactory);
  const envVars = container.resolve<EnvVars>(coreTokens.EnvVars);

  const client = await factory.connect(
    databaseConfig.DEFAULT_MONGO_SERVICE_ID,
    envVars.MONGODB_URL,
  );

  container.registerInstance(coreTokens.MongoClient, client);
  console.log("MongoDB Client connected and registered as instance");
}
