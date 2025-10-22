import { container } from "tsyringe";
import { TOKENS } from "../../tokens";

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
  container.registerSingleton(TOKENS.HtmlReportWriter, HtmlReportWriter);
  container.registerSingleton(TOKENS.JsonReportWriter, JsonReportWriter);
  container.registerSingleton(TOKENS.DependencyTreePngGenerator, DependencyTreePngGenerator);
  container.registerSingleton(TOKENS.PieChartGenerator, PieChartGenerator);
  container.registerSingleton(TOKENS.FlowchartSvgGenerator, FlowchartSvgGenerator);
  container.registerSingleton(TOKENS.DomainModelSvgGenerator, DomainModelSvgGenerator);
  container.registerSingleton(TOKENS.ArchitectureSvgGenerator, ArchitectureSvgGenerator);

  // Register data providers
  container.registerSingleton(TOKENS.DatabaseReportDataProvider, DatabaseReportDataProvider);
  container.registerSingleton(TOKENS.CodeStructureDataProvider, CodeStructureDataProvider);
  container.registerSingleton(TOKENS.AppStatisticsDataProvider, AppStatisticsDataProvider);
  container.registerSingleton(TOKENS.AppSummaryCategoriesProvider, AppSummaryCategoriesProvider);
  container.registerSingleton(TOKENS.DomainModelDataProvider, DomainModelDataProvider);

  // Register main report generator
  container.registerSingleton(TOKENS.AppReportGenerator, AppReportGenerator);

  console.log("Reporting components registered");
}
