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
import { AppStatisticsDataProvider } from "../../components/reporting/sections/quality-metrics/app-statistics-data-provider";
import { CategorizedSectionDataBuilder } from "../../components/reporting/sections/shared/categorized-section-data-builder";
import { DomainModelDataProvider } from "../../components/reporting/sections/visualizations/domain-model-data-provider";
import { BomDataProvider } from "../../components/reporting/sections/quality-metrics/bom-data-provider";
import { CodeQualityDataProvider } from "../../components/reporting/sections/quality-metrics/code-quality-data-provider";
import { ScheduledJobDataProvider } from "../../components/reporting/sections/quality-metrics/job-data-provider";
import { ModuleCouplingDataProvider } from "../../components/reporting/sections/quality-metrics/module-coupling-data-provider";
import { ServerSideUiDataProvider } from "../../components/reporting/sections/quality-metrics/server-side-ui-data-provider";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import { FileTypesSection } from "../../components/reporting/sections/file-types/file-types-section";
import { DatabaseSection } from "../../components/reporting/sections/database/database-section";
import { IntegrationPointsSection } from "../../components/reporting/sections/integration-points/integration-points-section";
import { ArchitectureAndDomainSection } from "../../components/reporting/sections/visualizations/architecture-and-domain-section";
import { QualityMetricsSection } from "../../components/reporting/sections/quality-metrics/quality-metrics-section";

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
  container.registerSingleton(reportingTokens.ReportSection, ArchitectureAndDomainSection);
  container.registerSingleton(reportingTokens.ReportSection, QualityMetricsSection);
}
