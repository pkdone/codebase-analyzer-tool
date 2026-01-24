import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import type { RequestableAppSummaryField } from "../../../../repositories/app-summaries/app-summaries.model";
import { reportingTokens } from "../../../../di/tokens";
import { IntegrationPointsDataProvider } from "./integration-points-data-provider";
import { TableViewModel } from "../../view-models/table-view-model";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { outputConfig } from "../../../../config/output.config";

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

  getRequiredAppSummaryFields(): readonly RequestableAppSummaryField[] {
    // This section does not require any app summary fields
    return [];
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
      return await Promise.resolve(null);
    }

    const integrationPointsTableViewModel = new TableViewModel(integrationPoints);

    // Implementation of async interface - computation is synchronous but interface requires Promise
    return await Promise.resolve({
      integrationPoints,
      integrationPointsTableViewModel,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const { integrationPoints } = sectionData;

    if (!integrationPoints) {
      return [];
    }

    return [
      {
        filename: outputConfig.jsonFiles.INTEGRATION_POINTS,
        data: integrationPoints,
      },
    ];
  }
}
