import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { DatabaseReportDataProvider } from "./database-report-data-provider";
import { TableViewModel, type DisplayableTableRow } from "../../view-models/table-view-model";
import { reportSectionsConfig } from "../../report-sections.config";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-gen.types";
import { SECTION_NAMES } from "../../reporting.constants";

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

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const [dbInteractions, procsAndTriggers] = await Promise.all([
      this.databaseDataProvider.getDatabaseInteractions(projectName),
      this.databaseDataProvider.buildProceduresAndTriggersSummary(projectName),
    ]);

    return {
      dbInteractions,
      procsAndTriggers,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { dbInteractions, procsAndTriggers } = sectionData;

    if (!dbInteractions || !procsAndTriggers) {
      return null;
    }

    // Create view model for database interactions
    const dbInteractionsTableViewModel = new TableViewModel(
      dbInteractions as unknown as DisplayableTableRow[],
    );

    // Create view model for stored procedures and triggers
    const combinedProcsTrigsList = [...procsAndTriggers.procs.list, ...procsAndTriggers.trigs.list];
    const procsAndTriggersTableViewModel = new TableViewModel(
      combinedProcsTrigsList as unknown as DisplayableTableRow[],
    );

    return {
      dbInteractions,
      procsAndTriggers,
      dbInteractionsTableViewModel,
      procsAndTriggersTableViewModel,
    };
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const { dbInteractions, procsAndTriggers } = sectionData;

    if (!dbInteractions || !procsAndTriggers) {
      return [];
    }

    return [
      {
        filename: reportSectionsConfig.jsonDataFiles.dbInteractions,
        data: dbInteractions,
      },
      {
        filename: reportSectionsConfig.jsonDataFiles.procsAndTriggers,
        data: procsAndTriggers,
      },
    ];
  }
}
