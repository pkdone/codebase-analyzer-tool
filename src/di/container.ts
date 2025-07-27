import "reflect-metadata";
import { container } from "tsyringe";
import { TaskRunnerConfig } from "../lifecycle/task.types";
import {
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  registerLLMProviders,
  registerMongoDBDependencies,
  registerAppDependencies,
} from "./registration-modules";

/**
 * Bootstrap the DI container based on task configuration.
 * Leverages tsyringe's built-in singleton management and isRegistered checks.
 */
export async function bootstrapContainer(config: TaskRunnerConfig): Promise<void> {
  if (config.requiresLLM) {
    await registerLlmEnvDependencies();
    registerLLMProviders();
  } else {
    registerBaseEnvDependencies();
  }

  if (config.requiresMongoDB) {
    await registerMongoDBDependencies();
  }

  await registerAppDependencies(config);
}

export { container };
