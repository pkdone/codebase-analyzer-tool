import { injectable, inject } from "tsyringe";
import { BaseReportSection } from "../base-report-section";
import { reportingTokens } from "../../../../di/tokens";
import { IntegrationPointsDataProvider } from "./integration-points-data-provider";
import { TableViewModel } from "../../presentation";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../config/reporting.config";
import { outputConfig } from "../../../../config/output.config";

/**
 * Report section for integration points (APIs, queues, topics, SOAP services).
 */
@injectable()
export class IntegrationPointsSection extends BaseReportSection {
  constructor(
    @inject(reportingTokens.IntegrationPointsDataProvider)
    private readonly integrationPointsDataProvider: IntegrationPointsDataProvider,
  ) {
    super();
  }

  getName(): string {
    return SECTION_NAMES.INTEGRATION_POINTS;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const integrationPoints =
      await this.integrationPointsDataProvider.getIntegrationPoints(projectName);
    return { integrationPoints };
  }

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

    return await Promise.resolve({
      integrationPoints,
      integrationPointsTableViewModel,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    return this.prepareSingleJsonData(
      sectionData.integrationPoints,
      outputConfig.jsonFiles.INTEGRATION_POINTS,
    );
  }
}
