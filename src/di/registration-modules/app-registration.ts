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
import { RawCodeToInsightsFileGenerator } from "../../components/insights/one-shot-insights-generator";
import CodeQuestioner from "../../components/querying/code-questioner";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";
import DBCodeInsightsBackIntoDBGenerator from "../../components/insights/db-code-insights-back-into-db-generator";
import InsightsDataServer from "../../components/api/mcpServing/insights-data-server";
import McpDataServer from "../../components/api/mcpServing/mcp-data-server";
import McpHttpServer from "../../components/api/mcpServing/mcp-http-server";

// Service imports (flattened structure)
import { CodebaseCaptureService } from "../../services/codebase-capture.service";
import { CodebaseQueryService } from "../../services/code-query.service";
import { InsightsFromDBGenerationService } from "../../services/insights-from-db-generation.service";
import { OneShotGenerateInsightsService } from "../../services/one-shot-generate-insights.service";
import { MDBConnectionTestService } from "../../services/mdb-connection-test.service";
import { PluggableLLMsTestService } from "../../services/test-pluggable-llms.service";
import { McpServerService } from "../../services/mcp-server.service";
import { ReportGenerationService } from "../../services/report-generation-service";
import { DBInitializerService } from "../../lifecycle/db-initializer.service";

/**
 * Register all application-level dependencies (repositories, components, and services).
 * This consolidated registration function handles the core business logic dependencies.
 */
export function registerAppDependencies(): void {
  registerRepositories();
  registerComponents();
  registerServices();
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
 * Register main executable services as singletons using tsyringe's built-in singleton management.
 * These services represent the primary entry points for application functionality.
 */
function registerServices(): void {
  // Register services that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.ReportGenerationService, ReportGenerationService);
  container.registerSingleton(TOKENS.DBInitializerService, DBInitializerService);
  container.registerSingleton(TOKENS.MDBConnectionTestService, MDBConnectionTestService);
  container.registerSingleton(TOKENS.McpServerService, McpServerService);

  // Register services that depend on LLMRouter with simplified singleton registrations
  registerLLMDependentServices();

  console.log("Main executable services registered");
}

/**
 * Register services that depend on LLMRouter using simplified singleton registrations.
 * Since these classes use @injectable(), tsyringe will automatically handle dependency injection.
 */
function registerLLMDependentServices(): void {
  // Simplified registrations using tsyringe's automatic dependency injection
  container.registerSingleton(TOKENS.CodebaseQueryService, CodebaseQueryService);
  container.registerSingleton(TOKENS.CodebaseCaptureService, CodebaseCaptureService);
  container.registerSingleton(
    TOKENS.InsightsFromDBGenerationService,
    InsightsFromDBGenerationService,
  );
  container.registerSingleton(
    TOKENS.OneShotGenerateInsightsService,
    OneShotGenerateInsightsService,
  );
  container.registerSingleton(TOKENS.PluggableLLMsTestService, PluggableLLMsTestService);

  console.log("LLM-dependent services registered with simplified singleton registrations");
}
