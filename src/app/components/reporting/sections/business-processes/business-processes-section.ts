import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { FlowchartDiagramGenerator } from "../../diagrams";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { extractKeyBusinessActivities } from "../visualizations/visualization-data-extractors";
import {
  isCategorizedDataNameDescArray,
  type CategorizedDataItem,
} from "../overview/categorized-section-data-builder";
import { AppSummaryCategories } from "../../../../schemas/app-summaries.schema";

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
   * Generate flowchart HTML for business processes (Mermaid definitions for client-side rendering)
   */
  private generateBusinessProcessesFlowcharts(
    categorizedData: {
      category: string;
      label: string;
      data: CategorizedDataItem;
    }[],
  ): string[] {
    const businessProcessesCategory = categorizedData.find(
      (category) => category.category === AppSummaryCategories.enum.businessProcesses,
    );

    if (
      !businessProcessesCategory ||
      !isCategorizedDataNameDescArray(businessProcessesCategory.data) ||
      businessProcessesCategory.data.length === 0
    ) {
      return [];
    }

    // Convert AppSummaryNameDescArray to BusinessProcess format using type guard
    const businessProcesses = businessProcessesCategory.data.map((item) => ({
      name: item.name,
      description: item.description,
      keyBusinessActivities: extractKeyBusinessActivities(item),
    }));

    return this.flowchartDiagramGenerator.generateMultipleFlowchartDiagrams(businessProcesses);
  }
}
