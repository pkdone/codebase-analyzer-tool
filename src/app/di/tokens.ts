/**
 * Centralized dependency injection tokens for the entire application.
 * All DI tokens are consolidated here to provide a single source of truth.
 */

// Core application-wide tokens
export const coreTokens = {
  MongoClient: Symbol("MongoClient"),
  DatabaseName: Symbol("DatabaseName"),
  MongoDBConnectionManager: Symbol("MongoDBConnectionManager"),
  LLMRouter: Symbol("LLMRouter"),
  LLMModelFamily: Symbol("LLMModelFamily"),
  EnvVars: Symbol("EnvVars"),
  ProjectName: Symbol("ProjectName"),
  DatabaseInitializer: Symbol("DatabaseInitializer"),
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
  ReportGenerationTask: Symbol("ReportGenerationTask"),
} as const;

export type TaskToken = keyof typeof taskTokens;

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
  LLMStats: Symbol("LLMStats"),
  RetryStrategy: Symbol("RetryStrategy"),
  LLMExecutionPipeline: Symbol("LLMExecutionPipeline"),
  LLMRouter: Symbol("LLMRouter"),
  LLMModelFamily: Symbol("LLMModelFamily"),
  LLMErrorLogger: Symbol("LLMErrorLogger"),
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
  IntegrationPointsDataProvider: Symbol("IntegrationPointsDataProvider"),
} as const;

export type ReportingToken = keyof typeof reportingTokens;
