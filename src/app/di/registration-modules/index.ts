import { registerBaseEnvDependencies, registerLlmEnvDependencies } from "./env-registration";
import { registerAppDependencies } from "./app-registration";
import { registerMongoDBDependencies } from "./mongodb-registration";

// Domain-specific registration functions (exported for testing and advanced usage)
import { registerReportingComponents } from "./reporting-registration";
import { registerCaptureDependencies } from "./capture-registration";

export {
  // Main registration functions
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  registerAppDependencies,
  registerMongoDBDependencies,

  // Domain-specific registration functions
  registerReportingComponents,
  registerCaptureDependencies,
};
