import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { DomainModelDataProvider } from "../advanced-data/domain-model-data-provider";
import { FlowchartSvgGenerator } from "../../generators/svg/flowchart-svg-generator";
import { DomainModelSvgGenerator } from "../../generators/svg/domain-model-svg-generator";
import { ArchitectureSvgGenerator } from "../../generators/svg/architecture-svg-generator";
import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-gen.types";
import { SECTION_NAMES } from "../../reporting.constants";

// Extended interfaces for business process and microservice data
type BusinessProcessData = AppSummaryNameDescArray[0] & {
  keyBusinessActivities?: {
    activity: string;
    description: string;
  }[];
};

type MicroserviceData = AppSummaryNameDescArray[0] & {
  entities?: {
    name: string;
    description: string;
    attributes?: string[];
  }[];
  endpoints?: {
    path: string;
    method: string;
    description: string;
  }[];
  operations?: {
    operation: string;
    method: string;
    description: string;
  }[];
};

/**
 * Report section for enhanced UI visualizations (flowcharts, domain diagrams, architecture diagrams).
 */
@injectable()
export class EnhancedUiSection implements ReportSection {
  constructor(
    @inject(reportingTokens.DomainModelDataProvider)
    private readonly domainModelDataProvider: DomainModelDataProvider,
    @inject(reportingTokens.FlowchartSvgGenerator)
    private readonly flowchartSvgGenerator: FlowchartSvgGenerator,
    @inject(reportingTokens.DomainModelSvgGenerator)
    private readonly domainModelSvgGenerator: DomainModelSvgGenerator,
    @inject(reportingTokens.ArchitectureSvgGenerator)
    private readonly architectureSvgGenerator: ArchitectureSvgGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.ENHANCED_UI;
  }

  isStandardSection(): boolean {
    return true; // This section uses standard rendering
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
    // Generate business processes flowcharts
    const businessProcessesFlowchartSvgs = this.generateBusinessProcessesFlowcharts(
      baseData.categorizedData,
    );

    // Generate domain model data and diagrams
    const domainModelData = this.domainModelDataProvider.getDomainModelData(
      baseData.categorizedData,
    );
    const contextDiagramSvgs = this.domainModelSvgGenerator.generateMultipleContextDiagramsSvg(
      domainModelData.boundedContexts,
    );

    // Extract microservices data and generate architecture diagram
    const microservicesData = this.extractMicroservicesData(baseData.categorizedData);
    const architectureDiagramSvg = this.architectureSvgGenerator.generateArchitectureDiagramSvg(
      microservicesData,
      baseData.integrationPoints,
    );

    return {
      businessProcessesFlowchartSvgs,
      domainModelData,
      contextDiagramSvgs,
      microservicesData,
      architectureDiagramSvg,
    };
  }

  prepareJsonData(_baseData: ReportData, _sectionData: Partial<ReportData>): PreparedJsonData[] {
    // This section doesn't generate separate JSON files
    return [];
  }

  /**
   * Generate flowchart SVGs for business processes
   */
  private generateBusinessProcessesFlowcharts(
    categorizedData: {
      category: string;
      label: string;
      data: AppSummaryNameDescArray;
    }[],
  ): string[] {
    const businessProcessesCategory = categorizedData.find(
      (category) => category.category === "businessProcesses",
    );

    if (!businessProcessesCategory || businessProcessesCategory.data.length === 0) {
      return [];
    }

    // Convert AppSummaryNameDescArray to BusinessProcess format
    const businessProcesses = businessProcessesCategory.data.map((item) => ({
      name: item.name,
      description: item.description,
      keyBusinessActivities: (item as BusinessProcessData).keyBusinessActivities ?? [],
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
      const microserviceItem = item as MicroserviceData;
      return {
        name: item.name,
        description: item.description,
        entities: (microserviceItem.entities ?? []).map((entity) => ({
          name: entity.name,
          description: entity.description,
          attributes: entity.attributes ?? [],
        })),
        endpoints: microserviceItem.endpoints ?? [],
        operations: microserviceItem.operations ?? [],
      };
    });
  }
}
