import { injectable } from "tsyringe";
import {
  escapeMermaidLabel,
  generateNodeId,
  generateEmptyDiagramSvg,
  buildMermaidInitDirective,
  DIAGRAM_STYLES,
} from "../mermaid/mermaid-definition-builders";
import { buildStyleDefinitions, applyStyle } from "../mermaid/mermaid-styles.config";

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
 * Generates Mermaid flowcharts for business processes.
 * Creates sequential flow diagrams showing key business activities as connected nodes.
 *
 * Diagrams are rendered client-side using Mermaid.js.
 */
@injectable()
export class FlowchartSvgGenerator {
  /**
   * Generate flowchart for a single business process.
   * Returns HTML with embedded Mermaid definition for client-side rendering.
   */
  generateFlowchartSvg(process: BusinessProcess, _options: FlowchartSvgOptions = {}): string {
    const activities = process.keyBusinessActivities;

    if (activities.length === 0) {
      return this.generateEmptyDiagram("No business activities defined");
    }

    // Build mermaid definition
    const mermaidDefinition = this.buildFlowchartDefinition(activities);

    return this.wrapForClientRendering(mermaidDefinition);
  }

  /**
   * Generate flowcharts for multiple business processes.
   * Returns array of HTML strings with embedded Mermaid definitions.
   */
  generateMultipleFlowchartsSvg(
    processes: BusinessProcess[],
    options: FlowchartSvgOptions = {},
  ): string[] {
    return processes.map((process) => this.generateFlowchartSvg(process, options));
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

  /**
   * Wrap a Mermaid definition for client-side rendering.
   */
  private wrapForClientRendering(definition: string): string {
    return `<pre class="mermaid" style="background-color: ${DIAGRAM_STYLES.backgroundColor}; border-radius: 8px; padding: 20px; overflow-x: auto;">\n${definition}\n</pre>`;
  }
}
