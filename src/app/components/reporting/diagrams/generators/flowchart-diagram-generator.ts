import { injectable } from "tsyringe";
import { escapeMermaidLabel, generateNodeId, applyStyle } from "../utils";
import { BaseDiagramGenerator, type BaseDiagramOptions } from "./base-diagram-generator";
import { flowchartConfig } from "./flowchart.config";

export interface BusinessProcessActivity {
  activity: string;
  description: string;
}

export interface BusinessProcess {
  name: string;
  description: string;
  keyBusinessActivities: BusinessProcessActivity[];
}

export type FlowchartDiagramOptions = BaseDiagramOptions;

/**
 * Generates Mermaid flowcharts for business processes.
 * Creates sequential flow diagrams showing key business activities as connected nodes.
 * Extends BaseDiagramGenerator to share common functionality.
 *
 * Diagrams are rendered client-side using Mermaid.js.
 */
@injectable()
export class FlowchartDiagramGenerator extends BaseDiagramGenerator<FlowchartDiagramOptions> {
  protected readonly defaultOptions: Required<FlowchartDiagramOptions> = {
    width: flowchartConfig.DEFAULT_WIDTH,
    height: flowchartConfig.DEFAULT_HEIGHT,
  };

  /**
   * Generate flowchart for a single business process.
   * Returns HTML with embedded Mermaid definition for client-side rendering.
   */
  generateFlowchartDiagram(
    process: BusinessProcess,
    options: FlowchartDiagramOptions = {},
  ): string {
    return this.generateDiagram(
      process,
      options,
      (data) => data.keyBusinessActivities.length === 0,
      "No business activities defined",
      (data) => this.buildFlowchartDefinition(data.keyBusinessActivities),
    );
  }

  /**
   * Generate flowcharts for multiple business processes.
   * Returns array of HTML strings with embedded Mermaid definitions.
   */
  generateMultipleFlowchartDiagrams(
    processes: BusinessProcess[],
    options: FlowchartDiagramOptions = {},
  ): string[] {
    return processes.map((process) => this.generateFlowchartDiagram(process, options));
  }

  /**
   * Build the Mermaid flowchart definition for activities
   */
  private buildFlowchartDefinition(activities: BusinessProcessActivity[]): string {
    const lines = this.initializeDiagram("graph LR");

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
}
