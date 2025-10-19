/**
 * Dependency Injection tokens for the application.
 * These tokens are used to identify and inject dependencies throughout the application.
 */
export const TOKENS = {
  // Core dependencies
  MongoClient: Symbol("MongoClient"),
  DatabaseName: Symbol("DatabaseName"),
  MongoDBClientFactory: Symbol("MongoDBClientFactory"),
  LLMRouter: Symbol("LLMRouter"),
  LLMProviderManager: Symbol("LLMProviderManager"),
  LLMModelFamily: Symbol("LLMModelFamily"),
  EnvVars: Symbol("EnvVars"),
  ProjectName: Symbol("ProjectName"),
  ShutdownService: Symbol("ShutdownService"),
  Shutdownable: Symbol("IShutdownable"),
  FileTypeMappingsConfig: Symbol("FileTypeMappingsConfig"),

  // Repositories (interface tokens)
  SourcesRepository: Symbol("ISourcesRepository"),
  AppSummariesRepository: Symbol("IAppSummariesRepository"),

  // Tasks (formerly Services - these are top-level orchestrators for CLI commands)
  CodebaseCaptureTask: Symbol("CodebaseCaptureTask"),
  CodebaseQueryTask: Symbol("CodebaseQueryTask"),
  InsightsGenerationTask: Symbol("InsightsGenerationTask"),
  OneShotGenerateInsightsTask: Symbol("OneShotGenerateInsightsTask"),
  PluggableLLMsTestTask: Symbol("PluggableLLMsTestTask"),
  MongoConnectionTestTask: Symbol("MongoConnectionTestTask"),
  McpServerTask: Symbol("McpServerTask"),
  ReportGenerationTask: Symbol("ReportGenerationTask"),

  // Internal Helper Components
  DatabaseInitializer: Symbol("DatabaseInitializer"),
  FileSummarizer: Symbol("FileSummarizer"),
  JsonProcessor: Symbol("JsonProcessor"),
  LLMStats: Symbol("LLMStats"),
  LLMStatsReporter: Symbol("LLMStatsReporter"),
  LLMInfoProvider: Symbol("LLMInfoProvider"),
  PromptAdaptationStrategy: Symbol("PromptAdaptationStrategy"),
  RetryStrategy: Symbol("RetryStrategy"),
  FallbackStrategy: Symbol("FallbackStrategy"),
  LLMExecutionPipeline: Symbol("LLMExecutionPipeline"),
  HtmlReportWriter: Symbol("HtmlReportWriter"),
  JsonReportWriter: Symbol("JsonReportWriter"),
  DependencyTreePngGenerator: Symbol("DependencyTreePngGenerator"),
  PieChartGenerator: Symbol("PieChartGenerator"),
  AppReportGenerator: Symbol("AppReportGenerator"),
  DatabaseReportDataProvider: Symbol("DatabaseReportDataProvider"),
  CodeStructureDataProvider: Symbol("CodeStructureDataProvider"),
  AppStatisticsDataProvider: Symbol("AppStatisticsDataProvider"),
  AppSummaryCategoriesProvider: Symbol("AppSummaryCategoriesProvider"),
  CodebaseToDBLoader: Symbol("CodebaseToDBLoader"),
  CodebaseQueryProcessor: Symbol("CodebaseQueryProcessor"),
  InsightsFromDBGenerator: Symbol("InsightsFromDBGenerator"),
  InsightsFromRawCodeGenerator: Symbol("InsightsFromRawCodeGenerator"),
  InsightsProcessorSelector: Symbol("InsightsProcessorSelector"),
  LocalInsightsGenerator: Symbol("LocalInsightsGenerator"),
  BomAggregator: Symbol.for("BomAggregator"),
  CodeQualityAggregator: Symbol.for("CodeQualityAggregator"),
  JobAggregator: Symbol.for("JobAggregator"),
  ModuleCouplingAggregator: Symbol.for("ModuleCouplingAggregator"),
  UiAggregator: Symbol.for("UiAggregator"),

  // MCP Server Components
  InsightsDataProvider: Symbol("InsightsDataProvider"),
  McpServerFactory: Symbol("McpServerFactory"),
  McpHttpServer: Symbol("McpHttpServer"),
} as const;

/**
 * NOTE: Tokens have been modularized into grouped files under `src/di` and `src/components/*`.
 * Existing imports of `TOKENS.X` continue to work; new code can import group-specific objects
 * like `coreTokens`, `repositoryTokens`, etc. for improved cohesion.
 */

export type TokenKey = keyof typeof TOKENS;
