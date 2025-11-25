import { injectable, inject } from "tsyringe";
import type { ReportSection } from "./report-section.interface";
import { reportingTokens } from "../../../di/tokens";
import { BomDataProvider } from "../data-providers/bom-data-provider";
import { CodeQualityDataProvider } from "../data-providers/code-quality-data-provider";
import { JobDataProvider } from "../data-providers/job-data-provider";
import { ModuleCouplingDataProvider } from "../data-providers/module-coupling-data-provider";
import { UiDataProvider } from "../data-providers/ui-data-provider";
import type { PreparedHtmlReportData } from "../html-report-writer";
import type { PreparedJsonData } from "../json-report-writer";
import type { ReportData } from "../report-gen.types";
import { SECTION_NAMES } from "../reporting.constants";

/**
 * Report section for advanced/optional data (BOM, code quality, scheduled jobs, module coupling, UI analysis).
 */
@injectable()
export class AdvancedDataSection implements ReportSection {
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
    return SECTION_NAMES.ADVANCED_DATA;
  }

  isStandardSection(): boolean {
    return false; // This section has custom rendering for BOM, code quality, etc.
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
    sectionData: unknown,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const data = sectionData as {
      billOfMaterials: ReportData["billOfMaterials"];
      codeQualitySummary: ReportData["codeQualitySummary"];
      scheduledJobsSummary: ReportData["scheduledJobsSummary"];
      moduleCoupling: ReportData["moduleCoupling"];
      uiTechnologyAnalysis: ReportData["uiTechnologyAnalysis"];
    };

    // Calculate BOM statistics
    const bomStatistics = {
      total: data.billOfMaterials.length,
      conflicts: data.billOfMaterials.filter((d) => d.hasConflict).length,
      buildFiles: new Set(data.billOfMaterials.flatMap((d) => d.locations)).size,
    };

    // Calculate Scheduled Jobs statistics
    const jobsStatistics = data.scheduledJobsSummary
      ? {
          total: data.scheduledJobsSummary.totalJobs,
          triggerTypesCount: data.scheduledJobsSummary.triggerTypes.length,
          jobFilesCount: data.scheduledJobsSummary.jobFiles.length,
        }
      : null;

    // Calculate Module Coupling statistics
    const couplingStatistics = data.moduleCoupling
      ? {
          totalModules: data.moduleCoupling.totalModules,
          totalCouplings: data.moduleCoupling.totalCouplings,
          highestCouplingCount: data.moduleCoupling.highestCouplingCount,
          moduleDepth: data.moduleCoupling.moduleDepth,
        }
      : null;

    return {
      billOfMaterials: data.billOfMaterials,
      bomStatistics,
      codeQualitySummary: data.codeQualitySummary,
      scheduledJobsSummary: data.scheduledJobsSummary,
      jobsStatistics,
      moduleCoupling: data.moduleCoupling,
      couplingStatistics,
      uiTechnologyAnalysis: data.uiTechnologyAnalysis,
    };
  }

  prepareJsonData(_baseData: ReportData, sectionData: unknown): PreparedJsonData[] {
    const data = sectionData as {
      billOfMaterials: ReportData["billOfMaterials"];
      codeQualitySummary: ReportData["codeQualitySummary"];
      scheduledJobsSummary: ReportData["scheduledJobsSummary"];
      moduleCoupling: ReportData["moduleCoupling"];
      uiTechnologyAnalysis: ReportData["uiTechnologyAnalysis"];
    };

    return [
      { filename: "bill-of-materials.json", data: data.billOfMaterials },
      { filename: "code-quality-summary.json", data: data.codeQualitySummary },
      { filename: "scheduled-jobs-summary.json", data: data.scheduledJobsSummary },
      { filename: "module-coupling.json", data: data.moduleCoupling },
      { filename: "ui-technology-analysis.json", data: data.uiTechnologyAnalysis },
    ];
  }
}
