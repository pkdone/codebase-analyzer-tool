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
  ListAvailableModelsTask: Symbol("ListAvailableModelsTask"),
} as const;

export type TaskToken = keyof typeof taskTokens;

// Capture module tokens
export const captureTokens = {
  CodebaseToDBLoader: Symbol("CodebaseToDBLoader"),
  FileSummarizerService: Symbol("FileSummarizerService"),
  FileTypePromptRegistry: Symbol("FileTypePromptRegistry"),
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
// Note: RetryStrategy and LLMExecutionPipeline are intentionally NOT included here because
// the LLMRouter is created via a factory pattern (llm-factory.ts) to keep the src/common/llm
// module framework-agnostic and independent of tsyringe.
export const llmTokens = {
  LLMExecutionStats: Symbol("LLMExecutionStats"),
  LLMRouter: Symbol("LLMRouter"),
  LLMModuleConfig: Symbol("LLMModuleConfig"),
  LLMErrorLogger: Symbol("LLMErrorLogger"),
} as const;

export type LLMToken = keyof typeof llmTokens;

// Configuration tokens for injectable configuration objects
export const configTokens = {
  DatabaseConfig: Symbol("DatabaseConfig"),
  FileProcessingRules: Symbol("FileProcessingRules"),
  ConcurrencyConfig: Symbol("ConcurrencyConfig"),
} as const;

export type ConfigToken = keyof typeof configTokens;

// Service tokens for application services
export const serviceTokens = {
  LlmConcurrencyService: Symbol("LlmConcurrencyService"),
} as const;

export type ServiceToken = keyof typeof serviceTokens;

// Reporting module tokens
export const reportingTokens = {
  HtmlReportWriter: Symbol("HtmlReportWriter"),
  HtmlReportAssetService: Symbol("HtmlReportAssetService"),
  JsonReportWriter: Symbol("JsonReportWriter"),
  FlowchartDiagramGenerator: Symbol("FlowchartDiagramGenerator"),
  DomainModelDiagramGenerator: Symbol("DomainModelDiagramGenerator"),
  ArchitectureDiagramGenerator: Symbol("ArchitectureDiagramGenerator"),
  CurrentArchitectureDiagramGenerator: Symbol("CurrentArchitectureDiagramGenerator"),
  DatabaseReportDataProvider: Symbol("DatabaseReportDataProvider"),
  AppStatisticsDataProvider: Symbol("AppStatisticsDataProvider"),
  CategorizedSectionDataBuilder: Symbol("CategorizedSectionDataBuilder"),
  DomainModelTransformer: Symbol("DomainModelTransformer"),
  AppReportGenerator: Symbol("AppReportGenerator"),
  BomDataProvider: Symbol("BomDataProvider"),
  CodeQualityDataProvider: Symbol("CodeQualityDataProvider"),
  ScheduledJobDataProvider: Symbol("ScheduledJobDataProvider"),
  ModuleCouplingDataProvider: Symbol("ModuleCouplingDataProvider"),
  JavaUiTechnologyDataProvider: Symbol("JavaUiTechnologyDataProvider"),
  JavaFrameworkAnalyzer: Symbol("JavaFrameworkAnalyzer"),
  JspMetricsAnalyzer: Symbol("JspMetricsAnalyzer"),
  IntegrationPointsDataProvider: Symbol("IntegrationPointsDataProvider"),
  ReportSection: Symbol("ReportSection"),
} as const;

export type ReportingToken = keyof typeof reportingTokens;
