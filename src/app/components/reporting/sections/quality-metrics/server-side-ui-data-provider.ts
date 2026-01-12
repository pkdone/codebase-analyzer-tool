import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type { UiTechnologyAnalysis } from "./quality-metrics.types";
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
   * Aggregates UI technology analysis for a project
   */
  async getUiTechnologyAnalysis(projectName: string): Promise<UiTechnologyAnalysis> {
    // Fetch all source files from the project
    const sourceFiles = await this.sourcesRepository.getProjectSourcesSummariesByFileType(
      projectName,
      [],
    );

    // Data structures for aggregation
    const frameworkMap = new Map<string, UiFrameworkItem>();
    const tagLibraryMap = new Map<string, RawCustomTagLibrary>();
    const jspFileMetrics: RawJspFileMetrics[] = [];

    let totalScriptlets = 0;
    let totalExpressions = 0;
    let totalDeclarations = 0;
    let filesWithHighScriptletCount = 0;

    // Filter source files by type for clearer separation of concerns
    const frameworkFiles = sourceFiles.filter((f) => f.summary?.uiFramework);
    const jspFiles = sourceFiles.filter((f) => f.summary?.jspMetrics);

    // Process UI framework detection (typically from XML files)
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

    // Process JSP metrics
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

      // Track individual JSP file metrics for top files
      jspFileMetrics.push({
        filePath: file.filepath,
        scriptletCount: metrics.scriptletCount,
        expressionCount: metrics.expressionCount,
        declarationCount: metrics.declarationCount,
        totalScriptletBlocks: totalBlocks,
      });

      // Process custom tag libraries
      if (metrics.customTags && metrics.customTags.length > 0) {
        for (const tag of metrics.customTags) {
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
    }

    // Sort JSP files by total scriptlet blocks (descending) and take top N
    // Add pre-computed debt levels for each file
    const topScriptletFiles = jspFileMetrics
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

    // Calculate average scriptlets per file
    const totalJspFiles = jspFileMetrics.length;
    const averageScriptletsPerFile = totalJspFiles > 0 ? totalScriptlets / totalJspFiles : 0;

    // Convert maps to arrays and sort
    const frameworks = Array.from(frameworkMap.values()).toSorted((a, b) =>
      a.name.localeCompare(b.name),
    );

    // Convert tag libraries map to array, compute types, and sort
    const customTagLibraries = Array.from(tagLibraryMap.values())
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

    return {
      frameworks,
      totalJspFiles,
      totalScriptlets,
      totalExpressions,
      totalDeclarations,
      averageScriptletsPerFile,
      filesWithHighScriptletCount,
      customTagLibraries,
      topScriptletFiles,
      // Pre-computed presentation values
      totalScriptletsCssClass: getTotalScriptletsCssClass(totalScriptlets),
      filesWithHighScriptletCountCssClass: getFilesWithHighScriptletCountCssClass(
        filesWithHighScriptletCount,
      ),
      showHighDebtAlert: shouldShowHighDebtAlert(filesWithHighScriptletCount),
    };
  }
}
