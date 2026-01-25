import { injectable, inject } from "tsyringe";
import { BaseReportSection } from "../base-report-section";
import { reportingTokens } from "../../../../di/tokens";
import { DatabaseReportDataProvider } from "./database-report-data-provider";
import { TableViewModel } from "../../table";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { outputConfig } from "../../../../config/output.config";

/**
 * Report section for database-related data (interactions, procedures, triggers).
 */
@injectable()
export class DatabaseSection extends BaseReportSection {
  constructor(
    @inject(reportingTokens.DatabaseReportDataProvider)
    private readonly databaseDataProvider: DatabaseReportDataProvider,
  ) {
    super();
  }

  getName(): string {
    return SECTION_NAMES.DATABASE;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const [dbInteractions, procsAndTriggers] = await Promise.all([
      this.databaseDataProvider.getDatabaseInteractions(projectName),
      this.databaseDataProvider.getStoredProceduresAndTriggers(projectName),
    ]);

    return {
      dbInteractions,
      procsAndTriggers,
    };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { dbInteractions, procsAndTriggers } = sectionData;

    if (!dbInteractions || !procsAndTriggers) {
      return await Promise.resolve(null);
    }

    // Create view model for database interactions
    const dbInteractionsTableViewModel = new TableViewModel(dbInteractions);

    // Create view model for stored procedures and triggers
    const combinedProcsTrigsList = [...procsAndTriggers.procs.list, ...procsAndTriggers.trigs.list];
    const procsAndTriggersTableViewModel = new TableViewModel(combinedProcsTrigsList);

    // Implementation of async interface - computation is synchronous but interface requires Promise
    return await Promise.resolve({
      dbInteractions,
      procsAndTriggers,
      dbInteractionsTableViewModel,
      procsAndTriggersTableViewModel,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const { dbInteractions, procsAndTriggers } = sectionData;

    if (!dbInteractions || !procsAndTriggers) {
      return [];
    }

    return [
      {
        filename: outputConfig.jsonFiles.DB_INTERACTIONS,
        data: dbInteractions,
      },
      {
        filename: outputConfig.jsonFiles.PROCS_AND_TRIGGERS,
        data: procsAndTriggers,
      },
    ];
  }
}
