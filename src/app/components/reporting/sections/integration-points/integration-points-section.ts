import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { IntegrationPointsDataProvider } from "./integration-points-data-provider";
import { TableViewModel } from "../../view-models/table-view-model";
import { reportSectionsConfig } from "../../report-sections.config";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";

/**
 * Report section for integration points (APIs, queues, topics, SOAP services).
 */
@injectable()
export class IntegrationPointsSection implements ReportSection {
  constructor(
    @inject(reportingTokens.IntegrationPointsDataProvider)
    private readonly integrationPointsDataProvider: IntegrationPointsDataProvider,
  ) {}

  getName(): string {
    return SECTION_NAMES.INTEGRATION_POINTS;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const integrationPoints =
      await this.integrationPointsDataProvider.getIntegrationPoints(projectName);
    return { integrationPoints };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { integrationPoints } = sectionData;

    if (!integrationPoints) {
      return null;
    }

    const integrationPointsTableViewModel = new TableViewModel(integrationPoints);

    return {
      integrationPoints,
      integrationPointsTableViewModel,
    };
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const { integrationPoints } = sectionData;

    if (!integrationPoints) {
      return [];
    }

    return [
      {
        filename: reportSectionsConfig.jsonDataFiles.integrationPoints,
        data: integrationPoints,
      },
    ];
  }
}
