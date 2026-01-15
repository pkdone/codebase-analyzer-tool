import "reflect-metadata";
import { container } from "tsyringe";
import {
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  registerMongoDBDependencies,
  registerAppDependencies,
  registerCaptureDependencies,
} from "./registration-modules";
import { connectAndRegisterMongoClient } from "./registration-modules/mongodb-registration";
import { initializeAndRegisterLLMComponents } from "./registration-modules/llm-registration";

/**
 * Bootstrap the DI container by registering all dependencies.
 */
export async function bootstrapContainer(): Promise<void> {
  registerLlmEnvDependencies();
  registerBaseEnvDependencies();
  await initializeAndRegisterLLMComponents();
  registerMongoDBDependencies();
  await connectAndRegisterMongoClient();
  registerCaptureDependencies();
  registerAppDependencies();
}

export { container };
