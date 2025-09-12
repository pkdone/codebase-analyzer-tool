import { registerLLMProviders } from "./llm-registration";
import { registerBaseEnvDependencies, registerLlmEnvDependencies } from "./env-registration";
import { registerAppDependencies } from "./app-registration";
import { registerMongoDBDependencies } from "./mongodb-registration";

// Domain-specific registration functions (exported for testing and advanced usage)
import { registerCaptureComponents, registerLLMDependentCaptureComponents } from "./capture-registration";
import { registerInsightsComponents, registerLLMDependentInsightsComponents } from "./insights-registration";
import { registerReportingComponents } from "./reporting-registration";
import { registerApiComponents } from "./api-registration";
import { registerQueryingComponents, registerLLMDependentQueryingComponents } from "./querying-registration";

export {
  // Main registration functions
  registerBaseEnvDependencies,
  registerLlmEnvDependencies,
  registerLLMProviders,
  registerAppDependencies,
  registerMongoDBDependencies,
  
  // Domain-specific registration functions
  registerCaptureComponents,
  registerLLMDependentCaptureComponents,
  registerInsightsComponents,
  registerLLMDependentInsightsComponents,
  registerReportingComponents,
  registerApiComponents,
  registerQueryingComponents,
  registerLLMDependentQueryingComponents,
};
