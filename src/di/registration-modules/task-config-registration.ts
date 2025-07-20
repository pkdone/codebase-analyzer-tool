import { TOKENS } from "../tokens";
import { TaskRunnerConfig } from "../../lifecycle/task.types";

/**
 * Task configuration mapping that defines what resources each task requires
 */
const TASK_CONFIGURATIONS = new Map<symbol, TaskRunnerConfig>([
  // Main application tasks that require both MongoDB and LLM
  [TOKENS.CodebaseCaptureTask, { requiresMongoDB: true, requiresLLM: true }],
  [TOKENS.CodebaseQueryTask, { requiresMongoDB: true, requiresLLM: true }],
  [TOKENS.InsightsFromDBGenerationTask, { requiresMongoDB: true, requiresLLM: true }],
  [TOKENS.McpServerTask, { requiresMongoDB: true, requiresLLM: true }],

  // Tasks with specific requirements
  [TOKENS.OneShotGenerateInsightsTask, { requiresMongoDB: false, requiresLLM: true }],
  [TOKENS.MDBConnectionTestTask, { requiresMongoDB: true, requiresLLM: false }],
  [TOKENS.PluggableLLMsTestTask, { requiresMongoDB: false, requiresLLM: true }],
  [TOKENS.ReportGenerationTask, { requiresMongoDB: true, requiresLLM: false }],
]);

/**
 * Get task configuration for a given task token
 */
export function getTaskConfiguration(taskToken: symbol): TaskRunnerConfig {
  const config: TaskRunnerConfig | undefined = TASK_CONFIGURATIONS.get(taskToken);
  if (!config) {
    throw new Error(`No task configuration found for token: ${taskToken.toString()}`);
  }
  return config;
}
