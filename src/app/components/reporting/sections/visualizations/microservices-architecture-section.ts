import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { ArchitectureDiagramGenerator } from "../../diagrams";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { extractMicroservicesData } from "./visualization-data-extractors";

/**
 * Report section for microservices architecture visualizations.
 * Generates Mermaid diagrams showing potential microservices and their relationships.
 * Diagrams are generated as Mermaid definitions and rendered client-side.
 */
@injectable()
export class MicroservicesArchitectureSection implements ReportSection {
  constructor(
    @inject(reportingTokens.ArchitectureDiagramGenerator)
    private readonly architectureDiagramGenerator: ArchitectureDiagramGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.VISUALIZATIONS;
  }

  getRequiredAppSummaryFields(): string[] {
    // This section requires potential microservices data for architecture visualization
    return ["potentialMicroservices"];
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
    // Extract microservices data and generate architecture diagram (synchronous - client-side rendering)
    const microservicesData = extractMicroservicesData(baseData.categorizedData);
    const architectureDiagramSvg =
      this.architectureDiagramGenerator.generateArchitectureDiagram(microservicesData);

    // Implementation of async interface - computation is synchronous but interface requires Promise
    return await Promise.resolve({
      microservicesData,
      architectureDiagramSvg,
    });
  }

  prepareJsonData(_baseData: ReportData, _sectionData: Partial<ReportData>): PreparedJsonData[] {
    // This section doesn't generate separate JSON files
    return [];
  }
}
