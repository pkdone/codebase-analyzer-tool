import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens, reportingTokens } from "../../../../di/tokens";
import type { UiTechnologyAnalysisData } from "./ui-analysis.types";
import { JavaFrameworkAnalyzer } from "./analyzers/java-framework-analyzer";
import { JspMetricsAnalyzer } from "./analyzers/jsp-metrics-analyzer";

/**
 * Data provider for aggregating Java-specific UI technology data including
 * framework detection, JSP metrics, and tag library usage.
 *
 * Analyzes Java UI technologies (JSP, Struts, JSF, Spring MVC) for scriptlets
 * and custom tags to measure technical debt.
 *
 * Returns raw domain data without presentation concerns (CSS classes, etc.).
 * Presentation logic is handled by the Section's prepareHtmlData() method.
 *
 * This class orchestrates the analysis using dedicated analyzers:
 * - JavaFrameworkAnalyzer for framework detection from XML configs
 * - JspMetricsAnalyzer for JSP metrics and tag library analysis
 */
@injectable()
export class JavaUiTechnologyDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(reportingTokens.JavaFrameworkAnalyzer)
    private readonly frameworkAnalyzer: JavaFrameworkAnalyzer,
    @inject(reportingTokens.JspMetricsAnalyzer)
    private readonly jspMetricsAnalyzer: JspMetricsAnalyzer,
  ) {}

  /**
   * Aggregates UI technology analysis for a project.
   * Orchestrates the analysis of frameworks, JSP metrics, and tag libraries.
   * Returns raw data without presentation fields.
   */
  async getUiTechnologyAnalysis(projectName: string): Promise<UiTechnologyAnalysisData> {
    // Fetch all source files from the project
    const sourceFiles = await this.sourcesRepository.getProjectSourcesSummariesByFileType(
      projectName,
      [],
    );

    // Analyze frameworks from XML configuration files
    const frameworks = this.frameworkAnalyzer.analyzeFrameworks(sourceFiles);

    // Analyze JSP files for metrics and tag libraries
    const jspAnalysis = this.jspMetricsAnalyzer.analyzeJspMetrics(sourceFiles);

    // Process and sort the results
    const topScriptletFiles = this.jspMetricsAnalyzer.computeTopScriptletFiles(
      jspAnalysis.jspFileMetrics,
    );
    const detectedTagLibraries = this.jspMetricsAnalyzer.computeTagLibraries(
      jspAnalysis.tagLibraryMap,
    );

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
      detectedTagLibraries,
      topScriptletFiles,
    };
  }
}
