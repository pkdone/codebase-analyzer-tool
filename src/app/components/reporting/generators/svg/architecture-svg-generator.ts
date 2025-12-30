import { inject, injectable } from "tsyringe";
import { reportingTokens } from "../../../../di/tokens";
import type { MermaidRenderer } from "../mermaid/mermaid-renderer";
import {
  escapeMermaidLabel,
  generateNodeId,
  buildStyleDefinitions,
  applyStyle,
  buildMermaidInitDirective,
} from "../mermaid/mermaid-definition-builders";
import { BaseMermaidGenerator, type BaseDiagramOptions } from "./base-mermaid-generator";

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

export type ArchitectureDiagramSvgOptions = BaseDiagramOptions;

/**
 * Generates SVG diagrams for microservices architecture using Mermaid.
 * Creates component-style diagrams showing microservices and their relationships.
 * Extends BaseMermaidGenerator to share common rendering functionality.
 */
@injectable()
export class ArchitectureSvgGenerator extends BaseMermaidGenerator<ArchitectureDiagramSvgOptions> {
  protected readonly defaultOptions: Required<ArchitectureDiagramSvgOptions> = {
    width: 1400,
    height: 500,
  };

  constructor(
    @inject(reportingTokens.MermaidRenderer)
    mermaidRenderer: MermaidRenderer,
  ) {
    super(mermaidRenderer);
  }

  /**
   * Generate SVG diagram for microservices architecture
   */
  async generateArchitectureDiagramSvg(
    microservices: Microservice[],
    options: ArchitectureDiagramSvgOptions = {},
  ): Promise<string> {
    const opts = this.mergeOptions(options);

    if (microservices.length === 0) {
      return this.generateEmptyDiagram("No microservices architecture defined");
    }

    // Build mermaid definition
    const mermaidDefinition = this.buildArchitectureDiagramDefinition(microservices);

    // Calculate dynamic dimensions based on content - ensure enough width for text
    const maxNameLength = Math.max(...microservices.map((s) => s.name.length));
    const widthPerService = Math.max(180, maxNameLength * 12);
    const servicesPerRow = Math.min(microservices.length, 4);
    const rows = Math.ceil(microservices.length / servicesPerRow);
    const dynamicWidth = Math.max(opts.width, servicesPerRow * widthPerService + 100);
    const dynamicHeight = Math.max(opts.height, rows * 100 + 150);

    return this.renderDiagram(mermaidDefinition, dynamicWidth, dynamicHeight);
  }

  /**
   * Build the Mermaid diagram definition for microservices architecture
   */
  private buildArchitectureDiagramDefinition(microservices: Microservice[]): string {
    // Use flowchart TB (top-bottom) with horizontal subgraph for better text display
    const lines: string[] = [buildMermaidInitDirective(), "flowchart TB"];

    // Add style definitions
    lines.push(buildStyleDefinitions());

    // Create a subgraph for services (no label)
    lines.push('    subgraph services[" "]');

    // Group services into rows for grid layout
    const servicesPerRow = 3;
    const rows: string[][] = [];

    for (let i = 0; i < microservices.length; i += servicesPerRow) {
      rows.push(
        microservices.slice(i, i + servicesPerRow).map((s, idx) => {
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
