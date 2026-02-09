import { injectable, inject } from "tsyringe";
import { BaseReportSection } from "../base-report-section";
import { reportingTokens } from "../../../../di/tokens";
import { BomDataProvider } from "./bom-data-provider";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../config/reporting.config";
import { getBomConflictsCssClass } from "../../presentation";

/**
 * Report section for Bill of Materials (BOM) dependency data.
 * Provides dependency aggregation and version conflict detection.
 */
@injectable()
export class DependenciesSection extends BaseReportSection {
  constructor(
    @inject(reportingTokens.BomDataProvider) private readonly bomDataProvider: BomDataProvider,
  ) {
    super();
  }

  getName(): string {
    return SECTION_NAMES.DEPENDENCIES;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const bomData = await this.bomDataProvider.getBillOfMaterials(projectName);
    return {
      billOfMaterials: bomData.dependencies,
    };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { billOfMaterials } = sectionData;

    if (!billOfMaterials) {
      return null;
    }

    // Calculate BOM statistics with pre-computed CSS class
    const conflictCount = billOfMaterials.filter((d) => d.hasConflict).length;
    const bomStatistics = {
      total: billOfMaterials.length,
      conflicts: conflictCount,
      buildFiles: new Set(billOfMaterials.flatMap((d) => d.locations)).size,
      conflictsCssClass: getBomConflictsCssClass(conflictCount),
    };

    return await Promise.resolve({
      billOfMaterials,
      bomStatistics,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    return this.prepareSingleJsonData(sectionData.billOfMaterials, "bill-of-materials.json");
  }
}
