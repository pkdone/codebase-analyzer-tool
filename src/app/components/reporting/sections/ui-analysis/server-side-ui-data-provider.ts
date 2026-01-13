import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type { UiTechnologyAnalysis } from "./ui-analysis.types";
import {
  uiAnalysisConfig,
  classifyTagLibrary,
  TAG_LIBRARY_BADGE_CLASSES,
} from "../../config/ui-analysis.config";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../../../../common/constants/application.constants";
import {
  calculateDebtLevel,
  getTotalScriptletsCssClass,
  getFilesWithHighScriptletCountCssClass,
  shouldShowHighDebtAlert,
} from "../../utils/view-helpers";
import type { ProjectedSourceSummaryFields } from "../../../../repositories/sources/sources.model";

/**
 * Type aliases for internal use
 */
type UiFrameworkItem = UiTechnologyAnalysis["frameworks"][0];
type CustomTagLibrary = UiTechnologyAnalysis["customTagLibraries"][0];
type JspFileMetrics = UiTechnologyAnalysis["topScriptletFiles"][0];

/**
 * Intermediate type for JSP file metrics before debt level calculation.
 * Debt levels are computed after sorting to include only in top files.
 */
type RawJspFileMetrics = Omit<JspFileMetrics, "debtLevel" | "debtLevelClass">;

/**
 * Intermediate type for tag library aggregation before type classification.
 */
type RawCustomTagLibrary = Omit<CustomTagLibrary, "tagType" | "tagTypeClass">;

/**
 * Result of JSP file analysis containing metrics and tag library data.
 */
interface JspAnalysisResult {
  totalScriptlets: number;
  totalExpressions: number;
  totalDeclarations: number;
  filesWithHighScriptletCount: number;
  jspFileMetrics: RawJspFileMetrics[];
  tagLibraryMap: Map<string, RawCustomTagLibrary>;
}

/**
 * Data provider responsible for aggregating server-side UI technology data including framework detection, JSP metrics, and tag library usage.
 * Analyzes server-side UI technologies (JSP, Struts, JSF, Spring MVC) for scriptlets and custom tags to measure technical debt.
 */
@injectable()
export class ServerSideUiDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates UI technology analysis for a project.
   * Orchestrates the analysis of frameworks, JSP metrics, and tag libraries.
   */
  async getUiTechnologyAnalysis(projectName: string): Promise<UiTechnologyAnalysis> {
    // Fetch all source files from the project
    const sourceFiles = await this.sourcesRepository.getProjectSourcesSummariesByFileType(
      projectName,
      [],
    );

    // Analyze frameworks from XML configuration files
    const frameworks = this.analyzeFrameworks(sourceFiles);

    // Analyze JSP files for metrics and tag libraries
    const jspAnalysis = this.analyzeJspMetrics(sourceFiles);

    // Process and sort the results
    const topScriptletFiles = this.computeTopScriptletFiles(jspAnalysis.jspFileMetrics);
    const customTagLibraries = this.computeTagLibraries(jspAnalysis.tagLibraryMap);

    // Calculate aggregate statistics
    const totalJspFiles = jspAnalysis.jspFileMetrics.length;
    const averageScriptletsPerFile =
      totalJspFiles > 0 ? jspAnalysis.totalScriptlets / totalJspFiles : 0;

    return {
      frameworks,
      totalJspFiles,
      totalScriptlets: jspAnalysis.totalScriptlets,
      totalExpressions: jspAnalysis.totalExpressions,
      totalDeclarations: jspAnalysis.totalDeclarations,
      averageScriptletsPerFile,
      filesWithHighScriptletCount: jspAnalysis.filesWithHighScriptletCount,
      customTagLibraries,
      topScriptletFiles,
      // Pre-computed presentation values
      totalScriptletsCssClass: getTotalScriptletsCssClass(jspAnalysis.totalScriptlets),
      filesWithHighScriptletCountCssClass: getFilesWithHighScriptletCountCssClass(
        jspAnalysis.filesWithHighScriptletCount,
      ),
      showHighDebtAlert: shouldShowHighDebtAlert(jspAnalysis.filesWithHighScriptletCount),
    };
  }

  /**
   * Analyzes UI framework detection from source files (typically XML configuration files).
   * Aggregates frameworks by name and version, collecting configuration file paths.
   */
  private analyzeFrameworks(sourceFiles: ProjectedSourceSummaryFields[]): UiFrameworkItem[] {
    const frameworkMap = new Map<string, UiFrameworkItem>();
    const frameworkFiles = sourceFiles.filter((f) => f.summary?.uiFramework);

    for (const file of frameworkFiles) {
      const framework = file.summary?.uiFramework;
      if (!framework) continue;

      const key = `${framework.name}:${framework.version ?? UNKNOWN_VALUE_PLACEHOLDER}`;
      const existing = frameworkMap.get(key);

      if (existing) {
        frameworkMap.set(key, {
          name: existing.name,
          version: existing.version,
          configFiles: [...existing.configFiles, framework.configFile],
        });
      } else {
        frameworkMap.set(key, {
          name: framework.name,
          version: framework.version,
          configFiles: [framework.configFile],
        });
      }
    }

    return Array.from(frameworkMap.values()).toSorted((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Analyzes JSP files for scriptlet metrics and custom tag library usage.
   * Returns aggregated totals, per-file metrics, and tag library data.
   */
  private analyzeJspMetrics(sourceFiles: ProjectedSourceSummaryFields[]): JspAnalysisResult {
    const tagLibraryMap = new Map<string, RawCustomTagLibrary>();
    const jspFileMetrics: RawJspFileMetrics[] = [];
    const jspFiles = sourceFiles.filter((f) => f.summary?.jspMetrics);

    let totalScriptlets = 0;
    let totalExpressions = 0;
    let totalDeclarations = 0;
    let filesWithHighScriptletCount = 0;

    for (const file of jspFiles) {
      const metrics = file.summary?.jspMetrics;
      if (!metrics) continue;

      totalScriptlets += metrics.scriptletCount;
      totalExpressions += metrics.expressionCount;
      totalDeclarations += metrics.declarationCount;

      const totalBlocks =
        metrics.scriptletCount + metrics.expressionCount + metrics.declarationCount;

      if (totalBlocks > uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD) {
        filesWithHighScriptletCount++;
      }

      // Track individual JSP file metrics
      jspFileMetrics.push({
        filePath: file.filepath,
        scriptletCount: metrics.scriptletCount,
        expressionCount: metrics.expressionCount,
        declarationCount: metrics.declarationCount,
        totalScriptletBlocks: totalBlocks,
      });

      // Aggregate custom tag libraries
      this.aggregateTagLibraries(metrics.customTags, tagLibraryMap);
    }

    return {
      totalScriptlets,
      totalExpressions,
      totalDeclarations,
      filesWithHighScriptletCount,
      jspFileMetrics,
      tagLibraryMap,
    };
  }

  /**
   * Aggregates custom tag library usage from JSP metrics into the tag library map.
   */
  private aggregateTagLibraries(
    customTags: { prefix: string; uri: string }[] | undefined,
    tagLibraryMap: Map<string, RawCustomTagLibrary>,
  ): void {
    if (!customTags || customTags.length === 0) return;

    for (const tag of customTags) {
      const key = `${tag.prefix}:${tag.uri}`;
      const existing = tagLibraryMap.get(key);

      if (existing) {
        tagLibraryMap.set(key, {
          ...existing,
          usageCount: existing.usageCount + 1,
        });
      } else {
        tagLibraryMap.set(key, {
          prefix: tag.prefix,
          uri: tag.uri,
          usageCount: 1,
        });
      }
    }
  }

  /**
   * Computes the top scriptlet files with debt levels.
   * Sorts by total scriptlet blocks (descending) and adds debt level classification.
   */
  private computeTopScriptletFiles(jspFileMetrics: RawJspFileMetrics[]): JspFileMetrics[] {
    return jspFileMetrics
      .toSorted((a, b) => b.totalScriptletBlocks - a.totalScriptletBlocks)
      .slice(0, uiAnalysisConfig.TOP_FILES_LIMIT)
      .map((file) => {
        const { level, cssClass } = calculateDebtLevel(file.totalScriptletBlocks);
        return {
          ...file,
          debtLevel: level,
          debtLevelClass: cssClass,
        };
      });
  }

  /**
   * Computes final tag library list with type classification and sorting.
   * Classifies each library by type and sorts by usage count (descending).
   */
  private computeTagLibraries(tagLibraryMap: Map<string, RawCustomTagLibrary>): CustomTagLibrary[] {
    return Array.from(tagLibraryMap.values())
      .map((tagLib) => {
        const tagType = classifyTagLibrary(tagLib.uri);
        return {
          ...tagLib,
          tagType,
          tagTypeClass: TAG_LIBRARY_BADGE_CLASSES[tagType],
        };
      })
      .toSorted((a, b) => {
        // Sort by usage count (descending), then by prefix
        if (a.usageCount !== b.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return a.prefix.localeCompare(b.prefix);
      });
  }
}
