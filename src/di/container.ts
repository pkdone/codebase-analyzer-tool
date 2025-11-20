import "reflect-metadata";
import { container } from "tsyringe";
import { TaskRunnerConfig } from "../tasks/task.types";
import {
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  registerLLMProviders,
  registerMongoDBDependencies,
  registerAppDependencies,
} from "./registration-modules";
import { connectAndRegisterMongoClient } from "./registration-modules/mongodb-registration";
import { initializeAndRegisterLLMComponents } from "./registration-modules/llm-registration";

/**
 * Bootstrap the DI container by registering all dependencies.
 * Since tsyringe uses lazy-loading, dependencies are only instantiated when resolved,
 * so we can safely register everything without conditional logic.
 */
export async function bootstrapContainer(_config: TaskRunnerConfig): Promise<void> {
  // Always register all dependencies - tsyringe's lazy-loading ensures
  // they're only instantiated when actually needed
  await registerLlmEnvDependencies();
  registerBaseEnvDependencies();
  registerLLMProviders();
  await initializeAndRegisterLLMComponents();
  registerMongoDBDependencies();
  await connectAndRegisterMongoClient();
  registerAppDependencies(_config);
}

export { container };
