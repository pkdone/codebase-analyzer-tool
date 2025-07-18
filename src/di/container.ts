import "reflect-metadata";
import { container } from "tsyringe";
import { ServiceRunnerConfig } from "../lifecycle/service.types";
import {
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  registerLLMServices,
  registerMongoDBDependencies,
  registerAppDependencies,
} from "./registration-modules";

/**
 * Bootstrap the DI container based on service configuration.
 * Leverages tsyringe's built-in singleton management and isRegistered checks.
 */
export async function bootstrapContainer(config: ServiceRunnerConfig): Promise<void> {
  if (config.requiresLLM) {
    await registerLlmEnvDependencies();
    registerLLMServices();
  } else {
    registerBaseEnvDependencies();
  }

  if (config.requiresMongoDB) {
    await registerMongoDBDependencies();
  }

  registerAppDependencies();
}

export { container };
