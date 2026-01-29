import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import type { RequestableAppSummaryField } from "../../../../repositories/app-summaries/app-summaries.model";
import { reportingTokens } from "../../../../di/tokens";
import { ArchitectureDiagramGenerator } from "../../diagrams";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../config/reporting.config";
import { extractMicroservicesData } from "./microservices-data-extractor";

/**
 * Report section for potential microservices architecture visualizations.
 * Generates Mermaid diagrams showing suggested microservices and their relationships.
 * This section visualizes the hypothetical microservices decomposition of a monolithic application.
 * Diagrams are generated as Mermaid definitions and rendered client-side.
 */
@injectable()
export class PotentialMicroservicesSection implements ReportSection {
  constructor(
    @inject(reportingTokens.ArchitectureDiagramGenerator)
    private readonly architectureDiagramGenerator: ArchitectureDiagramGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.VISUALIZATIONS;
  }

  getRequiredAppSummaryFields(): readonly RequestableAppSummaryField[] {
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
