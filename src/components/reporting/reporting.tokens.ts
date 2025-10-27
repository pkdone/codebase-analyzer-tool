/**
 * Reporting module tokens for dependency injection.
 * These tokens are used to identify and inject reporting-related dependencies.
 */
export const reportingTokens = {
  HtmlReportWriter: Symbol("HtmlReportWriter"),
  JsonReportWriter: Symbol("JsonReportWriter"),
  DependencyTreePngGenerator: Symbol("DependencyTreePngGenerator"),
  PieChartGenerator: Symbol("PieChartGenerator"),
  FlowchartSvgGenerator: Symbol("FlowchartSvgGenerator"),
  DomainModelSvgGenerator: Symbol("DomainModelSvgGenerator"),
  ArchitectureSvgGenerator: Symbol("ArchitectureSvgGenerator"),
  DatabaseReportDataProvider: Symbol("DatabaseReportDataProvider"),
  CodeStructureDataProvider: Symbol("CodeStructureDataProvider"),
  AppStatisticsDataProvider: Symbol("AppStatisticsDataProvider"),
  AppSummaryCategoriesProvider: Symbol("AppSummaryCategoriesProvider"),
  DomainModelDataProvider: Symbol("DomainModelDataProvider"),
  AppReportGenerator: Symbol("AppReportGenerator"),
} as const;

export type ReportingToken = keyof typeof reportingTokens;
