import { container } from "tsyringe";
import { reportingTokens } from "../tokens";

// Reporting component imports
import { HtmlReportWriter } from "../../components/reporting/html-report-writer";
import { JsonReportWriter } from "../../components/reporting/json-report-writer";
import { FlowchartSvgGenerator } from "../../components/reporting/generators/svg/flowchart-svg-generator";
import { DomainModelSvgGenerator } from "../../components/reporting/generators/svg/domain-model-svg-generator";
import { ArchitectureSvgGenerator } from "../../components/reporting/generators/svg/architecture-svg-generator";
import { CurrentArchitectureSvgGenerator } from "../../components/reporting/generators/svg/current-architecture-svg-generator";
import { DatabaseReportDataProvider } from "../../components/reporting/sections/database/database-report-data-provider";
import { IntegrationPointsDataProvider } from "../../components/reporting/sections/integration-points/integration-points-data-provider";
import { AppStatisticsDataProvider } from "../../components/reporting/sections/quality-metrics/app-statistics-data-provider";
import { AppSummaryCategoriesProvider } from "../../components/reporting/sections/file-types/categories-data-provider";
import { DomainModelDataProvider } from "../../components/reporting/sections/visualizations/domain-model-data-provider";
import { BomDataProvider } from "../../components/reporting/sections/quality-metrics/bom-data-provider";
import { CodeQualityDataProvider } from "../../components/reporting/sections/quality-metrics/code-quality-data-provider";
import { JobDataProvider } from "../../components/reporting/sections/quality-metrics/job-data-provider";
import { ModuleCouplingDataProvider } from "../../components/reporting/sections/quality-metrics/module-coupling-data-provider";
import { UiDataProvider } from "../../components/reporting/sections/quality-metrics/ui-data-provider";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import { FileTypesSection } from "../../components/reporting/sections/file-types/file-types-section";
import { DatabaseSection } from "../../components/reporting/sections/database/database-section";
import { IntegrationPointsSection } from "../../components/reporting/sections/integration-points/integration-points-section";
import { VisualizationsSection } from "../../components/reporting/sections/visualizations/visualizations-section";
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
  // Register report writers and generators
  container.registerSingleton(reportingTokens.HtmlReportWriter, HtmlReportWriter);
  container.registerSingleton(reportingTokens.JsonReportWriter, JsonReportWriter);
  container.registerSingleton(reportingTokens.FlowchartSvgGenerator, FlowchartSvgGenerator);
  container.registerSingleton(reportingTokens.DomainModelSvgGenerator, DomainModelSvgGenerator);
  container.registerSingleton(reportingTokens.ArchitectureSvgGenerator, ArchitectureSvgGenerator);
  container.registerSingleton(
    reportingTokens.CurrentArchitectureSvgGenerator,
    CurrentArchitectureSvgGenerator,
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
    reportingTokens.AppSummaryCategoriesProvider,
    AppSummaryCategoriesProvider,
  );
  container.registerSingleton(reportingTokens.DomainModelDataProvider, DomainModelDataProvider);
  container.registerSingleton(reportingTokens.AppReportGenerator, AppReportGenerator);
  container.registerSingleton(reportingTokens.BomDataProvider, BomDataProvider);
  container.registerSingleton(reportingTokens.CodeQualityDataProvider, CodeQualityDataProvider);
  container.registerSingleton(reportingTokens.JobDataProvider, JobDataProvider);
  container.registerSingleton(
    reportingTokens.ModuleCouplingDataProvider,
    ModuleCouplingDataProvider,
  );
  container.registerSingleton(reportingTokens.UiDataProvider, UiDataProvider);
  console.log("Reporting components registered");

  // Register report sections using multi-injection pattern
  container.registerSingleton("ReportSection", FileTypesSection);
  container.registerSingleton("ReportSection", DatabaseSection);
  container.registerSingleton("ReportSection", IntegrationPointsSection);
  container.registerSingleton("ReportSection", VisualizationsSection);
  container.registerSingleton("ReportSection", QualityMetricsSection);
}
