/**
 * High-level task orchestrators tokens.
 */
import { TOKENS } from "../tokens";

export const taskTokens = {
  CodebaseCaptureTask: TOKENS.CodebaseCaptureTask,
  CodebaseQueryTask: TOKENS.CodebaseQueryTask,
  InsightsGenerationTask: TOKENS.InsightsGenerationTask,
  OneShotGenerateInsightsTask: TOKENS.OneShotGenerateInsightsTask,
  PluggableLLMsTestTask: TOKENS.PluggableLLMsTestTask,
  MDBConnectionTestTask: TOKENS.MDBConnectionTestTask,
  McpServerTask: TOKENS.McpServerTask,
  ReportGenerationTask: TOKENS.ReportGenerationTask,
  DatabaseInitializer: TOKENS.DatabaseInitializer,
} as const;

export type TaskToken = keyof typeof taskTokens;
