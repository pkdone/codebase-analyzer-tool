import { injectable } from "tsyringe";
import { generateNodeId } from "../../diagrams/utils";
import {
  BaseDiagramGenerator,
  type BaseDiagramOptions,
} from "../../diagrams/generators/base-diagram-generator";
import { architectureConfig } from "../../diagrams/diagrams.config";
import { createFlowchartBuilder } from "../../diagrams/builders";
import { DIAGRAM_CSS_CLASSES } from "../../config/diagram-css-classes.config";

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
    width: architectureConfig.DEFAULT_WIDTH,
    height: architectureConfig.DEFAULT_HEIGHT,
  };

  /**
   * Generate diagram for microservices architecture.
   * Returns HTML with embedded Mermaid definition for client-side rendering.
   */
  generateArchitectureDiagram(
    microservices: Microservice[],
    options: ArchitectureDiagramOptions = {},
  ): string {
    return this.generateDiagram(
      microservices,
      options,
      (data) => data.length === 0,
      "No microservices architecture defined",
      (data) => this.buildArchitectureDiagramDefinition(data),
    );
  }

  /**
   * Build the Mermaid diagram definition for microservices architecture
   * using the type-safe MermaidFlowchartBuilder.
   */
  private buildArchitectureDiagramDefinition(microservices: Microservice[]): string {
    const builder = createFlowchartBuilder({ direction: "TB" });

    // Group services into rows for grid layout
    const rows: string[][] = [];

    for (let i = 0; i < microservices.length; i += architectureConfig.SERVICES_PER_ROW) {
      rows.push(
        microservices.slice(i, i + architectureConfig.SERVICES_PER_ROW).map((s, idx) => {
          return generateNodeId(s.name, i + idx);
        }),
      );
    }

    // Create a subgraph for services (invisible label)
    builder.addSubgraph("services", " ", (sub) => {
      // Add all service nodes
      for (let i = 0; i < microservices.length; i++) {
        const service = microservices[i];
        const serviceId = generateNodeId(service.name, i);
        sub.addNode(serviceId, service.name, "rectangle");
      }

      // Create invisible horizontal links within each row
      for (const row of rows) {
        if (row.length > 1) {
          for (let i = 0; i < row.length - 1; i++) {
            sub.addEdge(row[i], row[i + 1], undefined, "invisible");
          }
        }
      }

      // Create invisible vertical links between rows
      for (let i = 0; i < rows.length - 1; i++) {
        sub.addEdge(rows[i][0], rows[i + 1][0], undefined, "invisible");
      }
    });

    // Style the subgraph to be invisible
    builder.styleSubgraph("services", "fill:transparent,stroke:transparent,stroke-width:0");

    // Apply styles to all service nodes
    for (let i = 0; i < microservices.length; i++) {
      const serviceId = generateNodeId(microservices[i].name, i);
      builder.applyStyle(serviceId, DIAGRAM_CSS_CLASSES.SERVICE);
    }

    return builder.render();
  }
}
