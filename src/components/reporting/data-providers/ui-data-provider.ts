import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import type { UiTechnologyAnalysis } from "../report-gen.types";
import { uiAnalysisConfig } from "../config/ui-analysis.config";

/**
 * Type for UI analysis summary
 */
export type UiAnalysisSummary = UiTechnologyAnalysis;

/**
 * Type aliases for internal use
 */
type UiFrameworkItem = UiTechnologyAnalysis["frameworks"][0];
type CustomTagLibrary = UiTechnologyAnalysis["customTagLibraries"][0];
type JspFileMetrics = UiTechnologyAnalysis["topScriptletFiles"][0];

/**
 * Data provider responsible for aggregating UI technology data including framework detection, JSP metrics, and tag library usage.
 * Analyzes JSP files for scriptlets and custom tags to measure technical debt.
 */
@injectable()
export class UiDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates UI technology analysis for a project
   */
  async getUiTechnologyAnalysis(projectName: string): Promise<UiAnalysisSummary> {
    // Fetch all source files from the project
    const sourceFiles = await this.sourcesRepository.getProjectSourcesSummaries(projectName, []);

    // Data structures for aggregation
    const frameworkMap = new Map<string, UiFrameworkItem>();
    const tagLibraryMap = new Map<string, CustomTagLibrary>();
    const jspFileMetrics: JspFileMetrics[] = [];

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
      const key = `${framework.name}:${framework.version ?? "unknown"}`;

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
    const topScriptletFiles = jspFileMetrics
      .toSorted((a, b) => b.totalScriptletBlocks - a.totalScriptletBlocks)
      .slice(0, uiAnalysisConfig.TOP_FILES_LIMIT);

    // Calculate average scriptlets per file
    const totalJspFiles = jspFileMetrics.length;
    const averageScriptletsPerFile = totalJspFiles > 0 ? totalScriptlets / totalJspFiles : 0;

    // Convert maps to arrays and sort
    const frameworks = Array.from(frameworkMap.values()).toSorted((a, b) =>
      a.name.localeCompare(b.name),
    );

    const customTagLibraries = Array.from(tagLibraryMap.values()).toSorted((a, b) => {
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
    };
  }
}
