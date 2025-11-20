import { injectable, inject } from "tsyringe";
import type { ReportSection } from "./report-section.interface";
import { reportingTokens } from "../../../di/tokens";
import { DatabaseReportDataProvider } from "../data-providers/database-report-data-provider";
import { TableViewModel, type DisplayableTableRow } from "../view-models/table-view-model";
import { reportSectionsConfig } from "../report-sections.config";
import type { PreparedHtmlReportData } from "../html-report-writer";
import type { PreparedJsonData } from "../json-report-writer";
import type { ReportData } from "../report-gen.types";
import { SECTION_NAMES } from "../reporting.constants";

/**
 * Report section for database-related data (interactions, procedures, triggers).
 */
@injectable()
export class DatabaseSection implements ReportSection {
  constructor(
    @inject(reportingTokens.DatabaseReportDataProvider)
    private readonly databaseDataProvider: DatabaseReportDataProvider,
  ) {}

  getName(): string {
    return SECTION_NAMES.DATABASE;
  }

  async getData(projectName: string): Promise<unknown> {
    const [integrationPoints, dbInteractions, procsAndTriggers] = await Promise.all([
      this.databaseDataProvider.getIntegrationPoints(projectName),
      this.databaseDataProvider.getDatabaseInteractions(projectName),
      this.databaseDataProvider.buildProceduresAndTriggersSummary(projectName),
    ]);

    return {
      integrationPoints,
      dbInteractions,
      procsAndTriggers,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: unknown,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const data = sectionData as {
      integrationPoints: ReportData["integrationPoints"];
      dbInteractions: ReportData["dbInteractions"];
      procsAndTriggers: ReportData["procsAndTriggers"];
    };

    // Create view model for integration points
    const integrationPointsTableViewModel = new TableViewModel(
      data.integrationPoints as unknown as DisplayableTableRow[],
    );

    // Create view model for database interactions
    const dbInteractionsTableViewModel = new TableViewModel(
      data.dbInteractions as unknown as DisplayableTableRow[],
    );

    // Create view model for stored procedures and triggers
    const combinedProcsTrigsList = [
      ...data.procsAndTriggers.procs.list,
      ...data.procsAndTriggers.trigs.list,
    ];
    const procsAndTriggersTableViewModel = new TableViewModel(
      combinedProcsTrigsList as unknown as DisplayableTableRow[],
    );

    return {
      integrationPoints: data.integrationPoints,
      dbInteractions: data.dbInteractions,
      procsAndTriggers: data.procsAndTriggers,
      dbInteractionsTableViewModel,
      procsAndTriggersTableViewModel,
      integrationPointsTableViewModel,
    };
  }

  prepareJsonData(_baseData: ReportData, sectionData: unknown): PreparedJsonData[] {
    const data = sectionData as {
      integrationPoints: ReportData["integrationPoints"];
      dbInteractions: ReportData["dbInteractions"];
      procsAndTriggers: ReportData["procsAndTriggers"];
    };

    return [
      {
        filename: reportSectionsConfig.jsonDataFiles.integrationPoints,
        data: data.integrationPoints,
      },
      {
        filename: reportSectionsConfig.jsonDataFiles.dbInteractions,
        data: data.dbInteractions,
      },
      {
        filename: reportSectionsConfig.jsonDataFiles.procsAndTriggers,
        data: data.procsAndTriggers,
      },
    ];
  }
}
