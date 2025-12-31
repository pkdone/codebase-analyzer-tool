import { inject, injectable } from "tsyringe";
import { reportingTokens } from "../../../../di/tokens";
import { MermaidRenderer } from "../mermaid/mermaid-renderer";
import {
  escapeMermaidLabel,
  generateNodeId,
  DIAGRAM_STYLES,
  generateEmptyDiagramSvg,
  buildMermaidInitDirective,
} from "../mermaid/mermaid-definition-builders";
import { buildStyleDefinitions, applyStyle } from "../mermaid/mermaid-styles.config";
import { visualizationConfig } from "../visualization.config";

export interface BusinessProcessActivity {
  activity: string;
  description: string;
}

export interface BusinessProcess {
  name: string;
  description: string;
  keyBusinessActivities: BusinessProcessActivity[];
}

export interface FlowchartSvgOptions {
  width?: number;
  height?: number;
}

/**
 * Generates SVG flowcharts for business processes using Mermaid.
 * Creates sequential flow diagrams showing key business activities as connected nodes.
 */
@injectable()
export class FlowchartSvgGenerator {
  private readonly defaultOptions: Required<FlowchartSvgOptions> = {
    width: visualizationConfig.flowchart.DEFAULT_WIDTH,
    height: visualizationConfig.flowchart.DEFAULT_HEIGHT,
  };

  constructor(
    @inject(reportingTokens.MermaidRenderer)
    private readonly mermaidRenderer: MermaidRenderer,
  ) {}

  /**
   * Generate SVG flowchart for a single business process
   */
  async generateFlowchartSvg(
    process: BusinessProcess,
    options: FlowchartSvgOptions = {},
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    const activities = process.keyBusinessActivities;

    if (activities.length === 0) {
      return this.generateEmptyDiagram("No business activities defined");
    }

    // Build mermaid definition
    const mermaidDefinition = this.buildFlowchartDefinition(activities);

    // Render to SVG using mermaid-cli
    const svg = await this.mermaidRenderer.renderToSvg(mermaidDefinition, {
      width: Math.max(opts.width, activities.length * visualizationConfig.flowchart.WIDTH_PER_ACTIVITY),
      height: opts.height,
      backgroundColor: DIAGRAM_STYLES.backgroundColor,
    });

    return svg;
  }

  /**
   * Generate SVG flowcharts for multiple business processes
   */
  async generateMultipleFlowchartsSvg(
    processes: BusinessProcess[],
    options: FlowchartSvgOptions = {},
  ): Promise<string[]> {
    const results: string[] = [];
    for (const process of processes) {
      const svg = await this.generateFlowchartSvg(process, options);
      results.push(svg);
    }
    return results;
  }

  /**
   * Build the Mermaid flowchart definition for activities
   */
  private buildFlowchartDefinition(activities: BusinessProcessActivity[]): string {
    const lines: string[] = [buildMermaidInitDirective(), "graph LR"];

    // Add style definitions
    lines.push(buildStyleDefinitions());

    // Create nodes and connections
    const nodeIds: string[] = [];

    activities.forEach((activity, index) => {
      const nodeId = generateNodeId(activity.activity, index);
      nodeIds.push(nodeId);

      // Add node definition with rectangular shape
      lines.push(`    ${nodeId}["${escapeMermaidLabel(activity.activity)}"]`);

      // Apply style
      lines.push(applyStyle(nodeId, "process"));
    });

    // Add connections between consecutive nodes
    for (let i = 0; i < nodeIds.length - 1; i++) {
      lines.push(`    ${nodeIds[i]} --> ${nodeIds[i + 1]}`);
    }

    return lines.join("\n");
  }

  /**
   * Generate an empty diagram placeholder
   */
  private generateEmptyDiagram(message: string): string {
    return generateEmptyDiagramSvg(message);
  }
}
