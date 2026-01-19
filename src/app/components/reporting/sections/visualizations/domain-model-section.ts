import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { DomainModelDataProvider } from "./domain-model-data-provider";
import { DomainModelDiagramGenerator } from "../../diagrams";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";

/**
 * Report section for domain model visualizations.
 * Generates Mermaid diagrams showing bounded contexts with their aggregates, entities, and repositories.
 * Diagrams are generated as Mermaid definitions and rendered client-side.
 */
@injectable()
export class DomainModelSection implements ReportSection {
  constructor(
    @inject(reportingTokens.DomainModelDataProvider)
    private readonly domainModelDataProvider: DomainModelDataProvider,
    @inject(reportingTokens.DomainModelDiagramGenerator)
    private readonly domainModelDiagramGenerator: DomainModelDiagramGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.VISUALIZATIONS;
  }

  getRequiredAppSummaryFields(): string[] {
    // This section requires bounded contexts data for domain model visualization
    return ["boundedContexts"];
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

    // Implementation of async interface - computation is synchronous but interface requires Promise
    return await Promise.resolve({
      domainModelData,
      contextDiagramSvgs,
    });
  }

  prepareJsonData(_baseData: ReportData, _sectionData: Partial<ReportData>): PreparedJsonData[] {
    // This section doesn't generate separate JSON files
    return [];
  }
}
