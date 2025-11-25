/**
 * Centralized dependency injection tokens for the entire application.
 * All DI tokens are consolidated here to provide a single source of truth.
 */

// Core application-wide tokens
export const coreTokens = {
  MongoClient: Symbol("MongoClient"),
  DatabaseName: Symbol("DatabaseName"),
  MongoDBClientFactory: Symbol("MongoDBClientFactory"),
  LLMRouter: Symbol("LLMRouter"),
  LLMModelFamily: Symbol("LLMModelFamily"),
  EnvVars: Symbol("EnvVars"),
  ProjectName: Symbol("ProjectName"),
  FileTypeMappingsConfig: Symbol("FileTypeMappingsConfig"),
} as const;

export type CoreToken = keyof typeof coreTokens;

// Repository layer tokens
export const repositoryTokens = {
  SourcesRepository: Symbol("ISourcesRepository"),
  AppSummariesRepository: Symbol("IAppSummariesRepository"),
} as const;

export type RepositoryToken = keyof typeof repositoryTokens;

// High-level task orchestrators tokens
export const taskTokens = {
  CodebaseCaptureTask: Symbol("CodebaseCaptureTask"),
  CodebaseQueryTask: Symbol("CodebaseQueryTask"),
  InsightsGenerationTask: Symbol("InsightsGenerationTask"),
  DirectInsightsGenerationTask: Symbol("DirectInsightsGenerationTask"),
  PluggableLLMsTestTask: Symbol("PluggableLLMsTestTask"),
  MongoConnectionTestTask: Symbol("MongoConnectionTestTask"),
  McpServerTask: Symbol("McpServerTask"),
  ReportGenerationTask: Symbol("ReportGenerationTask"),
  DatabaseInitializer: Symbol("DatabaseInitializer"),
} as const;

export type TaskToken = keyof typeof taskTokens;

// API/MCP module tokens
export const apiTokens = {
  InsightsDataProvider: Symbol("InsightsDataProvider"),
  McpServerFactory: Symbol("McpServerFactory"),
  McpHttpServer: Symbol("McpHttpServer"),
} as const;

export type ApiToken = keyof typeof apiTokens;

// Capture module tokens
export const captureTokens = {
  CodebaseToDBLoader: Symbol("CodebaseToDBLoader"),
} as const;

export type CaptureToken = keyof typeof captureTokens;

// Insights module tokens
export const insightsTokens = {
  InsightsFromDBGenerator: Symbol("InsightsFromDBGenerator"),
  InsightsFromRawCodeGenerator: Symbol("InsightsFromRawCodeGenerator"),
  PromptFileInsightsGenerator: Symbol("PromptFileInsightsGenerator"),
  InsightsProcessorSelector: Symbol("InsightsProcessorSelector"),
} as const;

export type InsightsToken = keyof typeof insightsTokens;

// LLM module tokens
export const llmTokens = {
  JsonProcessor: Symbol("JsonProcessor"),
  JsonValidator: Symbol("JsonValidator"),
  LLMStats: Symbol("LLMStats"),
  LLMStatsReporter: Symbol("LLMStatsReporter"),
  PromptAdaptationStrategy: Symbol("PromptAdaptationStrategy"),
  RetryStrategy: Symbol("RetryStrategy"),
  FallbackStrategy: Symbol("FallbackStrategy"),
  LLMExecutionPipeline: Symbol("LLMExecutionPipeline"),
  LLMRouter: Symbol("LLMRouter"),
  LLMModelFamily: Symbol("LLMModelFamily"),
} as const;

export type LLMToken = keyof typeof llmTokens;

// Reporting module tokens
export const reportingTokens = {
  HtmlReportWriter: Symbol("HtmlReportWriter"),
  JsonReportWriter: Symbol("JsonReportWriter"),
  DependencyTreePngGenerator: Symbol("DependencyTreePngGenerator"),
  PieChartGenerator: Symbol("PieChartGenerator"),
  FlowchartSvgGenerator: Symbol("FlowchartSvgGenerator"),
  DomainModelSvgGenerator: Symbol("DomainModelSvgGenerator"),
  ArchitectureSvgGenerator: Symbol("ArchitectureSvgGenerator"),
  DatabaseReportDataProvider: Symbol("DatabaseReportDataProvider"),
  CodeStructureDataProvider: Symbol("CodeStructureDataProvider"),
  AppStatisticsDataProvider: Symbol("AppStatisticsDataProvider"),
  AppSummaryCategoriesProvider: Symbol("AppSummaryCategoriesProvider"),
  DomainModelDataProvider: Symbol("DomainModelDataProvider"),
  AppReportGenerator: Symbol("AppReportGenerator"),
  BomDataProvider: Symbol("BomDataProvider"),
  CodeQualityDataProvider: Symbol("CodeQualityDataProvider"),
  JobDataProvider: Symbol("JobDataProvider"),
  ModuleCouplingDataProvider: Symbol("ModuleCouplingDataProvider"),
  UiDataProvider: Symbol("UiDataProvider"),
} as const;

export type ReportingToken = keyof typeof reportingTokens;
