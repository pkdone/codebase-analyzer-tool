import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import type { RequestableAppSummaryField } from "../../../../repositories/app-summaries/app-summaries.model";
import { reportingTokens } from "../../../../di/tokens";
import { CurrentArchitectureDiagramGenerator } from "./current-architecture-diagram-generator";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../config/reporting.config";
import { extractInferredArchitectureData } from "./inferred-architecture-extractor";

/**
 * Report section for inferred architecture visualizations.
 * Generates Mermaid diagrams showing the inferred architecture from the codebase.
 * Diagrams are generated as Mermaid definitions and rendered client-side.
 */
@injectable()
export class InferredArchitectureSection implements ReportSection {
  constructor(
    @inject(reportingTokens.CurrentArchitectureDiagramGenerator)
    private readonly currentArchitectureDiagramGenerator: CurrentArchitectureDiagramGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.VISUALIZATIONS;
  }

  getRequiredAppSummaryFields(): readonly RequestableAppSummaryField[] {
    // This section requires inferred architecture data for architecture visualization
    return ["inferredArchitecture"];
  }

  async getData(_projectName: string): Promise<Partial<ReportData>> {
    // This section uses categorized data that comes from baseData
    return await Promise.resolve({});
  }

  async prepareHtmlData(
    baseData: ReportData,
    _sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    // Extract inferred architecture data and generate diagram (synchronous)
    const inferredArchitectureData = extractInferredArchitectureData(baseData.categorizedData);
    const currentArchitectureDiagramSvg =
      this.currentArchitectureDiagramGenerator.generateCurrentArchitectureDiagram(
        inferredArchitectureData,
      );

    return await Promise.resolve({
      inferredArchitectureData,
      currentArchitectureDiagramSvg,
    });
  }

  prepareJsonData(_baseData: ReportData, _sectionData: Partial<ReportData>): PreparedJsonData[] {
    // This section doesn't generate separate JSON files
    return [];
  }
}
