import { injectable, inject } from "tsyringe";
import type { ReportSection } from "./report-section.interface";
import { reportingTokens } from "../../../di/tokens";
import { IntegrationPointsDataProvider } from "../data-providers/integration-points-data-provider";
import { TableViewModel, type DisplayableTableRow } from "../view-models/table-view-model";
import { reportSectionsConfig } from "../report-sections.config";
import type { PreparedHtmlReportData } from "../html-report-writer";
import type { PreparedJsonData } from "../json-report-writer";
import type { ReportData } from "../report-gen.types";
import { SECTION_NAMES } from "../reporting.constants";

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

  isStandardSection(): boolean {
    return true;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const integrationPoints =
      await this.integrationPointsDataProvider.getIntegrationPoints(projectName);
    return { integrationPoints };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: unknown,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const data = sectionData as {
      integrationPoints: ReportData["integrationPoints"];
    };

    const integrationPointsTableViewModel = new TableViewModel(
      data.integrationPoints as unknown as DisplayableTableRow[],
    );

    return {
      integrationPoints: data.integrationPoints,
      integrationPointsTableViewModel,
    };
  }

  prepareJsonData(_baseData: ReportData, sectionData: unknown): PreparedJsonData[] {
    const data = sectionData as {
      integrationPoints: ReportData["integrationPoints"];
    };

    return [
      {
        filename: reportSectionsConfig.jsonDataFiles.integrationPoints,
        data: data.integrationPoints,
      },
    ];
  }
}
