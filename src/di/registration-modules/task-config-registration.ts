import { taskTokens } from "../tasks.tokens";
import { TaskRunnerConfig } from "../../tasks/task.types";

/**
 * Task configuration mapping that defines what resources each task requires
 */
const TASK_CONFIGURATIONS = new Map<symbol, TaskRunnerConfig>([
  // Main application tasks that require both MongoDB and LLM
  [taskTokens.CodebaseCaptureTask, { requiresMongoDB: true, requiresLLM: true }],
  [taskTokens.CodebaseQueryTask, { requiresMongoDB: true, requiresLLM: true }],
  [taskTokens.InsightsGenerationTask, { requiresMongoDB: true, requiresLLM: true }],
  [taskTokens.McpServerTask, { requiresMongoDB: true, requiresLLM: true }],

  // Tasks with specific requirements
  [taskTokens.DirectInsightsGenerationTask, { requiresMongoDB: false, requiresLLM: true }],
  [taskTokens.MongoConnectionTestTask, { requiresMongoDB: true, requiresLLM: false }],
  [taskTokens.PluggableLLMsTestTask, { requiresMongoDB: false, requiresLLM: true }],
  [taskTokens.ReportGenerationTask, { requiresMongoDB: true, requiresLLM: false }],
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
