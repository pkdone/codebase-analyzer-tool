import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { CodeStructureDataProvider } from "./code-structure-data-provider";
import { DependencyTreeSvgGenerator } from "../../generators/svg/dependency-tree-svg-generator";
import { TableViewModel } from "../../view-models/table-view-model";
import { htmlReportConstants } from "../../html-report.constants";
import { reportSectionsConfig } from "../../report-sections.config";
import type { HierarchicalJavaClassDependency } from "../../../../repositories/sources/sources.model";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-gen.types";
import { SECTION_NAMES } from "../../reporting.constants";
import path from "path";

/**
 * Report section for code structure data (top-level Java classes with dependency trees).
 */
@injectable()
export class CodeStructureSection implements ReportSection {
  constructor(
    @inject(reportingTokens.CodeStructureDataProvider)
    private readonly codeStructureDataProvider: CodeStructureDataProvider,
    @inject(reportingTokens.DependencyTreeSvgGenerator)
    private readonly svgGenerator: DependencyTreeSvgGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.CODE_STRUCTURE;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const topLevelJavaClasses =
      await this.codeStructureDataProvider.getTopLevelJavaClasses(projectName);
    return { topLevelJavaClasses };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const topLevelJavaClasses = sectionData.topLevelJavaClasses ?? [];

    const svgDir = path.join(htmlDir, htmlReportConstants.directories.DEPENDENCY_TREES);

    // Generate SVG files for each top-level Java class and create hyperlinks
    const topLevelJavaClassesDisplayData = await Promise.all(
      topLevelJavaClasses.map(async (classData) => {
        // Generate SVG file for this class's dependency tree
        const svgFileName = await this.svgGenerator.generateHierarchicalDependencyTreeSvg(
          classData.namespace,
          classData.dependencies,
          svgDir,
        );

        // Create hyperlink to the SVG file
        const svgRelativePath = htmlReportConstants.paths.DEPENDENCY_TREES_DIR + svgFileName;
        const classpathLink = htmlReportConstants.html.LINK_TEMPLATE(
          svgRelativePath,
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

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const topLevelJavaClasses = sectionData.topLevelJavaClasses ?? [];

    return [
      {
        filename: reportSectionsConfig.jsonDataFiles.topLevelJavaClasses,
        data: topLevelJavaClasses,
      },
    ];
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
}
