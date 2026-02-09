import type { ReportSection } from "./report-section.interface";
import type { RequestableAppSummaryField } from "../../../repositories/app-summaries/app-summaries.model";
import type { PreparedHtmlReportData } from "../types/html-report-data.types";
import type { PreparedJsonData } from "../json-report-writer";
import type { ReportData } from "../report-data.types";

/**
 * Abstract base class for report sections that provides common default implementations.
 *
 * This class reduces boilerplate in report section implementations by providing:
 * - Default `getRequiredAppSummaryFields()` returning empty array (most sections don't need app summary fields)
 * - Helper method `prepareSingleJsonData()` for the common pattern of outputting a single JSON file
 *
 * Subclasses must implement:
 * - `getName()`: Return the unique section name
 * - `getData()`: Fetch and return section-specific data
 * - `prepareHtmlData()`: Transform data for HTML template
 * - `prepareJsonData()`: Transform data for JSON output (can use helper method)
 */
export abstract class BaseReportSection implements ReportSection {
  /**
   * Get the app summary fields required by this section.
   * Default implementation returns an empty array since most sections
   * don't require app summary fields.
   *
   * Override this method in sections that need specific app summary fields.
   *
   * @returns Empty readonly array by default
   */
  getRequiredAppSummaryFields(): readonly RequestableAppSummaryField[] {
    return [];
  }

  /**
   * Helper method for preparing a single JSON file output.
   * This is the most common pattern where a section outputs one JSON file.
   *
   * @param data The data to output, or undefined if no data is available
   * @param filename The output filename (e.g., "module-coupling.json")
   * @returns Array with single PreparedJsonData entry, or empty array if data is undefined
   *
   * @example
   * ```typescript
   * prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
   *   return this.prepareSingleJsonData(sectionData.moduleCoupling, "module-coupling.json");
   * }
   * ```
   */
  protected prepareSingleJsonData(data: unknown, filename: string): PreparedJsonData[] {
    if (data === undefined) {
      return [];
    }

    return [{ filename, data }];
  }

  /**
   * Get the unique name of this report section.
   * Must be implemented by each section.
   */
  abstract getName(): string;

  /**
   * Fetch and process data needed for this section.
   * Must be implemented by each section.
   */
  abstract getData(projectName: string): Promise<Partial<ReportData>>;

  /**
   * Prepare data for HTML report output.
   * Must be implemented by each section.
   */
  abstract prepareHtmlData(
    baseData: ReportData,
    sectionData: Partial<ReportData>,
    htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null>;

  /**
   * Prepare data for JSON file output.
   * Must be implemented by each section.
   * Consider using `prepareSingleJsonData()` helper for simple single-file outputs.
   */
  abstract prepareJsonData(
    baseData: ReportData,
    sectionData: Partial<ReportData>,
  ): PreparedJsonData[];
}
