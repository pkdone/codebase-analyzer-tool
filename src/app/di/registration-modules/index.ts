import { registerLLMProviders } from "./llm-registration";
import { registerBaseEnvDependencies, registerLlmEnvDependencies } from "./env-registration";
import { registerAppDependencies } from "./app-registration";
import { registerMongoDBDependencies } from "./mongodb-registration";

// Domain-specific registration function (exported for testing and advanced usage)
import { registerReportingComponents } from "./reporting-registration";

export {
  // Main registration functions
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  registerLLMProviders,
  registerAppDependencies,
  registerMongoDBDependencies,

  // Domain-specific registration function
  registerReportingComponents,
};
