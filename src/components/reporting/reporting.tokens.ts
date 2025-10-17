/**
 * Reporting & visualization related tokens.
 */
import { TOKENS } from "../../tokens";

export const reportingTokens = {
  HtmlReportWriter: TOKENS.HtmlReportWriter,
  JsonReportWriter: TOKENS.JsonReportWriter,
  DependencyTreePngGenerator: TOKENS.DependencyTreePngGenerator,
  PieChartGenerator: TOKENS.PieChartGenerator,
  AppReportGenerator: TOKENS.AppReportGenerator,
  DatabaseReportDataProvider: TOKENS.DatabaseReportDataProvider,
  CodeStructureDataProvider: TOKENS.CodeStructureDataProvider,
  AppStatisticsDataProvider: TOKENS.AppStatisticsDataProvider,
  AppSummaryCategoriesProvider: TOKENS.AppSummaryCategoriesProvider,
} as const;

export type ReportingToken = keyof typeof reportingTokens;
