/**
 * Dependency Injection tokens for the application.
 * These tokens are used to identify and inject dependencies throughout the application.
 */
export const TOKENS = {
  // Core dependencies
  MongoClient: Symbol.for("MongoClient"),
  MongoDBClientFactory: Symbol.for("MongoDBClientFactory"),
  LLMRouter: Symbol.for("LLMRouter"),
  LLMService: Symbol.for("LLMService"),
  LLMModelFamily: Symbol.for("LLMModelFamily"),
  EnvVars: Symbol.for("EnvVars"),
  ProjectName: Symbol.for("ProjectName"),

  // Repositories
  SourcesRepository: Symbol.for("SourcesRepository"),
  AppSummariesRepository: Symbol.for("AppSummariesRepository"),

  // Tasks (formerly Services - these are top-level orchestrators for CLI commands)
  CodebaseCaptureTask: Symbol.for("CodebaseCaptureTask"),
  CodebaseQueryTask: Symbol.for("CodebaseQueryTask"),
  InsightsGenerationTask: Symbol.for("InsightsGenerationTask"),
  OneShotGenerateInsightsTask: Symbol.for("OneShotGenerateInsightsTask"),
  PluggableLLMsTestTask: Symbol.for("PluggableLLMsTestTask"),
  MDBConnectionTestTask: Symbol.for("MDBConnectionTestTask"),
  McpServerTask: Symbol.for("McpServerTask"),
  ReportGenerationTask: Symbol.for("ReportGenerationTask"),
  DBInitializerTask: Symbol.for("DBInitializerTask"),

  // Internal Helper Components
  FileSummarizer: Symbol.for("FileSummarizer"),
  FileHandlerFactory: Symbol.for("FileHandlerFactory"),
  LLMStats: Symbol.for("LLMStats"),
  PromptAdaptationStrategy: Symbol.for("PromptAdaptationStrategy"),
  RetryStrategy: Symbol.for("RetryStrategy"),
  FallbackStrategy: Symbol.for("FallbackStrategy"),
  LLMExecutionPipeline: Symbol.for("LLMExecutionPipeline"),
  HtmlReportFormatter: Symbol.for("HtmlReportFormatter"),
  JsonReportWriter: Symbol.for("JsonReportWriter"),
  AppReportGenerator: Symbol.for("AppReportGenerator"),
  DatabaseReportDataProvider: Symbol.for("DatabaseReportDataProvider"),
  AppStatisticsDataProvider: Symbol.for("AppStatisticsDataProvider"),
  CategoriesDataProvider: Symbol.for("CategoriesDataProvider"),
  CodebaseToDBLoader: Symbol.for("CodebaseToDBLoader"),
  CodeQuestioner: Symbol.for("CodeQuestioner"),
  InsightsGenerator: Symbol.for("InsightsGenerator"),
  InsightsFromDBGenerator: Symbol.for("InsightsFromDBGenerator"),
  RawCodeToInsightsFileGenerator: Symbol.for("RawCodeToInsightsFileGenerator"),

  // MCP Server Components
  InsightsDataServer: Symbol.for("InsightsDataServer"),
  McpDataServer: Symbol.for("McpDataServer"),
  McpHttpServer: Symbol.for("McpHttpServer"),
} as const;
