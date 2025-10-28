import { container } from "tsyringe";
import { reportingTokens } from "../../components/reporting/reporting.tokens";

// Reporting component imports
import { HtmlReportWriter } from "../../components/reporting/html-report-writer";
import { JsonReportWriter } from "../../components/reporting/json-report-writer";
import { DependencyTreePngGenerator } from "../../components/reporting/generators/dependency-tree-png-generator";
import { PieChartGenerator } from "../../components/reporting/generators/pie-chart-generator";
import { FlowchartSvgGenerator } from "../../components/reporting/generators/flowchart-svg-generator";
import { DomainModelSvgGenerator } from "../../components/reporting/generators/domain-model-svg-generator";
import { ArchitectureSvgGenerator } from "../../components/reporting/generators/architecture-svg-generator";
import { DatabaseReportDataProvider } from "../../components/reporting/data-providers/database-report-data-provider";
import { CodeStructureDataProvider } from "../../components/reporting/data-providers/code-structure-data-provider";
import { AppStatisticsDataProvider } from "../../components/reporting/data-providers/app-statistics-data-provider";
import { AppSummaryCategoriesProvider } from "../../components/reporting/data-providers/categories-data-provider";
import { DomainModelDataProvider } from "../../components/reporting/data-providers/domain-model-data-provider";
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

  // Register data providers
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

  // Register report sections (using multi-injection pattern)
  container.registerSingleton("ReportSection", FileTypesSection);
  container.registerSingleton("ReportSection", DatabaseSection);
  container.registerSingleton("ReportSection", CodeStructureSection);
  container.registerSingleton("ReportSection", EnhancedUiSection);
  container.registerSingleton("ReportSection", AdvancedDataSection);

  // Register main report generator
  container.registerSingleton(reportingTokens.AppReportGenerator, AppReportGenerator);

  console.log("Reporting components registered");
}
