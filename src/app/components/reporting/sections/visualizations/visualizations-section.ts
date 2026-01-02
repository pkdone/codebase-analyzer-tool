import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { DomainModelDataProvider } from "./domain-model-data-provider";
import {
  FlowchartDiagramGenerator,
  DomainModelDiagramGenerator,
  ArchitectureDiagramGenerator,
  CurrentArchitectureDiagramGenerator,
  type InferredArchitectureData,
} from "../../diagrams";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import {
  extractKeyBusinessActivities,
  extractMicroserviceFields,
  isInferredArchitectureCategoryData,
} from "./visualizations-type-guards";
import {
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
  type CategorizedDataItem,
} from "../file-types/categories-data-provider";

/**
 * Report section for visualizations (flowcharts, domain diagrams, architecture diagrams).
 * Diagrams are generated as Mermaid definitions and rendered client-side.
 */
@injectable()
export class VisualizationsSection implements ReportSection {
  constructor(
    @inject(reportingTokens.DomainModelDataProvider)
    private readonly domainModelDataProvider: DomainModelDataProvider,
    @inject(reportingTokens.FlowchartDiagramGenerator)
    private readonly flowchartDiagramGenerator: FlowchartDiagramGenerator,
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
    return Promise.resolve({});
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async prepareHtmlData(
    baseData: ReportData,
    _sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    // Generate business processes flowcharts (synchronous - client-side rendering)
    const businessProcessesFlowchartSvgs = this.generateBusinessProcessesFlowcharts(
      baseData.categorizedData,
    );

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

    return {
      businessProcessesFlowchartSvgs,
      domainModelData,
      contextDiagramSvgs,
      microservicesData,
      architectureDiagramSvg,
      inferredArchitectureData,
      currentArchitectureDiagramSvg,
    };
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
      (category) => category.category === "businessProcesses",
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
      keyBusinessActivities: extractKeyBusinessActivities(item) ?? [],
    }));

    return this.flowchartDiagramGenerator.generateMultipleFlowchartDiagrams(businessProcesses);
  }

  /**
   * Extract microservices data from categorized data
   */
  private extractMicroservicesData(
    categorizedData: {
      category: string;
      label: string;
      data: CategorizedDataItem;
    }[],
  ): {
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
    const microservicesCategory = categorizedData.find(
      (category) => category.category === "potentialMicroservices",
    );

    if (
      !microservicesCategory ||
      !isCategorizedDataNameDescArray(microservicesCategory.data) ||
      microservicesCategory.data.length === 0
    ) {
      return [];
    }

    return microservicesCategory.data.map((item) => {
      // Use type guard to safely extract microservice-specific fields
      const microserviceFields = extractMicroserviceFields(item);
      return {
        name: item.name,
        description: item.description,
        entities: microserviceFields.entities,
        endpoints: microserviceFields.endpoints,
        operations: microserviceFields.operations,
      };
    });
  }

  /**
   * Extract inferred architecture data from categorized data
   */
  private extractInferredArchitectureData(
    categorizedData: {
      category: string;
      label: string;
      data: CategorizedDataItem;
    }[],
  ): InferredArchitectureData | null {
    const inferredArchitectureCategory = categorizedData.find(
      (category) => category.category === "inferredArchitecture",
    );

    if (
      !inferredArchitectureCategory ||
      !isCategorizedDataInferredArchitecture(inferredArchitectureCategory.data) ||
      inferredArchitectureCategory.data.length === 0
    ) {
      return null;
    }

    // The data array contains a single item with the architecture structure
    // Use type guard to validate the structure before accessing properties
    const rawData = inferredArchitectureCategory.data[0];
    if (!isInferredArchitectureCategoryData(rawData)) {
      return null;
    }

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
