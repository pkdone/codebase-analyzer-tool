import { container } from "tsyringe";
import { reportingTokens } from "../tokens";

// Reporting component imports
import { HtmlReportWriter } from "../../components/reporting/html-report-writer";
import { JsonReportWriter } from "../../components/reporting/json-report-writer";
import { DependencyTreePngGenerator } from "../../components/reporting/generators/png/dependency-tree-png-generator";
import { PieChartGenerator } from "../../components/reporting/generators/png/pie-chart-generator";
import { FlowchartSvgGenerator } from "../../components/reporting/generators/svg/flowchart-svg-generator";
import { DomainModelSvgGenerator } from "../../components/reporting/generators/svg/domain-model-svg-generator";
import { ArchitectureSvgGenerator } from "../../components/reporting/generators/svg/architecture-svg-generator";
import { DatabaseReportDataProvider } from "../../components/reporting/data-providers/database-report-data-provider";
import { CodeStructureDataProvider } from "../../components/reporting/data-providers/code-structure-data-provider";
import { AppStatisticsDataProvider } from "../../components/reporting/data-providers/app-statistics-data-provider";
import { AppSummaryCategoriesProvider } from "../../components/reporting/data-providers/categories-data-provider";
import { DomainModelDataProvider } from "../../components/reporting/data-providers/domain-model-data-provider";
import { BomDataProvider } from "../../components/reporting/data-providers/bom-data-provider";
import { CodeQualityDataProvider } from "../../components/reporting/data-providers/code-quality-data-provider";
import { JobDataProvider } from "../../components/reporting/data-providers/job-data-provider";
import { ModuleCouplingDataProvider } from "../../components/reporting/data-providers/module-coupling-data-provider";
import { UiDataProvider } from "../../components/reporting/data-providers/ui-data-provider";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import { FileTypesSection } from "../../components/reporting/sections/file-types-section";
import { DatabaseSection } from "../../components/reporting/sections/database-section";
import { CodeStructureSection } from "../../components/reporting/sections/code-structure-section";
import { EnhancedUiSection } from "../../components/reporting/sections/enhanced-ui-section";
import { AdvancedDataSection } from "../../components/reporting/sections/advanced-data-section";

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
  container.registerSingleton(
    reportingTokens.DependencyTreePngGenerator,
    DependencyTreePngGenerator,
  );
  container.registerSingleton(reportingTokens.PieChartGenerator, PieChartGenerator);
  container.registerSingleton(reportingTokens.FlowchartSvgGenerator, FlowchartSvgGenerator);
  container.registerSingleton(reportingTokens.DomainModelSvgGenerator, DomainModelSvgGenerator);
  container.registerSingleton(reportingTokens.ArchitectureSvgGenerator, ArchitectureSvgGenerator);
  container.registerSingleton(
    reportingTokens.DatabaseReportDataProvider,
    DatabaseReportDataProvider,
  );
  container.registerSingleton(reportingTokens.CodeStructureDataProvider, CodeStructureDataProvider);
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

  // Register report sections (using multi-injection pattern - not supported by helper)
  container.registerSingleton("ReportSection", FileTypesSection);
  container.registerSingleton("ReportSection", DatabaseSection);
  container.registerSingleton("ReportSection", CodeStructureSection);
  container.registerSingleton("ReportSection", EnhancedUiSection);
  container.registerSingleton("ReportSection", AdvancedDataSection);
}
