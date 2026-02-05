import { injectable } from "tsyringe";
import type { UiFramework } from "../ui-analysis.types";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../../config/placeholders.config";
import type { ProjectedSourceSummaryFields } from "../../../../../repositories/sources/sources.model";

/**
 * Analyzes UI frameworks detected from XML configuration files.
 * Aggregates frameworks by name and version, collecting configuration file paths.
 */
@injectable()
export class JavaFrameworkAnalyzer {
  /**
   * Analyzes UI framework detection from source files (typically XML configuration files).
   * Aggregates frameworks by name and version, collecting configuration file paths.
   *
   * @param sourceFiles - Source files with summary data to analyze
   * @returns Array of detected UI frameworks sorted alphabetically by name
   */
  analyzeFrameworks(sourceFiles: readonly ProjectedSourceSummaryFields[]): UiFramework[] {
    const frameworkMap = new Map<string, UiFramework>();
    const frameworkFiles = sourceFiles.filter((f) => f.summary?.uiFramework);

    for (const file of frameworkFiles) {
      const framework = file.summary?.uiFramework;
      if (!framework) continue;

      const key = `${framework.name}:${framework.version ?? UNKNOWN_VALUE_PLACEHOLDER}`;
      const existing = frameworkMap.get(key);

      if (existing) {
        // Avoid duplicate file paths in configFiles list
        const configFiles = existing.configFiles.includes(file.filepath)
          ? existing.configFiles
          : [...existing.configFiles, file.filepath];
        frameworkMap.set(key, {
          name: existing.name,
          version: existing.version,
          configFiles,
        });
      } else {
        frameworkMap.set(key, {
          name: framework.name,
          version: framework.version,
          // Use authoritative file.filepath instead of LLM-provided configFile
          configFiles: [file.filepath],
        });
      }
    }

    return Array.from(frameworkMap.values()).toSorted((a, b) => a.name.localeCompare(b.name));
  }
}
