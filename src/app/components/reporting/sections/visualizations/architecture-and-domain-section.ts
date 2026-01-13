import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { DomainModelDataProvider } from "./domain-model-data-provider";
import {
  DomainModelDiagramGenerator,
  ArchitectureDiagramGenerator,
  CurrentArchitectureDiagramGenerator,
  type InferredArchitectureData,
} from "../../diagrams";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { isInferredArchitectureCategoryData } from "./visualization-data-extractors";
import { type CategorizedSectionItem } from "../overview/categorized-section-data-builder";

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
    const microservicesData = this.extractMicroservicesData(baseData.categorizedData);
    const architectureDiagramSvg =
      this.architectureDiagramGenerator.generateArchitectureDiagram(microservicesData);

    // Extract inferred architecture data and generate current architecture diagram (synchronous)
    const inferredArchitectureData = this.extractInferredArchitectureData(baseData.categorizedData);
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

  /**
   * Extract microservices data from categorized data.
   * Uses the discriminated union to automatically narrow the data type.
   */
  private extractMicroservicesData(categorizedData: CategorizedSectionItem[]): {
    name: string;
    description: string;
    entities: {
      name: string;
      description: string;
      attributes: string[];
    }[];
    endpoints: {
      path: string;
      method: string;
      description: string;
    }[];
    operations: {
      operation: string;
      method: string;
      description: string;
    }[];
  }[] {
    // Find the potentialMicroservices category - type is automatically narrowed
    const microservicesCategory = categorizedData.find(
      (item): item is Extract<CategorizedSectionItem, { category: "potentialMicroservices" }> =>
        item.category === "potentialMicroservices",
    );

    if (!microservicesCategory || microservicesCategory.data.length === 0) {
      return [];
    }

    // Data is now typed as PotentialMicroservicesArray - fields are guaranteed by schema
    return microservicesCategory.data.map((item) => ({
      name: item.name,
      description: item.description,
      entities: item.entities.map((entity) => ({
        name: entity.name,
        description: entity.description,
        attributes: entity.attributes ?? [], // attributes is optional in the schema
      })),
      endpoints: item.endpoints,
      operations: item.operations,
    }));
  }

  /**
   * Extract inferred architecture data from categorized data.
   * Uses the discriminated union to automatically narrow the data type.
   */
  private extractInferredArchitectureData(
    categorizedData: CategorizedSectionItem[],
  ): InferredArchitectureData | null {
    // Find the inferredArchitecture category - type is automatically narrowed
    const inferredArchitectureCategory = categorizedData.find(
      (item): item is Extract<CategorizedSectionItem, { category: "inferredArchitecture" }> =>
        item.category === "inferredArchitecture",
    );

    if (!inferredArchitectureCategory || inferredArchitectureCategory.data.length === 0) {
      return null;
    }

    // The data array contains a single item with the architecture structure
    // Use type guard to validate the structure before accessing properties
    const rawData = inferredArchitectureCategory.data[0];
    if (!isInferredArchitectureCategoryData(rawData)) {
      return null;
    }

    // Fields are guaranteed by the Zod schema
    return {
      internalComponents: rawData.internalComponents.map((c) => ({
        name: c.name,
        description: c.description,
      })),
      externalDependencies: rawData.externalDependencies.map((d) => ({
        name: d.name,
        type: d.type,
        description: d.description,
      })),
      dependencies: rawData.dependencies.map((dep) => ({
        from: dep.from,
        to: dep.to,
        description: dep.description,
      })),
    };
  }
}
