import { container } from "tsyringe";
import { coreTokens } from "../tokens";
import { repositoryTokens } from "../tokens";
import { taskTokens } from "../tokens";
import { llmTokens } from "../tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/sources/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summaries/app-summaries.repository";
import { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";

// Domain-specific registration functions
import { registerCaptureComponents } from "./capture-registration";
import { registerInsightsComponents } from "./insights-registration";
import { registerReportingComponents } from "./reporting-registration";
import { registerQueryingComponents } from "./querying-registration";

// Task imports (these are top-level orchestrators for CLI commands)
import { CodebaseCaptureTask } from "../../tasks/codebase-capture.task";
import { CodebaseQueryTask } from "../../tasks/code-query.task";
import { InsightsGenerationTask } from "../../tasks/insights-generation.task";
import { DirectInsightsGenerationTask } from "../../tasks/direct-insights-generation.task";
import { MongoConnectionTestTask } from "../../tasks/mdb-connection-test.task";
import { PluggableLLMsTestTask } from "../../tasks/test-pluggable-llms.task";
import { ReportGenerationTask } from "../../tasks/report-generation.task";

// Configuration import
import { databaseConfig } from "../../repositories/config/database.config";

// LLM strategy and pipeline imports
import { RetryStrategy } from "../../../common/llm/strategies/retry-strategy";
import { LLMExecutionPipeline } from "../../../common/llm/llm-execution-pipeline";

// Database component imports
import { DatabaseInitializer } from "../../tasks/database-initializer";

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
 * Registers repositories in the DI container
 */
function registerRepositories(): void {
  // Register the default database name for the application
  container.registerInstance(coreTokens.DatabaseName, databaseConfig.CODEBASE_DB_NAME);

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
 * Always registers all components since tsyringe uses lazy-loading - components
 * are only instantiated when actually resolved.
 */
function registerComponents(): void {
  // Register LLM strategies and pipeline components (always register since they may be needed)
  // Note: FallbackStrategy and PromptAdaptationStrategy are now pure functions, not classes,
  // so they don't need to be registered in the DI container
  container.registerSingleton(llmTokens.RetryStrategy, RetryStrategy);
  container.registerSingleton(llmTokens.LLMExecutionPipeline, LLMExecutionPipeline);

  // Register database components
  container.registerSingleton(coreTokens.DatabaseInitializer, DatabaseInitializer);

  // Register domain-specific components (including LLM-dependent ones)
  // tsyringe's lazy-loading ensures components are only instantiated when actually needed
  registerCaptureComponents();
  registerInsightsComponents();
  registerReportingComponents();
  registerQueryingComponents();

  console.log("Internal helper components registered");
}

/**
 * Register main executable tasks as singletons using tsyringe's built-in singleton management.
 * These tasks represent the primary entry points for application functionality.
 */
function registerTasks(): void {
  // Register tasks that don't depend on LLMRouter as regular singletons
  container.registerSingleton(taskTokens.ReportGenerationTask, ReportGenerationTask);
  container.registerSingleton(taskTokens.MongoConnectionTestTask, MongoConnectionTestTask);
  // Register tasks that depend on LLMRouter with simplified singleton registrations
  registerLLMDependentTasks();
  console.log("Main executable tasks registered");
}

/**
 * Register tasks that depend on LLMRouter using simplified singleton registrations.
 * Since these classes use @injectable(), tsyringe will automatically handle dependency injection.
 */
function registerLLMDependentTasks(): void {
  // Simplified registrations using tsyringe's automatic dependency injection
  container.registerSingleton(taskTokens.CodebaseQueryTask, CodebaseQueryTask);
  container.registerSingleton(taskTokens.CodebaseCaptureTask, CodebaseCaptureTask);
  container.registerSingleton(taskTokens.InsightsGenerationTask, InsightsGenerationTask);
  container.registerSingleton(
    taskTokens.DirectInsightsGenerationTask,
    DirectInsightsGenerationTask,
  );
  container.registerSingleton(taskTokens.PluggableLLMsTestTask, PluggableLLMsTestTask);
  console.log("LLM-dependent tasks registered with simplified singleton registrations");
}
