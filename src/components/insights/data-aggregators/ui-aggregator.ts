import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import type { IAggregator } from "./aggregator.interface";
import type { AppSummaryCategoryEnum } from "../insights.types";

/**
 * Type definitions for UI analysis summary
 */
export interface UiFrameworkItem {
  [k: string]: unknown;
  name: string;
  version?: string;
  configFiles: string[];
}

export interface CustomTagLibrary {
  [k: string]: unknown;
  prefix: string;
  uri: string;
  usageCount: number;
}

export interface JspFileMetrics {
  [k: string]: unknown;
  filePath: string;
  scriptletCount: number;
  expressionCount: number;
  declarationCount: number;
  totalScriptletBlocks: number;
}

export interface UiAnalysisSummary {
  [k: string]: unknown;
  frameworks: UiFrameworkItem[];
  totalJspFiles: number;
  totalScriptlets: number;
  totalExpressions: number;
  totalDeclarations: number;
  averageScriptletsPerFile: number;
  filesWithHighScriptletCount: number;
  customTagLibraries: CustomTagLibrary[];
  topScriptletFiles: JspFileMetrics[];
}

/**
 * Aggregates UI technology data including framework detection, JSP metrics, and tag library usage.
 * Analyzes JSP files for scriptlets and custom tags to measure technical debt.
 */
@injectable()
export class UiAggregator implements IAggregator {
  private readonly TOP_FILES_LIMIT = 10;
  private readonly HIGH_SCRIPTLET_THRESHOLD = 10;

  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  getCategory(): AppSummaryCategoryEnum {
    return "uiTechnologyAnalysis";
  }

  async aggregate(projectName: string): Promise<UiAnalysisSummary> {
    return this.aggregateUiAnalysis(projectName);
  }

  /**
   * Aggregates UI technology analysis for a project
   */
  async aggregateUiAnalysis(projectName: string): Promise<UiAnalysisSummary> {
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

    // Analyze each source file
    for (const file of sourceFiles) {
      // Process UI framework detection (typically from XML files)
      if (file.summary?.uiFramework) {
        const framework = file.summary.uiFramework;
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
      if (file.summary?.jspMetrics) {
        const metrics = file.summary.jspMetrics;

        totalScriptlets += metrics.scriptletCount;
        totalExpressions += metrics.expressionCount;
        totalDeclarations += metrics.declarationCount;

        const totalBlocks =
          metrics.scriptletCount + metrics.expressionCount + metrics.declarationCount;

        if (totalBlocks > this.HIGH_SCRIPTLET_THRESHOLD) {
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
    }

    // Sort JSP files by total scriptlet blocks (descending) and take top N
    const topScriptletFiles = jspFileMetrics
      .toSorted((a, b) => b.totalScriptletBlocks - a.totalScriptletBlocks)
      .slice(0, this.TOP_FILES_LIMIT);

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
