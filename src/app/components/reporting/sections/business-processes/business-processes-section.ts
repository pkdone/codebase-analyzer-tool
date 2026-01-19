import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { FlowchartDiagramGenerator } from "../../diagrams";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { type CategorizedSectionItem } from "../overview/categorized-section-data-builder";

/**
 * Report section for business process flowcharts.
 * Generates Mermaid flowcharts for business process visualization.
 */
@injectable()
export class BusinessProcessesSection implements ReportSection {
  constructor(
    @inject(reportingTokens.FlowchartDiagramGenerator)
    private readonly flowchartDiagramGenerator: FlowchartDiagramGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.BUSINESS_PROCESSES;
  }

  getRequiredAppSummaryFields(): string[] {
    // This section requires business processes data from app summaries
    return ["businessProcesses"];
  }

  async getData(_projectName: string): Promise<Partial<ReportData>> {
    // This section uses categorized data that comes from baseData
    // Return empty object as the data is already in baseData
    return await Promise.resolve({});
  }

  async prepareHtmlData(
    baseData: ReportData,
    _sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    // Generate business processes flowcharts (synchronous - client-side rendering)
    const businessProcessesFlowchartSvgs = this.generateBusinessProcessesFlowcharts(
      baseData.categorizedData,
    );

    // Implementation of async interface - computation is synchronous but interface requires Promise
    return await Promise.resolve({
      businessProcessesFlowchartSvgs,
    });
  }

  prepareJsonData(_baseData: ReportData, _sectionData: Partial<ReportData>): PreparedJsonData[] {
    // This section doesn't generate separate JSON files
    return [];
  }

  /**
   * Generate flowchart HTML for business processes (Mermaid definitions for client-side rendering).
   * Uses the discriminated union to automatically narrow the data type.
   */
  private generateBusinessProcessesFlowcharts(categorizedData: CategorizedSectionItem[]): string[] {
    // Find the businessProcesses category - type is automatically narrowed
    const businessProcessesCategory = categorizedData.find(
      (item): item is Extract<CategorizedSectionItem, { category: "businessProcesses" }> =>
        item.category === "businessProcesses",
    );

    if (!businessProcessesCategory || businessProcessesCategory.data.length === 0) {
      return [];
    }

    // Data is now typed as BusinessProcessesArray - fields are guaranteed by schema
    const businessProcesses = businessProcessesCategory.data.map((item) => ({
      name: item.name,
      description: item.description,
      keyBusinessActivities: item.keyBusinessActivities,
    }));

    return this.flowchartDiagramGenerator.generateMultipleFlowchartDiagrams(businessProcesses);
  }
}
