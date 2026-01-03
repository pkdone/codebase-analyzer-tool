import { injectable } from "tsyringe";
import { escapeMermaidLabel, generateNodeId, applyStyle } from "../utils";
import { BaseDiagramGenerator, type BaseDiagramOptions } from "./base-diagram-generator";
import { visualizationConfig } from "../../generators/visualization.config";

export interface Microservice {
  name: string;
  description: string;
  entities: {
    name: string;
    description: string;
    attributes: string[];
  }[];
  endpoints: {
    path: string;
    method: string;
    description: string;
  }[];
  operations: {
    operation: string;
    method: string;
    description: string;
  }[];
}

export type ArchitectureDiagramOptions = BaseDiagramOptions;

/**
 * Generates Mermaid diagrams for microservices architecture.
 * Creates component-style diagrams showing microservices and their relationships.
 * Extends BaseDiagramGenerator to share common functionality.
 *
 * Diagrams are rendered client-side using Mermaid.js.
 */
@injectable()
export class ArchitectureDiagramGenerator extends BaseDiagramGenerator<ArchitectureDiagramOptions> {
  protected readonly defaultOptions: Required<ArchitectureDiagramOptions> = {
    width: visualizationConfig.architecture.DEFAULT_WIDTH,
    height: visualizationConfig.architecture.DEFAULT_HEIGHT,
  };

  /**
   * Generate diagram for microservices architecture.
   * Returns HTML with embedded Mermaid definition for client-side rendering.
   */
  generateArchitectureDiagram(
    microservices: Microservice[],
    options: ArchitectureDiagramOptions = {},
  ): string {
    this.mergeOptions(options);

    if (microservices.length === 0) {
      return this.generateEmptyDiagram("No microservices architecture defined");
    }

    // Build mermaid definition
    const mermaidDefinition = this.buildArchitectureDiagramDefinition(microservices);

    return this.wrapForClientRendering(mermaidDefinition);
  }

  /**
   * Build the Mermaid diagram definition for microservices architecture
   */
  private buildArchitectureDiagramDefinition(microservices: Microservice[]): string {
    const archConfig = visualizationConfig.architecture;

    // Use flowchart TB (top-bottom) with horizontal subgraph for better text display
    const lines = this.initializeDiagram("flowchart TB");

    // Create a subgraph for services (no label)
    lines.push('    subgraph services[" "]');

    // Group services into rows for grid layout
    const rows: string[][] = [];

    for (let i = 0; i < microservices.length; i += archConfig.SERVICES_PER_ROW) {
      rows.push(
        microservices.slice(i, i + archConfig.SERVICES_PER_ROW).map((s, idx) => {
          return generateNodeId(s.name, i + idx);
        }),
      );
    }

    // Declare all service nodes
    microservices.forEach((service, index) => {
      const serviceId = generateNodeId(service.name, index);
      lines.push(`        ${serviceId}["${escapeMermaidLabel(service.name)}"]`);
    });

    // Create invisible horizontal links within each row to keep them on the same level
    rows.forEach((row) => {
      if (row.length > 1) {
        // Link all items in the row horizontally with invisible links
        for (let i = 0; i < row.length - 1; i++) {
          lines.push(`        ${row[i]} ~~~ ${row[i + 1]}`);
        }
      }
    });

    // Create invisible vertical links between rows
    for (let i = 0; i < rows.length - 1; i++) {
      // Connect first item of current row to first item of next row
      lines.push(`        ${rows[i][0]} ~~~ ${rows[i + 1][0]}`);
    }

    lines.push("    end");

    // Style the subgraph to be invisible (matches background)
    lines.push("    style services fill:transparent,stroke:transparent,stroke-width:0");

    // Apply styles to service nodes
    microservices.forEach((service, index) => {
      const serviceId = generateNodeId(service.name, index);
      lines.push(applyStyle(serviceId, "service"));
    });

    return lines.join("\n");
  }
}
