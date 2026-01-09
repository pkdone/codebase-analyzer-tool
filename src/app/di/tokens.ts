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
  OutputConfig: Symbol("OutputConfig"),
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
  FileBasedInsightsGenerationTask: Symbol("FileBasedInsightsGenerationTask"),
  PluggableLLMsTestTask: Symbol("PluggableLLMsTestTask"),
  MongoConnectionTestTask: Symbol("MongoConnectionTestTask"),
  ReportGenerationTask: Symbol("ReportGenerationTask"),
} as const;

export type TaskToken = keyof typeof taskTokens;

// Capture module tokens
export const captureTokens = {
  CodebaseToDBLoader: Symbol("CodebaseToDBLoader"),
  FileSummarizerService: Symbol("FileSummarizerService"),
  PromptManager: Symbol("PromptManager"),
  SourceConfigMap: Symbol("SourceConfigMap"),
} as const;

export type CaptureToken = keyof typeof captureTokens;

// Insights module tokens
export const insightsTokens = {
  InsightsFromDBGenerator: Symbol("InsightsFromDBGenerator"),
  PromptFileInsightsGenerator: Symbol("PromptFileInsightsGenerator"),
  SinglePassInsightStrategy: Symbol("SinglePassInsightStrategy"),
  MapReduceInsightStrategy: Symbol("MapReduceInsightStrategy"),
} as const;

export type InsightsToken = keyof typeof insightsTokens;

// LLM module tokens
export const llmTokens = {
  LLMTelemetryTracker: Symbol("LLMTelemetryTracker"),
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
  FlowchartDiagramGenerator: Symbol("FlowchartDiagramGenerator"),
  DomainModelDiagramGenerator: Symbol("DomainModelDiagramGenerator"),
  ArchitectureDiagramGenerator: Symbol("ArchitectureDiagramGenerator"),
  CurrentArchitectureDiagramGenerator: Symbol("CurrentArchitectureDiagramGenerator"),
  DatabaseReportDataProvider: Symbol("DatabaseReportDataProvider"),
  AppStatisticsDataProvider: Symbol("AppStatisticsDataProvider"),
  CategorizedSectionDataBuilder: Symbol("CategorizedSectionDataBuilder"),
  DomainModelDataProvider: Symbol("DomainModelDataProvider"),
  AppReportGenerator: Symbol("AppReportGenerator"),
  BomDataProvider: Symbol("BomDataProvider"),
  CodeQualityDataProvider: Symbol("CodeQualityDataProvider"),
  ScheduledTaskDataProvider: Symbol("ScheduledTaskDataProvider"),
  ModuleCouplingDataProvider: Symbol("ModuleCouplingDataProvider"),
  ServerSideUiDataProvider: Symbol("ServerSideUiDataProvider"),
  IntegrationPointsDataProvider: Symbol("IntegrationPointsDataProvider"),
  ReportSection: Symbol("ReportSection"),
} as const;

export type ReportingToken = keyof typeof reportingTokens;
