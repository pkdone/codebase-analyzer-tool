import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/source/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summary/app-summaries.repository";
import { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";

// Component imports
import { FileSummarizer } from "../../components/capture/file-summarizer";
import { FileHandlerFactory } from "../../components/capture/file-handler-factory";
import { HtmlReportWriter } from "../../components/reporting/html-report-writer";
import { JsonReportWriter } from "../../components/reporting/json-report-writer";
import { DatabaseReportDataProvider } from "../../components/reporting/data-providers/database-report-data-provider";
import { AppStatisticsDataProvider } from "../../components/reporting/data-providers/app-statistics-data-provider";
import { CategoriesDataProvider } from "../../components/reporting/data-providers/categories-data-provider";
import { RawCodeToInsightsFileGenerator } from "../../components/insights/insights-from-raw-code-to-local-files";
import CodeQuestioner from "../../components/querying/code-questioner";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";
import InsightsFromDBGenerator from "../../components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/insights-from-raw-code-generator";
import InsightsDataServer from "../../components/api/mcpServing/insights-data-server";
import McpDataServer from "../../components/api/mcpServing/mcp-data-server";
import McpHttpServer from "../../components/api/mcpServing/mcp-http-server";

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

// Additional imports for the insights generator registration
import { EnvVars } from "../../env/env.types";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import { TaskRunnerConfig } from "../../env/task.types";

// LLM strategy and pipeline imports
import { RetryStrategy } from "../../llm/core/strategies/retry-strategy";
import { FallbackStrategy } from "../../llm/core/strategies/fallback-strategy";
import { LLMExecutionPipeline } from "../../llm/core/llm-execution-pipeline";

/**
 * Register all application-level dependencies (repositories, components, and tasks).
 * This consolidated registration function handles the core business logic dependencies.
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
  container.registerSingleton<SourcesRepository>(
    TOKENS.SourcesRepository,
    SourcesRepositoryImpl,
  );

  container.registerSingleton<AppSummariesRepository>(
    TOKENS.AppSummariesRepository,
    AppSummariesRepositoryImpl,
  );

  console.log("Repositories registered");
}

/**
 * Register component implementations that other parts of the system depend on.
 * These are internal helper components used to compose higher-level functionality.
 */
async function registerComponents(config: TaskRunnerConfig): Promise<void> {
  // Register file handling components
  container.registerSingleton(TOKENS.FileHandlerFactory, FileHandlerFactory);

  // Register LLM strategies and pipeline components (always register since they may be needed)
  container.registerSingleton(TOKENS.RetryStrategy, RetryStrategy);
  container.registerSingleton(TOKENS.FallbackStrategy, FallbackStrategy);
  container.registerSingleton(TOKENS.LLMExecutionPipeline, LLMExecutionPipeline);

  // Register report generation components
  container.registerSingleton(TOKENS.HtmlReportWriter, HtmlReportWriter);
  container.registerSingleton(TOKENS.JsonReportWriter, JsonReportWriter);
  container.registerSingleton(TOKENS.DatabaseReportDataProvider, DatabaseReportDataProvider);
  container.registerSingleton(TOKENS.AppStatisticsDataProvider, AppStatisticsDataProvider);
  container.registerSingleton(TOKENS.CategoriesDataProvider, CategoriesDataProvider);
  container.registerSingleton(TOKENS.AppReportGenerator, AppReportGenerator);
  container.registerSingleton(
    TOKENS.RawCodeToInsightsFileGenerator,
    RawCodeToInsightsFileGenerator,
  );
  container.registerSingleton(TOKENS.InsightsDataServer, InsightsDataServer);
  container.registerSingleton(TOKENS.McpDataServer, McpDataServer);
  container.registerSingleton(TOKENS.McpHttpServer, McpHttpServer);

  // Register components that depend on LLMRouter with simplified singleton registrations
  if (config.requiresLLM) {
    await registerLLMDependentComponents();
  }

  console.log("Internal helper components registered");
}

/**
 * Register components that depend on LLMRouter using simplified singleton registrations.
 * Since these classes use @injectable(), tsyringe will automatically handle dependency injection.
 */
async function registerLLMDependentComponents(): Promise<void> {
  // Simplified registrations using tsyringe's automatic dependency injection
  container.registerSingleton(TOKENS.FileSummarizer, FileSummarizer);
  container.registerSingleton(TOKENS.CodebaseToDBLoader, CodebaseToDBLoader);
  container.registerSingleton(TOKENS.CodeQuestioner, CodeQuestioner);
  container.registerSingleton(TOKENS.InsightsFromDBGenerator, InsightsFromDBGenerator);

  // Register both insights generator implementations
  container.registerSingleton(InsightsFromDBGenerator);
  container.registerSingleton(InsightsFromRawCodeGenerator);

  // Pre-load manifest to determine which InsightsGenerator implementation to use
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);
  const manifest = await LLMProviderManager.loadManifestForModelFamily(envVars.LLM);

  // Register the InsightsGenerator interface with synchronous factory based on manifest data
  container.register(TOKENS.InsightsGenerator, {
    useFactory: () => {
      if (manifest.supportsFullCodebaseAnalysis) {
        return container.resolve(InsightsFromRawCodeGenerator);
      } else {
        return container.resolve(InsightsFromDBGenerator);
      }
    },
  });
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
