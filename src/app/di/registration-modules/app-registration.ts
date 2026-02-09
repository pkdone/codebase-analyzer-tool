import { container } from "tsyringe";
import { coreTokens, insightsTokens, configTokens, serviceTokens } from "../tokens";
import { repositoryTokens } from "../tokens";
import { taskTokens } from "../tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/sources/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summaries/app-summaries.repository";
import { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";

// Domain-specific registration function
import { registerReportingComponents } from "./reporting-registration";

// Insights component imports
import InsightsGenerator from "../../components/insights/generators/insights-generator";
import { RequirementPromptExecutor } from "../../components/insights/generators/requirement-prompt-executor";
import { SinglePassInsightStrategy } from "../../components/insights/strategies/single-pass-insight-strategy";
import { MapReduceInsightStrategy } from "../../components/insights/strategies/map-reduce-insight-strategy";

// Task imports (these are top-level orchestrators for CLI commands)
import { CodebaseCaptureTask } from "../../tasks/main/codebase-capture.task";
import { CodebaseQueryTask } from "../../tasks/main/code-query.task";
import { InsightsGenerationTask } from "../../tasks/main/insights-generation.task";
import { FileBasedInsightsGenerationTask } from "../../tasks/main/file-based-insights-generation.task";
import { MongoConnectionTestTask } from "../../tasks/dev/mdb-connection-test.task";
import { PluggableLLMsTestTask } from "../../tasks/dev/test-pluggable-llms.task";
import { ListAvailableModelsTask } from "../../tasks/dev/list-available-models.task";
import { ReportGenerationTask } from "../../tasks/main/report-generation.task";

// Configuration imports
import { databaseConfig } from "../../config/database.config";
import { outputConfig } from "../../config/output.config";
import { fileProcessingRules } from "../../config/file-handling";
import { concurrencyConfig } from "../../config/concurrency.config";
import { codeQualityConfig } from "../../config/code-quality.config";

// Concurrency service import
import { LlmConcurrencyService } from "../../components/concurrency";

// Database component imports
import { DatabaseInitializer } from "../../components/database/database-initializer";

/**
 * Register all application-level dependencies (repositories, components, and tasks).
 * This orchestrator function delegates to domain-specific registration modules.
 */
export function registerAppDependencies(): void {
  registerRepositories();
  registerComponents();
  registerTasks();
}

/**
 * Registers repositories and configuration objects in the DI container
 */
function registerRepositories(): void {
  // Register configuration objects for dependency injection
  container.registerInstance(configTokens.DatabaseConfig, databaseConfig);
  container.registerInstance(configTokens.FileProcessingRules, fileProcessingRules);
  container.registerInstance(configTokens.ConcurrencyConfig, concurrencyConfig);
  container.registerInstance(configTokens.CodeQualityConfig, codeQualityConfig);

  // Register the default database name for the application (derived from config)
  container.registerInstance(coreTokens.DatabaseName, databaseConfig.CODEBASE_DB_NAME);

  // Register output configuration as a singleton instance
  container.registerInstance(coreTokens.OutputConfig, outputConfig);

  // Register repositories as singletons
  container.registerSingleton<SourcesRepository>(
    repositoryTokens.SourcesRepository,
    SourcesRepositoryImpl,
  );

  container.registerSingleton<AppSummariesRepository>(
    repositoryTokens.AppSummariesRepository,
    AppSummariesRepositoryImpl,
  );

  console.log("Repositories registered");
}

/**
 * Register component implementations that other parts of the system depend on.
 * Delegates to domain-specific registration modules for better organization.
 *
 * Note: LLM core components (RetryStrategy, LLMExecutionPipeline) are NOT registered
 * here because the LLMRouter is created via a factory pattern in llm-registration.ts
 * to keep the src/common/llm module framework-agnostic.
 *
 * Note: Capture components (CodebaseCaptureOrchestrator, etc.) are registered in
 * capture-registration.ts for better module cohesion.
 */
function registerComponents(): void {
  // Register concurrency services (shared across modules)
  container.registerSingleton(serviceTokens.LlmConcurrencyService, LlmConcurrencyService);

  // Register database components
  container.registerSingleton(coreTokens.DatabaseInitializer, DatabaseInitializer);

  // Register insights components
  container.registerSingleton(insightsTokens.RequirementPromptExecutor, RequirementPromptExecutor);
  container.registerSingleton(insightsTokens.InsightsGenerator, InsightsGenerator);
  container.registerSingleton(insightsTokens.SinglePassInsightStrategy, SinglePassInsightStrategy);
  container.registerSingleton(insightsTokens.MapReduceInsightStrategy, MapReduceInsightStrategy);

  // Register reporting components (kept separate due to size)
  registerReportingComponents();

  console.log("Internal helper components registered");
}

/**
 * Register all executable tasks as singletons using tsyringe's built-in singleton management.
 * These tasks represent the primary entry points for application functionality.
 * The DI container automatically resolves dependencies (including LLMRouter) for each task.
 */
function registerTasks(): void {
  // Report and utility tasks
  container.registerSingleton(taskTokens.ReportGenerationTask, ReportGenerationTask);
  container.registerSingleton(taskTokens.MongoConnectionTestTask, MongoConnectionTestTask);
  container.registerSingleton(taskTokens.ListAvailableModelsTask, ListAvailableModelsTask);

  // LLM-powered tasks (dependencies resolved automatically by tsyringe)
  container.registerSingleton(taskTokens.CodebaseQueryTask, CodebaseQueryTask);
  container.registerSingleton(taskTokens.CodebaseCaptureTask, CodebaseCaptureTask);
  container.registerSingleton(taskTokens.InsightsGenerationTask, InsightsGenerationTask);
  container.registerSingleton(
    taskTokens.FileBasedInsightsGenerationTask,
    FileBasedInsightsGenerationTask,
  );
  container.registerSingleton(taskTokens.PluggableLLMsTestTask, PluggableLLMsTestTask);

  console.log("Main executable tasks registered");
}
