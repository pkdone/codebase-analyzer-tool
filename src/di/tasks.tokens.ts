/**
 * High-level task orchestrators tokens.
 */
export const taskTokens = {
  CodebaseCaptureTask: Symbol("CodebaseCaptureTask"),
  CodebaseQueryTask: Symbol("CodebaseQueryTask"),
  InsightsGenerationTask: Symbol("InsightsGenerationTask"),
  OneShotGenerateInsightsTask: Symbol("OneShotGenerateInsightsTask"),
  PluggableLLMsTestTask: Symbol("PluggableLLMsTestTask"),
  MongoConnectionTestTask: Symbol("MongoConnectionTestTask"),
  McpServerTask: Symbol("McpServerTask"),
  ReportGenerationTask: Symbol("ReportGenerationTask"),
  DatabaseInitializer: Symbol("DatabaseInitializer"),
} as const;

export type TaskToken = keyof typeof taskTokens;
