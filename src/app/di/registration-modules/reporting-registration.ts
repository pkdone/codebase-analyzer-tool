import { container } from "tsyringe";
import { reportingTokens } from "../tokens";

// Reporting component imports
import { HtmlReportWriter } from "../../components/reporting/html-report-writer";
import { HtmlReportAssetService } from "../../components/reporting/services/html-report-asset.service";
import { JsonReportWriter } from "../../components/reporting/json-report-writer";
import {
  FlowchartDiagramGenerator,
  DomainModelDiagramGenerator,
  ArchitectureDiagramGenerator,
  CurrentArchitectureDiagramGenerator,
} from "../../components/reporting/diagrams";
import { DatabaseReportDataProvider } from "../../components/reporting/sections/database/database-report-data-provider";
import { IntegrationPointsDataProvider } from "../../components/reporting/sections/integration-points/integration-points-data-provider";
import { AppStatisticsDataProvider } from "../../components/reporting/sections/overview/app-statistics-data-provider";
import { CategorizedSectionDataBuilder } from "../../components/reporting/sections/overview/categorized-section-data-builder";
import { DomainModelDataProvider } from "../../components/reporting/sections/visualizations/domain-model-data-provider";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import { FileTypesSection } from "../../components/reporting/sections/file-types/file-types-section";
import { DatabaseSection } from "../../components/reporting/sections/database/database-section";
import { IntegrationPointsSection } from "../../components/reporting/sections/integration-points/integration-points-section";
import { BusinessProcessesSection } from "../../components/reporting/sections/business-processes/business-processes-section";

// Visualization sections
import {
  DomainModelSection,
  MicroservicesArchitectureSection,
  CurrentArchitectureSection,
} from "../../components/reporting/sections/visualizations";

// Focused report sections
import { DependenciesSection } from "../../components/reporting/sections/dependencies/dependencies-section";
import { BomDataProvider } from "../../components/reporting/sections/dependencies/bom-data-provider";
import { BackgroundProcessesSection } from "../../components/reporting/sections/background-processes/background-processes-section";
import { ScheduledJobDataProvider } from "../../components/reporting/sections/background-processes/job-data-provider";
import { ArchitectureAnalysisSection } from "../../components/reporting/sections/architecture-analysis/architecture-analysis-section";
import { ModuleCouplingDataProvider } from "../../components/reporting/sections/architecture-analysis/module-coupling-data-provider";
import { UiAnalysisSection } from "../../components/reporting/sections/ui-analysis/ui-analysis-section";
import { ServerSideUiDataProvider } from "../../components/reporting/sections/ui-analysis/server-side-ui-data-provider";
import { CodeQualitySection } from "../../components/reporting/sections/code-quality/code-quality-section";
import { CodeQualityDataProvider } from "../../components/reporting/sections/code-quality/code-quality-data-provider";

/**
 * Register reporting-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - HTML and JSON report writing
 * - Data providers for various report sections
 * - Report generation orchestration
 */
export function registerReportingComponents(): void {
  // Register report writers, asset service, and generators
  container.registerSingleton(reportingTokens.HtmlReportAssetService, HtmlReportAssetService);
  container.registerSingleton(reportingTokens.HtmlReportWriter, HtmlReportWriter);
  container.registerSingleton(reportingTokens.JsonReportWriter, JsonReportWriter);
  container.registerSingleton(reportingTokens.FlowchartDiagramGenerator, FlowchartDiagramGenerator);
  container.registerSingleton(
    reportingTokens.DomainModelDiagramGenerator,
    DomainModelDiagramGenerator,
  );
  container.registerSingleton(
    reportingTokens.ArchitectureDiagramGenerator,
    ArchitectureDiagramGenerator,
  );
  container.registerSingleton(
    reportingTokens.CurrentArchitectureDiagramGenerator,
    CurrentArchitectureDiagramGenerator,
  );
  container.registerSingleton(
    reportingTokens.DatabaseReportDataProvider,
    DatabaseReportDataProvider,
  );
  container.registerSingleton(
    reportingTokens.IntegrationPointsDataProvider,
    IntegrationPointsDataProvider,
  );
  container.registerSingleton(reportingTokens.AppStatisticsDataProvider, AppStatisticsDataProvider);
  container.registerSingleton(
    reportingTokens.CategorizedSectionDataBuilder,
    CategorizedSectionDataBuilder,
  );
  container.registerSingleton(reportingTokens.DomainModelDataProvider, DomainModelDataProvider);
  container.registerSingleton(reportingTokens.AppReportGenerator, AppReportGenerator);

  // Register data providers for focused sections
  container.registerSingleton(reportingTokens.BomDataProvider, BomDataProvider);
  container.registerSingleton(reportingTokens.CodeQualityDataProvider, CodeQualityDataProvider);
  container.registerSingleton(reportingTokens.ScheduledJobDataProvider, ScheduledJobDataProvider);
  container.registerSingleton(
    reportingTokens.ModuleCouplingDataProvider,
    ModuleCouplingDataProvider,
  );
  container.registerSingleton(reportingTokens.ServerSideUiDataProvider, ServerSideUiDataProvider);
  console.log("Reporting components registered");

  // Register report sections using multi-injection pattern
  container.registerSingleton(reportingTokens.ReportSection, FileTypesSection);
  container.registerSingleton(reportingTokens.ReportSection, DatabaseSection);
  container.registerSingleton(reportingTokens.ReportSection, IntegrationPointsSection);
  container.registerSingleton(reportingTokens.ReportSection, BusinessProcessesSection);
  // Visualization sections
  container.registerSingleton(reportingTokens.ReportSection, DomainModelSection);
  container.registerSingleton(reportingTokens.ReportSection, MicroservicesArchitectureSection);
  container.registerSingleton(reportingTokens.ReportSection, CurrentArchitectureSection);
  // Focused analysis sections
  container.registerSingleton(reportingTokens.ReportSection, DependenciesSection);
  container.registerSingleton(reportingTokens.ReportSection, BackgroundProcessesSection);
  container.registerSingleton(reportingTokens.ReportSection, ArchitectureAnalysisSection);
  container.registerSingleton(reportingTokens.ReportSection, UiAnalysisSection);
  container.registerSingleton(reportingTokens.ReportSection, CodeQualitySection);
}
