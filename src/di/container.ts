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
 * Bootstrap the DI container based on task configuration.
 * Leverages tsyringe's built-in singleton management and isRegistered checks.
 */
export async function bootstrapContainer(config: TaskRunnerConfig): Promise<void> {
  if (config.requiresLLM) {
    await registerLlmEnvDependencies();
    registerLLMProviders();
    await initializeAndRegisterLLMComponents();
  } else {
    registerBaseEnvDependencies();
  }

  if (config.requiresMongoDB) {
    registerMongoDBDependencies();
    await connectAndRegisterMongoClient();
  }

  await registerAppDependencies(config);
}

export { container };
