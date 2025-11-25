import { injectable, inject } from "tsyringe";
import type { ReportSection } from "./report-section.interface";
import { reportingTokens } from "../../../di/tokens";
import { CodeStructureDataProvider } from "../data-providers/code-structure-data-provider";
import { DependencyTreePngGenerator } from "../generators/png/dependency-tree-png-generator";
import { TableViewModel } from "../view-models/table-view-model";
import { htmlReportConstants } from "../html-report.constants";
import { reportSectionsConfig } from "../report-sections.config";
import type {
  HierarchicalJavaClassDependency,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../../repositories/sources/sources.model";
import type { PreparedHtmlReportData } from "../html-report-writer";
import type { PreparedJsonData } from "../json-report-writer";
import type { ReportData } from "../report-gen.types";
import { SECTION_NAMES } from "../reporting.constants";
import path from "path";

/**
 * Report section for code structure data (top-level Java classes with dependency trees).
 */
@injectable()
export class CodeStructureSection implements ReportSection {
  constructor(
    @inject(reportingTokens.CodeStructureDataProvider)
    private readonly codeStructureDataProvider: CodeStructureDataProvider,
    @inject(reportingTokens.DependencyTreePngGenerator)
    private readonly pngGenerator: DependencyTreePngGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.CODE_STRUCTURE;
  }

  isStandardSection(): boolean {
    return true; // This section uses standard rendering
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const topLevelJavaClasses =
      await this.codeStructureDataProvider.getTopLevelJavaClasses(projectName);
    return { topLevelJavaClasses };
  }

  /**
   * Counts unique dependencies in a hierarchical dependency structure, excluding the root element.
   * Uses an iterative approach with a stack to avoid potential stack overflow with deep trees.
   */
  private countUniqueDependencies(
    dependencies: readonly HierarchicalJavaClassDependency[],
  ): number {
    const uniqueClasspaths = new Set<string>();
    const stack = [...dependencies]; // Initialize stack with top-level dependencies

    while (stack.length > 0) {
      const dependency = stack.pop();
      if (!dependency) continue;

      uniqueClasspaths.add(dependency.namespace);

      // Add children to the stack to be processed
      if (dependency.dependencies && dependency.dependencies.length > 0) {
        for (const child of dependency.dependencies) {
          stack.push(child);
        }
      }
    }

    return uniqueClasspaths.size;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: unknown,
    htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    // Handle both cases: sectionData as array (tests) or as object with topLevelJavaClasses property (production)
    let topLevelJavaClasses: ReportData["topLevelJavaClasses"];
    if (Array.isArray(sectionData)) {
      topLevelJavaClasses = sectionData as HierarchicalTopLevelJavaClassDependencies[];
    } else {
      const sectionDataTyped = sectionData as Partial<ReportData>;
      topLevelJavaClasses = Array.isArray(sectionDataTyped.topLevelJavaClasses)
        ? sectionDataTyped.topLevelJavaClasses
        : [];
    }

    const pngDir = path.join(htmlDir, htmlReportConstants.directories.DEPENDENCY_TREES);

    // Generate PNG files for each top-level Java class and create hyperlinks
    const topLevelJavaClassesDisplayData = await Promise.all(
      topLevelJavaClasses.map(async (classData) => {
        // Generate PNG file for this class's dependency tree
        const pngFileName = await this.pngGenerator.generateHierarchicalDependencyTreePng(
          classData.namespace,
          classData.dependencies,
          pngDir,
        );

        // Create hyperlink to the PNG file
        const pngRelativePath = htmlReportConstants.paths.DEPENDENCY_TREES_DIR + pngFileName;
        const classpathLink = htmlReportConstants.html.LINK_TEMPLATE(
          pngRelativePath,
          classData.namespace,
        );

        // Count total dependencies from hierarchical structure
        const dependencyCount = this.countUniqueDependencies(classData.dependencies);

        return {
          [htmlReportConstants.columnHeaders.CLASSPATH]: classpathLink,
          [htmlReportConstants.columnHeaders.DEPENDENCIES_COUNT]: dependencyCount,
        };
      }),
    );

    return {
      topLevelJavaClasses,
      topLevelJavaClassesTableViewModel: new TableViewModel(topLevelJavaClassesDisplayData),
    };
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  prepareJsonData(_baseData: ReportData, sectionData: unknown): PreparedJsonData[] {
    // Handle both cases: sectionData as array (tests) or as object with topLevelJavaClasses property (production)
    let topLevelJavaClasses: ReportData["topLevelJavaClasses"];
    if (Array.isArray(sectionData)) {
      topLevelJavaClasses = sectionData as HierarchicalTopLevelJavaClassDependencies[];
    } else {
      const sectionDataTyped = sectionData as Partial<ReportData>;
      topLevelJavaClasses = Array.isArray(sectionDataTyped.topLevelJavaClasses)
        ? sectionDataTyped.topLevelJavaClasses
        : [];
    }

    return [
      {
        filename: reportSectionsConfig.jsonDataFiles.topLevelJavaClasses,
        data: topLevelJavaClasses,
      },
    ];
  }
}
