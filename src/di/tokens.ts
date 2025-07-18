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

  // Services
  CodebaseCaptureService: Symbol.for("CodebaseCaptureService"),
  CodebaseQueryService: Symbol.for("CodebaseQueryService"),
  InsightsFromDBGenerationService: Symbol.for("InsightsFromDBGenerationService"),
  OneShotGenerateInsightsService: Symbol.for("OneShotGenerateInsightsService"),
  PluggableLLMsTestService: Symbol.for("PluggableLLMsTestService"),
  MDBConnectionTestService: Symbol.for("MDBConnectionTestService"),
  McpServerService: Symbol.for("McpServerService"),
  ReportGenerationService: Symbol.for("ReportGenerationService"),
  DBInitializerService: Symbol.for("DBInitializerService"),

  // Internal Helper Components
  FileSummarizer: Symbol.for("FileSummarizer"),
  FileHandlerFactory: Symbol.for("FileHandlerFactory"),
  LLMStats: Symbol.for("LLMStats"),
  PromptAdapter: Symbol.for("PromptAdapter"),
  HtmlReportFormatter: Symbol.for("HtmlReportFormatter"),
  AppReportGenerator: Symbol.for("AppReportGenerator"),
  CodebaseToDBLoader: Symbol.for("CodebaseToDBLoader"),
  CodeQuestioner: Symbol.for("CodeQuestioner"),
  DBCodeInsightsBackIntoDBGenerator: Symbol.for("DBCodeInsightsBackIntoDBGenerator"),
  RawCodeToInsightsFileGenerator: Symbol.for("RawCodeToInsightsFileGenerator"),

  // MCP Server Components
  InsightsDataServer: Symbol.for("InsightsDataServer"),
  McpDataServer: Symbol.for("McpDataServer"),
  McpHttpServer: Symbol.for("McpHttpServer"),
} as const;
