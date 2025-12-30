import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { DomainModelDataProvider } from "./domain-model-data-provider";
import { FlowchartSvgGenerator } from "../../generators/svg/flowchart-svg-generator";
import { DomainModelSvgGenerator } from "../../generators/svg/domain-model-svg-generator";
import { ArchitectureSvgGenerator } from "../../generators/svg/architecture-svg-generator";
import {
  CurrentArchitectureSvgGenerator,
  type InferredArchitectureData,
} from "../../generators/svg/current-architecture-svg-generator";
import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-gen.types";
import { SECTION_NAMES } from "../../reporting.constants";
import {
  extractKeyBusinessActivities,
  extractMicroserviceFields,
  isInferredArchitectureCategoryData,
} from "./visualizations-type-guards";

/**
 * Report section for visualizations (flowcharts, domain diagrams, architecture diagrams).
 */
@injectable()
export class VisualizationsSection implements ReportSection {
  constructor(
    @inject(reportingTokens.DomainModelDataProvider)
    private readonly domainModelDataProvider: DomainModelDataProvider,
    @inject(reportingTokens.FlowchartSvgGenerator)
    private readonly flowchartSvgGenerator: FlowchartSvgGenerator,
    @inject(reportingTokens.DomainModelSvgGenerator)
    private readonly domainModelSvgGenerator: DomainModelSvgGenerator,
    @inject(reportingTokens.ArchitectureSvgGenerator)
    private readonly architectureSvgGenerator: ArchitectureSvgGenerator,
    @inject(reportingTokens.CurrentArchitectureSvgGenerator)
    private readonly currentArchitectureSvgGenerator: CurrentArchitectureSvgGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.VISUALIZATIONS;
  }

  async getData(_projectName: string): Promise<Partial<ReportData>> {
    // This section uses categorized data that comes from baseData
    // Return empty object as the data is already in baseData
    return Promise.resolve({});
  }

  async prepareHtmlData(
    baseData: ReportData,
    _sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    // Generate business processes flowcharts
    const businessProcessesFlowchartSvgs = await this.generateBusinessProcessesFlowcharts(
      baseData.categorizedData,
    );

    // Generate domain model data and diagrams
    const domainModelData = this.domainModelDataProvider.getDomainModelData(
      baseData.categorizedData,
    );
    const contextDiagramSvgs =
      await this.domainModelSvgGenerator.generateMultipleContextDiagramsSvg(
        domainModelData.boundedContexts,
      );

    // Extract microservices data and generate architecture diagram
    const microservicesData = this.extractMicroservicesData(baseData.categorizedData);
    const architectureDiagramSvg =
      await this.architectureSvgGenerator.generateArchitectureDiagramSvg(
        microservicesData,
        baseData.integrationPoints,
      );

    // Extract inferred architecture data and generate current architecture diagram
    const inferredArchitectureData = this.extractInferredArchitectureData(baseData.categorizedData);
    const currentArchitectureDiagramSvg =
      await this.currentArchitectureSvgGenerator.generateCurrentArchitectureDiagramSvg(
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
   * Generate flowchart SVGs for business processes
   */
  private async generateBusinessProcessesFlowcharts(
    categorizedData: {
      category: string;
      label: string;
      data: AppSummaryNameDescArray;
    }[],
  ): Promise<string[]> {
    const businessProcessesCategory = categorizedData.find(
      (category) => category.category === "businessProcesses",
    );

    if (!businessProcessesCategory || businessProcessesCategory.data.length === 0) {
      return [];
    }

    // Convert AppSummaryNameDescArray to BusinessProcess format using type guard
    const businessProcesses = businessProcessesCategory.data.map((item) => ({
      name: item.name,
      description: item.description,
      keyBusinessActivities: extractKeyBusinessActivities(item) ?? [],
    }));

    return this.flowchartSvgGenerator.generateMultipleFlowchartsSvg(businessProcesses);
  }

  /**
   * Extract microservices data from categorized data
   */
  private extractMicroservicesData(
    categorizedData: {
      category: string;
      label: string;
      data: AppSummaryNameDescArray;
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

    if (!microservicesCategory || microservicesCategory.data.length === 0) {
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
      data: AppSummaryNameDescArray;
    }[],
  ): InferredArchitectureData | null {
    const inferredArchitectureCategory = categorizedData.find(
      (category) => category.category === "inferredArchitecture",
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

    return {
      internalComponents: (rawData.internalComponents ?? []).map((c) => ({
        name: c.name,
        description: c.description,
      })),
      externalDependencies: (rawData.externalDependencies ?? []).map((d) => ({
        name: d.name,
        type: d.type,
        description: d.description,
      })),
      dependencies: (rawData.dependencies ?? []).map((dep) => ({
        from: dep.from,
        to: dep.to,
        description: dep.description,
      })),
    };
  }
}
