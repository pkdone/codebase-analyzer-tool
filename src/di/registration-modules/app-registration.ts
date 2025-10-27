import { container } from "tsyringe";
import { coreTokens } from "../core.tokens";
import { repositoryTokens } from "../repositories.tokens";
import { taskTokens } from "../tasks.tokens";
import { llmTokens } from "../../llm/core/llm.tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/sources/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summaries/app-summaries.repository";
import { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";

// Domain-specific registration functions
import {
  registerCaptureComponents,
  registerLLMDependentCaptureComponents,
} from "./capture-registration";
import {
  registerInsightsComponents,
  registerLLMDependentInsightsComponents,
} from "./insights-registration";
import { registerReportingComponents } from "./reporting-registration";
import { registerApiComponents } from "./api-registration";
import {
  registerQueryingComponents,
  registerLLMDependentQueryingComponents,
} from "./querying-registration";

// Task imports (these are top-level orchestrators for CLI commands)
import { CodebaseCaptureTask } from "../../tasks/codebase-capture.task";
import { CodebaseQueryTask } from "../../tasks/code-query.task";
import { InsightsGenerationTask } from "../../tasks/insights-generation.task";
import { OneShotGenerateInsightsTask } from "../../tasks/one-shot-generate-insights.task";
import { MongoConnectionTestTask } from "../../tasks/mdb-connection-test.task";
import { PluggableLLMsTestTask } from "../../tasks/test-pluggable-llms.task";
import { McpServerTask } from "../../tasks/mcp-server.task";
import { ReportGenerationTask } from "../../tasks/report-generation.task";

// Configuration import
import { TaskRunnerConfig } from "../../tasks/task.types";
import { databaseConfig } from "../../config/database.config";

// LLM strategy and pipeline imports
import { RetryStrategy } from "../../llm/core/strategies/retry-strategy";
import { FallbackStrategy } from "../../llm/core/strategies/fallback-strategy";
import { LLMExecutionPipeline } from "../../llm/core/llm-execution-pipeline";

// Lifecycle imports
import { ShutdownService } from "../../lifecycle/shutdown-service";

// Database component imports
import { DatabaseInitializer } from "../../tasks/database-initializer";

/**
 * Register all application-level dependencies (repositories, components, and tasks).
 * This orchestrator function delegates to domain-specific registration modules.
 */
export function registerAppDependencies(config: TaskRunnerConfig): void {
  registerRepositories();
  registerComponents(config);
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
 */
function registerComponents(config: TaskRunnerConfig): void {
  // Register LLM strategies and pipeline components (always register since they may be needed)
  container.registerSingleton(llmTokens.RetryStrategy, RetryStrategy);
  container.registerSingleton(llmTokens.FallbackStrategy, FallbackStrategy);
  container.registerSingleton(llmTokens.LLMExecutionPipeline, LLMExecutionPipeline);

  // Register lifecycle services
  // ShutdownService uses multi-injection to automatically collect all Shutdownable components
  container.registerSingleton(coreTokens.ShutdownService, ShutdownService);

  // Register database components
  container.registerSingleton(taskTokens.DatabaseInitializer, DatabaseInitializer);

  // Register domain-specific components
  registerCaptureComponents();
  registerInsightsComponents();
  registerReportingComponents();
  registerApiComponents();
  registerQueryingComponents();

  // Register LLM-dependent components if required
  if (config.requiresLLM) {
    registerLLMDependentComponents();
  }

  console.log("Internal helper components registered");
}

/**
 * Register components that depend on LLMRouter using domain-specific registrations.
 * Delegates to domain-specific modules for better organization.
 */
function registerLLMDependentComponents(): void {
  // Register LLM-dependent components by domain
  registerLLMDependentCaptureComponents();
  registerLLMDependentInsightsComponents();
  registerLLMDependentQueryingComponents();
}

/**
 * Register main executable tasks as singletons using tsyringe's built-in singleton management.
 * These tasks represent the primary entry points for application functionality.
 */
function registerTasks(): void {
  // Register tasks that don't depend on LLMRouter as regular singletons
  container.registerSingleton(taskTokens.ReportGenerationTask, ReportGenerationTask);
  container.registerSingleton(taskTokens.MongoConnectionTestTask, MongoConnectionTestTask);
  container.registerSingleton(taskTokens.McpServerTask, McpServerTask);
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
  container.registerSingleton(taskTokens.OneShotGenerateInsightsTask, OneShotGenerateInsightsTask);
  container.registerSingleton(taskTokens.PluggableLLMsTestTask, PluggableLLMsTestTask);
  console.log("LLM-dependent tasks registered with simplified singleton registrations");
}
