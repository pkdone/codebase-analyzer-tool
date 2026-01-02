import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { BomDataProvider } from "./bom-data-provider";
import { CodeQualityDataProvider } from "./code-quality-data-provider";
import { JobDataProvider } from "./job-data-provider";
import { ModuleCouplingDataProvider } from "./module-coupling-data-provider";
import { UiDataProvider } from "./ui-data-provider";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";

/**
 * Report section for quality metrics data (BOM, code quality, scheduled jobs, module coupling, UI analysis).
 */
@injectable()
export class QualityMetricsSection implements ReportSection {
  constructor(
    @inject(reportingTokens.BomDataProvider) private readonly bomDataProvider: BomDataProvider,
    @inject(reportingTokens.CodeQualityDataProvider)
    private readonly codeQualityDataProvider: CodeQualityDataProvider,
    @inject(reportingTokens.JobDataProvider) private readonly jobDataProvider: JobDataProvider,
    @inject(reportingTokens.ModuleCouplingDataProvider)
    private readonly moduleCouplingDataProvider: ModuleCouplingDataProvider,
    @inject(reportingTokens.UiDataProvider) private readonly uiDataProvider: UiDataProvider,
  ) {}

  getName(): string {
    return SECTION_NAMES.QUALITY_METRICS;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const [
      bomData,
      codeQualitySummary,
      scheduledJobsSummary,
      moduleCoupling,
      uiTechnologyAnalysis,
    ] = await Promise.all([
      this.bomDataProvider.getBillOfMaterials(projectName),
      this.codeQualityDataProvider.getCodeQualitySummary(projectName),
      this.jobDataProvider.getScheduledJobsSummary(projectName),
      this.moduleCouplingDataProvider.getModuleCoupling(projectName),
      this.uiDataProvider.getUiTechnologyAnalysis(projectName),
    ]);

    return {
      billOfMaterials: bomData.dependencies,
      codeQualitySummary,
      scheduledJobsSummary,
      moduleCoupling,
      uiTechnologyAnalysis,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const {
      billOfMaterials,
      codeQualitySummary,
      scheduledJobsSummary,
      moduleCoupling,
      uiTechnologyAnalysis,
    } = sectionData;

    if (!billOfMaterials) {
      return null;
    }

    // Calculate BOM statistics
    const bomStatistics = {
      total: billOfMaterials.length,
      conflicts: billOfMaterials.filter((d) => d.hasConflict).length,
      buildFiles: new Set(billOfMaterials.flatMap((d) => d.locations)).size,
    };

    // Calculate Scheduled Jobs statistics
    const jobsStatistics = scheduledJobsSummary
      ? {
          total: scheduledJobsSummary.totalJobs,
          triggerTypesCount: scheduledJobsSummary.triggerTypes.length,
          jobFilesCount: scheduledJobsSummary.jobFiles.length,
        }
      : null;

    // Calculate Module Coupling statistics
    const couplingStatistics = moduleCoupling
      ? {
          totalModules: moduleCoupling.totalModules,
          totalCouplings: moduleCoupling.totalCouplings,
          highestCouplingCount: moduleCoupling.highestCouplingCount,
          moduleDepth: moduleCoupling.moduleDepth,
        }
      : null;

    return {
      billOfMaterials,
      bomStatistics,
      codeQualitySummary: codeQualitySummary ?? null,
      scheduledJobsSummary: scheduledJobsSummary ?? null,
      jobsStatistics,
      moduleCoupling: moduleCoupling ?? null,
      couplingStatistics,
      uiTechnologyAnalysis: uiTechnologyAnalysis ?? null,
    };
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const {
      billOfMaterials,
      codeQualitySummary,
      scheduledJobsSummary,
      moduleCoupling,
      uiTechnologyAnalysis,
    } = sectionData;

    const result: PreparedJsonData[] = [];

    if (billOfMaterials) {
      result.push({ filename: "bill-of-materials.json", data: billOfMaterials });
    }
    if (codeQualitySummary !== undefined) {
      result.push({ filename: "code-quality-summary.json", data: codeQualitySummary });
    }
    if (scheduledJobsSummary !== undefined) {
      result.push({ filename: "scheduled-jobs-summary.json", data: scheduledJobsSummary });
    }
    if (moduleCoupling !== undefined) {
      result.push({ filename: "module-coupling.json", data: moduleCoupling });
    }
    if (uiTechnologyAnalysis !== undefined) {
      result.push({ filename: "ui-technology-analysis.json", data: uiTechnologyAnalysis });
    }

    return result;
  }
}
