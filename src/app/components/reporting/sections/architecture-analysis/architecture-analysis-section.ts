import { injectable, inject } from "tsyringe";
import { BaseReportSection } from "../base-report-section";
import { reportingTokens } from "../../../../di/tokens";
import { ModuleCouplingDataProvider } from "./module-coupling-data-provider";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";

/**
 * Report section for architecture analysis and module coupling data.
 * Identifies module dependencies and coupling relationships.
 */
@injectable()
export class ArchitectureAnalysisSection extends BaseReportSection {
  constructor(
    @inject(reportingTokens.ModuleCouplingDataProvider)
    private readonly moduleCouplingDataProvider: ModuleCouplingDataProvider,
  ) {
    super();
  }

  getName(): string {
    return SECTION_NAMES.ARCHITECTURE_ANALYSIS;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const moduleCoupling = await this.moduleCouplingDataProvider.getModuleCoupling(projectName);
    return { moduleCoupling };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { moduleCoupling } = sectionData;

    if (!moduleCoupling) {
      return await Promise.resolve(null);
    }

    // Calculate Module Coupling statistics
    const couplingStatistics = {
      totalModules: moduleCoupling.totalModules,
      totalCouplings: moduleCoupling.totalCouplings,
      highestCouplingCount: moduleCoupling.highestCouplingCount,
      moduleDepth: moduleCoupling.moduleDepth,
    };

    return await Promise.resolve({
      moduleCoupling,
      couplingStatistics,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    return this.prepareSingleJsonData(sectionData.moduleCoupling, "module-coupling.json");
  }
}
