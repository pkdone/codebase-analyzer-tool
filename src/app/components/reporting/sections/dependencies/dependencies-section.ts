import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { BomDataProvider } from "./bom-data-provider";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { getBomConflictsCssClass } from "../../utils/view-helpers";

/**
 * Report section for Bill of Materials (BOM) dependency data.
 * Provides dependency aggregation and version conflict detection.
 */
@injectable()
export class DependenciesSection implements ReportSection {
  constructor(
    @inject(reportingTokens.BomDataProvider) private readonly bomDataProvider: BomDataProvider,
  ) {}

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
      return await Promise.resolve(null);
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
    const { billOfMaterials } = sectionData;

    if (billOfMaterials) {
      return [{ filename: "bill-of-materials.json", data: billOfMaterials }];
    }

    return [];
  }
}
