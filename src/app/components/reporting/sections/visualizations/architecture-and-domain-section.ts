import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { DomainModelDataProvider } from "./domain-model-data-provider";
import {
  DomainModelDiagramGenerator,
  ArchitectureDiagramGenerator,
  CurrentArchitectureDiagramGenerator,
} from "../../diagrams";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import {
  extractMicroservicesData,
  extractInferredArchitectureData,
} from "./visualization-data-extractors";

/**
 * Report section for architecture and domain visualizations (domain models, microservices architecture, current architecture diagrams).
 * Diagrams are generated as Mermaid definitions and rendered client-side.
 *
 * Note: Business process flowcharts are handled by the separate BusinessProcessesSection.
 */
@injectable()
export class ArchitectureAndDomainSection implements ReportSection {
  constructor(
    @inject(reportingTokens.DomainModelDataProvider)
    private readonly domainModelDataProvider: DomainModelDataProvider,
    @inject(reportingTokens.DomainModelDiagramGenerator)
    private readonly domainModelDiagramGenerator: DomainModelDiagramGenerator,
    @inject(reportingTokens.ArchitectureDiagramGenerator)
    private readonly architectureDiagramGenerator: ArchitectureDiagramGenerator,
    @inject(reportingTokens.CurrentArchitectureDiagramGenerator)
    private readonly currentArchitectureDiagramGenerator: CurrentArchitectureDiagramGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.VISUALIZATIONS;
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
    // Generate domain model data and diagrams (synchronous - client-side rendering)
    const domainModelData = this.domainModelDataProvider.getDomainModelData(
      baseData.categorizedData,
    );
    const contextDiagramSvgs = this.domainModelDiagramGenerator.generateMultipleContextDiagrams(
      domainModelData.boundedContexts,
    );

    // Extract microservices data and generate architecture diagram (synchronous - client-side rendering)
    const microservicesData = extractMicroservicesData(baseData.categorizedData);
    const architectureDiagramSvg =
      this.architectureDiagramGenerator.generateArchitectureDiagram(microservicesData);

    // Extract inferred architecture data and generate current architecture diagram (synchronous)
    const inferredArchitectureData = extractInferredArchitectureData(baseData.categorizedData);
    const currentArchitectureDiagramSvg =
      this.currentArchitectureDiagramGenerator.generateCurrentArchitectureDiagram(
        inferredArchitectureData,
      );

    // Implementation of async interface - computation is synchronous but interface requires Promise
    return await Promise.resolve({
      domainModelData,
      contextDiagramSvgs,
      microservicesData,
      architectureDiagramSvg,
      inferredArchitectureData,
      currentArchitectureDiagramSvg,
    });
  }

  prepareJsonData(_baseData: ReportData, _sectionData: Partial<ReportData>): PreparedJsonData[] {
    // This section doesn't generate separate JSON files
    return [];
  }
}
