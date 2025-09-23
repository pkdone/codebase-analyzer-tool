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
  MDBConnectionTestTask: Symbol("MDBConnectionTestTask"),
  McpServerTask: Symbol("McpServerTask"),
  ReportGenerationTask: Symbol("ReportGenerationTask"),

  // Internal Helper Components
  DatabaseInitializer: Symbol("DatabaseInitializer"),
  FileSummarizer: Symbol("FileSummarizer"),
  PromptConfigFactory: Symbol("PromptConfigFactory"),
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
  CategoriesDataProvider: Symbol("CategoriesDataProvider"),
  CodebaseToDBLoader: Symbol("CodebaseToDBLoader"),
  CodebaseQueryProcessor: Symbol("CodebaseQueryProcessor"),
  ApplicationInsightsProcessor: Symbol("ApplicationInsightsProcessor"),
  InsightsFromDBGenerator: Symbol("InsightsFromDBGenerator"),
  InsightsFromRawCodeGenerator: Symbol("InsightsFromRawCodeGenerator"),
  InsightsProcessorSelector: Symbol("InsightsProcessorSelector"),
  RawCodeToInsightsFileGenerator: Symbol("RawCodeToInsightsFileGenerator"),

  // MCP Server Components
  InsightsDataProvider: Symbol("InsightsDataProvider"),
  McpDataServer: Symbol("McpDataServer"),
  McpHttpServer: Symbol("McpHttpServer"),
} as const;
