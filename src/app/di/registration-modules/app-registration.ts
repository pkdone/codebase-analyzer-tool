import { container } from "tsyringe";
import { coreTokens, captureTokens, insightsTokens } from "../tokens";
import { repositoryTokens } from "../tokens";
import { taskTokens } from "../tokens";
import { llmTokens } from "../tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/sources/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summaries/app-summaries.repository";
import { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";

// Domain-specific registration function
import { registerReportingComponents } from "./reporting-registration";

// Capture component imports
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/generators/db-insights-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/generators/raw-code-insights-generator";
import { PromptFileInsightsGenerator } from "../../components/insights/generators/prompt-file-insights-generator";
import { InsightsProcessorSelector } from "../../components/insights/generators/insights-processor-selector";
import { SinglePassInsightStrategy } from "../../components/insights/strategies/single-pass-completion-strategy";
import { MapReduceInsightStrategy } from "../../components/insights/strategies/map-reduce-completion-strategy";

// Task imports (these are top-level orchestrators for CLI commands)
import { CodebaseCaptureTask } from "../../tasks/main/codebase-capture.task";
import { CodebaseQueryTask } from "../../tasks/main/code-query.task";
import { InsightsGenerationTask } from "../../tasks/main/insights-generation.task";
import { FileBasedInsightsGenerationTask } from "../../tasks/main/direct-insights-generation.task";
import { MongoConnectionTestTask } from "../../tasks/dev/mdb-connection-test.task";
import { PluggableLLMsTestTask } from "../../tasks/dev/test-pluggable-llms.task";
import { ReportGenerationTask } from "../../tasks/main/report-generation.task";

// Configuration imports
import { databaseConfig } from "../../components/database/database.config";
import { outputConfig } from "../../config/output.config";

// LLM strategy and pipeline imports
import { RetryStrategy } from "../../../common/llm/strategies/retry-strategy";
import { LLMExecutionPipeline } from "../../../common/llm/llm-execution-pipeline";

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
 * Registers repositories in the DI container
 */
function registerRepositories(): void {
  // Register the default database name for the application
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
 * Always registers all components since tsyringe uses lazy-loading - components
 * are only instantiated when actually resolved.
 */
function registerComponents(): void {
  // Register LLM strategies and pipeline components (always register since they may be needed)
  container.registerSingleton(llmTokens.RetryStrategy, RetryStrategy);
  container.registerSingleton(llmTokens.LLMExecutionPipeline, LLMExecutionPipeline);

  // Register database components
  container.registerSingleton(coreTokens.DatabaseInitializer, DatabaseInitializer);

  // Register capture components
  container.registerSingleton(captureTokens.CodebaseToDBLoader, CodebaseToDBLoader);

  // Register insights components
  container.registerSingleton(
    insightsTokens.PromptFileInsightsGenerator,
    PromptFileInsightsGenerator,
  );
  container.registerSingleton(insightsTokens.InsightsFromDBGenerator, InsightsFromDBGenerator);
  container.registerSingleton(
    insightsTokens.InsightsFromRawCodeGenerator,
    InsightsFromRawCodeGenerator,
  );
  container.registerSingleton(insightsTokens.InsightsProcessorSelector, InsightsProcessorSelector);
  container.registerSingleton(insightsTokens.SinglePassInsightStrategy, SinglePassInsightStrategy);
  container.registerSingleton(insightsTokens.MapReduceInsightStrategy, MapReduceInsightStrategy);

  // Register reporting components (kept separate due to size)
  registerReportingComponents();

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
    taskTokens.FileBasedInsightsGenerationTask,
    FileBasedInsightsGenerationTask,
  );
  container.registerSingleton(taskTokens.PluggableLLMsTestTask, PluggableLLMsTestTask);
  console.log("LLM-dependent tasks registered with simplified singleton registrations");
}
