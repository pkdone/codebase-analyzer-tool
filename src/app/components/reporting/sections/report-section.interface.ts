import type { PreparedHtmlReportData } from "../html-report-writer";
import type { PreparedJsonData } from "../json-report-writer";
import type { ReportData } from "../report-gen.types";

/**
 * Interface for report sections that encapsulate data fetching and processing for a specific part of the report.
 * Each section is responsible for:
 * - Fetching its own data
 * - Processing and transforming that data
 * - Contributing to both HTML and JSON report outputs
 */
export interface ReportSection {
  /**
   * Get the unique name of this report section
   */
  getName(): string;

  /**
   * Fetch and process data needed for this section.
   * This method is responsible for all data fetching operations.
   * @param projectName The name of the project
   * @returns Promise resolving to a Partial<ReportData> containing the fields this section contributes
   */
  getData(projectName: string): Promise<Partial<ReportData>>;

  /**
   * Prepare data for HTML report output.
   * This should transform the raw data into the format needed by the HTML template.
   * @param baseData The base report data available to all sections
   * @param sectionData The data returned by getData() for this section
   * @param htmlDir The directory where the HTML report will be generated
   * @returns Promise resolving to the prepared HTML data for this section, or null if this section doesn't contribute to HTML
   */
  prepareHtmlData(
    baseData: ReportData,
    sectionData: Partial<ReportData>,
    htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null>;

  /**
   * Prepare data for JSON file output.
   * This should transform the section data into the format needed for JSON output.
   * @param baseData The base report data available to all sections
   * @param sectionData The data returned by getData() for this section
   * @returns Array of filename/data pairs for JSON output, or empty array if no JSON files are needed
   */
  prepareJsonData(baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[];
}
