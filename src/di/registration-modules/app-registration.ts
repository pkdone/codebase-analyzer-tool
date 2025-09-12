import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/source/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summary/app-summaries.repository";
import { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";

// Domain-specific registration functions
import { registerCaptureComponents, registerLLMDependentCaptureComponents } from "./capture-registration";
import { registerInsightsComponents, registerLLMDependentInsightsComponents } from "./insights-registration";
import { registerReportingComponents } from "./reporting-registration";
import { registerApiComponents } from "./api-registration";
import { registerQueryingComponents, registerLLMDependentQueryingComponents } from "./querying-registration";

// Task imports (these are top-level orchestrators for CLI commands)
import { CodebaseCaptureTask } from "../../tasks/codebase-capture.task";
import { CodebaseQueryTask } from "../../tasks/code-query.task";
import { InsightsGenerationTask } from "../../tasks/insights-generation.task";
import { OneShotGenerateInsightsTask } from "../../tasks/one-shot-generate-insights.task";
import { MDBConnectionTestTask } from "../../tasks/mdb-connection-test.task";
import { PluggableLLMsTestTask } from "../../tasks/test-pluggable-llms.task";
import { McpServerTask } from "../../tasks/mcp-server.task";
import { ReportGenerationTask } from "../../tasks/report-generation.task";
import { DBInitializerTask } from "../../tasks/db-initializer.task";

// Configuration import
import { TaskRunnerConfig } from "../../env/task.types";

// LLM strategy and pipeline imports
import { RetryStrategy } from "../../llm/core/strategies/retry-strategy";
import { FallbackStrategy } from "../../llm/core/strategies/fallback-strategy";
import { LLMExecutionPipeline } from "../../llm/core/llm-execution-pipeline";

/**
 * Register all application-level dependencies (repositories, components, and tasks).
 * This orchestrator function delegates to domain-specific registration modules.
 */
export async function registerAppDependencies(config: TaskRunnerConfig): Promise<void> {
  registerRepositories();
  await registerComponents(config);
  registerTasks();
}

/**
 * Registers repositories in the DI container
 */
function registerRepositories(): void {
  // Register repositories as singletons
  container.registerSingleton<SourcesRepository>(TOKENS.SourcesRepository, SourcesRepositoryImpl);

  container.registerSingleton<AppSummariesRepository>(
    TOKENS.AppSummariesRepository,
    AppSummariesRepositoryImpl,
  );

  console.log("Repositories registered");
}

/**
 * Register component implementations that other parts of the system depend on.
 * Delegates to domain-specific registration modules for better organization.
 */
async function registerComponents(config: TaskRunnerConfig): Promise<void> {
  // Register LLM strategies and pipeline components (always register since they may be needed)
  container.registerSingleton(TOKENS.RetryStrategy, RetryStrategy);
  container.registerSingleton(TOKENS.FallbackStrategy, FallbackStrategy);
  container.registerSingleton(TOKENS.LLMExecutionPipeline, LLMExecutionPipeline);

  // Register domain-specific components
  registerCaptureComponents();
  registerInsightsComponents();
  registerReportingComponents();
  registerApiComponents();
  registerQueryingComponents();

  // Register LLM-dependent components if required
  if (config.requiresLLM) {
    await registerLLMDependentComponents();
  }

  console.log("Internal helper components registered");
}

/**
 * Register components that depend on LLMRouter using domain-specific registrations.
 * Delegates to domain-specific modules for better organization.
 */
async function registerLLMDependentComponents(): Promise<void> {
  // Register LLM-dependent components by domain
  registerLLMDependentCaptureComponents();
  await registerLLMDependentInsightsComponents();
  registerLLMDependentQueryingComponents();
}

/**
 * Register main executable tasks as singletons using tsyringe's built-in singleton management.
 * These tasks represent the primary entry points for application functionality.
 */
function registerTasks(): void {
  // Register tasks that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.ReportGenerationTask, ReportGenerationTask);
  container.registerSingleton(TOKENS.DBInitializerTask, DBInitializerTask);
  container.registerSingleton(TOKENS.MDBConnectionTestTask, MDBConnectionTestTask);
  container.registerSingleton(TOKENS.McpServerTask, McpServerTask);
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
  container.registerSingleton(TOKENS.CodebaseQueryTask, CodebaseQueryTask);
  container.registerSingleton(TOKENS.CodebaseCaptureTask, CodebaseCaptureTask);
  container.registerSingleton(TOKENS.InsightsGenerationTask, InsightsGenerationTask);
  container.registerSingleton(TOKENS.OneShotGenerateInsightsTask, OneShotGenerateInsightsTask);
  container.registerSingleton(TOKENS.PluggableLLMsTestTask, PluggableLLMsTestTask);
  console.log("LLM-dependent tasks registered with simplified singleton registrations");
}
