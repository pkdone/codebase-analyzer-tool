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
import { HtmlReportFormatter } from "../../components/reporting/html-report-formatter";
import { JsonReportWriter } from "../../components/reporting/json-report-writer";
import { RawCodeToInsightsFileGenerator } from "../../components/insights/one-shot-insights-generator";
import CodeQuestioner from "../../components/querying/code-questioner";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";
import DBCodeInsightsBackIntoDBGenerator from "../../components/insights/db-code-insights-back-into-db-generator";
import InsightsDataServer from "../../components/api/mcpServing/insights-data-server";
import McpDataServer from "../../components/api/mcpServing/mcp-data-server";
import McpHttpServer from "../../components/api/mcpServing/mcp-http-server";

// Task imports (these are top-level orchestrators for CLI commands)
import { CodebaseCaptureTask } from "../../tasks/codebase-capture.task";
import { CodebaseQueryTask } from "../../tasks/code-query.task";
import { InsightsFromDBGenerationTask } from "../../tasks/insights-from-db-generation.task";
import { OneShotGenerateInsightsTask } from "../../tasks/one-shot-generate-insights.task";
import { MDBConnectionTestTask } from "../../tasks/mdb-connection-test.task";
import { PluggableLLMsTestTask } from "../../tasks/test-pluggable-llms.task";
import { McpServerTask } from "../../tasks/mcp-server.task";
import { ReportGenerationTask } from "../../tasks/report-generation.task";
import { DBInitializerTask } from "../../tasks/db-initializer.task";

/**
 * Register all application-level dependencies (repositories, components, and tasks).
 * This consolidated registration function handles the core business logic dependencies.
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
  // Register repositories
  container.register<SourcesRepository>(TOKENS.SourcesRepository, {
    useClass: SourcesRepositoryImpl,
  });

  container.register<AppSummariesRepository>(TOKENS.AppSummariesRepository, {
    useClass: AppSummariesRepositoryImpl,
  });

  console.log("Repositories registered");
}

/**
 * Register internal helper components.
 * Components that depend on LLMRouter use simplified singleton registrations.
 */
function registerComponents(): void {
  // Register components that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.FileHandlerFactory, FileHandlerFactory);
  container.registerSingleton(TOKENS.HtmlReportFormatter, HtmlReportFormatter);
  container.registerSingleton(TOKENS.JsonReportWriter, JsonReportWriter);
  container.registerSingleton(TOKENS.AppReportGenerator, AppReportGenerator);
  container.registerSingleton(
    TOKENS.RawCodeToInsightsFileGenerator,
    RawCodeToInsightsFileGenerator,
  );
  container.registerSingleton(TOKENS.InsightsDataServer, InsightsDataServer);
  container.registerSingleton(TOKENS.McpDataServer, McpDataServer);
  container.registerSingleton(TOKENS.McpHttpServer, McpHttpServer);
  // Register components that depend on LLMRouter with simplified singleton registrations
  registerLLMDependentComponents();
  console.log("Internal helper components registered");
}

/**
 * Register components that depend on LLMRouter using simplified singleton registrations.
 * Since these classes use @injectable(), tsyringe will automatically handle dependency injection.
 */
function registerLLMDependentComponents(): void {
  // Simplified registrations using tsyringe's automatic dependency injection
  container.registerSingleton(TOKENS.FileSummarizer, FileSummarizer);
  container.registerSingleton(TOKENS.CodebaseToDBLoader, CodebaseToDBLoader);
  container.registerSingleton(TOKENS.CodeQuestioner, CodeQuestioner);
  container.registerSingleton(
    TOKENS.DBCodeInsightsBackIntoDBGenerator,
    DBCodeInsightsBackIntoDBGenerator,
  );
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
  container.registerSingleton(TOKENS.InsightsFromDBGenerationTask, InsightsFromDBGenerationTask);
  container.registerSingleton(TOKENS.OneShotGenerateInsightsTask, OneShotGenerateInsightsTask);
  container.registerSingleton(TOKENS.PluggableLLMsTestTask, PluggableLLMsTestTask);
  console.log("LLM-dependent tasks registered with simplified singleton registrations");
}
