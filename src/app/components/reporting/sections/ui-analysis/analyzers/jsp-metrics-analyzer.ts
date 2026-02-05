import { injectable } from "tsyringe";
import type { DetectedTagLibraryData, JspFileMetricsData } from "../ui-analysis.types";
import { uiAnalysisConfig } from "../../../config/ui-analysis.config";
import { classifyTagLibrary } from "../../../domain/ui-analysis-calculator";
import type { ProjectedSourceSummaryFields } from "../../../../../repositories/sources/sources.model";

/**
 * Intermediate type for tag library aggregation before type classification.
 */
type RawDetectedTagLibrary = Omit<DetectedTagLibraryData, "tagType">;

/**
 * Result of JSP file analysis containing metrics and tag library data.
 */
export interface JspAnalysisResult {
  totalScriptlets: number;
  totalExpressions: number;
  totalDeclarations: number;
  filesWithHighScriptletCount: number;
  jspFileMetrics: JspFileMetricsData[];
  tagLibraryMap: Map<string, RawDetectedTagLibrary>;
}

/**
 * Analyzes JSP files for scriptlet metrics and custom tag library usage.
 * Returns aggregated totals, per-file metrics, and tag library data.
 */
@injectable()
export class JspMetricsAnalyzer {
  /**
   * Analyzes JSP files for scriptlet metrics and custom tag library usage.
   * Returns aggregated totals, per-file metrics, and tag library data.
   *
   * @param sourceFiles - Source files with summary data to analyze
   * @returns Analysis result containing metrics and tag library aggregations
   */
  analyzeJspMetrics(sourceFiles: readonly ProjectedSourceSummaryFields[]): JspAnalysisResult {
    const tagLibraryMap = new Map<string, RawDetectedTagLibrary>();
    const jspFileMetrics: JspFileMetricsData[] = [];
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
   * Computes the top scriptlet files sorted by total blocks.
   * Returns raw metrics without debt level presentation data.
   *
   * @param jspFileMetrics - JSP file metrics to sort and limit
   * @returns Top scriptlet files sorted by total blocks descending
   */
  computeTopScriptletFiles(jspFileMetrics: readonly JspFileMetricsData[]): JspFileMetricsData[] {
    return [...jspFileMetrics]
      .toSorted((a, b) => b.totalScriptletBlocks - a.totalScriptletBlocks)
      .slice(0, uiAnalysisConfig.TOP_FILES_LIMIT);
  }

  /**
   * Computes final tag library list with type classification and sorting.
   * Classifies each library by type (domain classification, not presentation).
   *
   * @param tagLibraryMap - Map of tag library keys to raw tag library data
   * @returns Sorted array of tag libraries with type classification
   */
  computeTagLibraries(tagLibraryMap: Map<string, RawDetectedTagLibrary>): DetectedTagLibraryData[] {
    return Array.from(tagLibraryMap.values())
      .map((tagLib) => {
        const tagType = classifyTagLibrary(tagLib.uri);
        return {
          ...tagLib,
          tagType,
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

  /**
   * Aggregates custom tag library usage from JSP metrics into the tag library map.
   * Deduplicates tags by URI within each file to prevent inflated usage counts
   * when a file has duplicate taglib directives.
   */
  private aggregateTagLibraries(
    customTags: { prefix: string; uri: string }[] | undefined,
    tagLibraryMap: Map<string, RawDetectedTagLibrary>,
  ): void {
    if (!customTags || customTags.length === 0) return;

    // Deduplicate by URI within this file to prevent inflated counts
    const uniqueTags = new Map<string, { prefix: string; uri: string }>();
    for (const tag of customTags) {
      if (!uniqueTags.has(tag.uri)) {
        uniqueTags.set(tag.uri, tag);
      }
    }

    for (const tag of uniqueTags.values()) {
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
