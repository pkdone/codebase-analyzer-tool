import { injectable } from "tsyringe";
import { escapeXml, sanitizeId, createSvgHeader, generateEmptyDiagram } from "./svg-utils";
import type { IntegrationPointInfo } from "../../report-gen.types";

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

export interface ArchitectureDiagramSvgOptions {
  width?: number;
  height?: number;
  padding?: number;
  fontSize?: number;
  fontFamily?: string;
  serviceSpacing?: number;
}

/**
 * Generates SVG diagrams for microservices architecture.
 * Creates component-style diagrams showing microservices and their integration points.
 */
@injectable()
export class ArchitectureSvgGenerator {
  private readonly defaultOptions: Required<ArchitectureDiagramSvgOptions> = {
    width: 1100,
    height: 900,
    padding: 60,
    fontSize: 16,
    fontFamily: "system-ui, -apple-system, sans-serif",
    serviceSpacing: 350,
  };

  /**
   * Generate SVG diagram for microservices architecture
   */
  generateArchitectureDiagramSvg(
    microservices: Microservice[],
    integrationPoints: IntegrationPointInfo[],
    options: ArchitectureDiagramSvgOptions = {},
  ): string {
    const opts = { ...this.defaultOptions, ...options };

    if (microservices.length === 0) {
      return generateEmptyDiagram(
        opts.width,
        opts.height,
        "No microservices architecture defined",
        opts.fontFamily,
        opts.fontSize,
      );
    }

    // Calculate dimensions based on number of services
    const totalWidth = Math.max(
      opts.width,
      microservices.length * opts.serviceSpacing + opts.padding * 2,
    );
    const totalHeight = opts.height;

    // Generate SVG content
    const svgContent = this.buildArchitectureDiagramSvg(
      microservices,
      integrationPoints,
      totalWidth,
      totalHeight,
      opts,
    );

    return svgContent;
  }

  /**
   * Create SVG header with definitions (architecture-specific color)
   */
  private createArchitectureSvgHeader(width: number, height: number): string {
    return createSvgHeader(width, height, "#00ED64");
  }

  /**
   * Build the complete SVG markup for an architecture diagram
   */
  private buildArchitectureDiagramSvg(
    microservices: Microservice[],
    _integrationPoints: IntegrationPointInfo[],
    width: number,
    height: number,
    options: Required<ArchitectureDiagramSvgOptions>,
  ): string {
    // Calculate grid layout
    const servicesPerRow = 3; // 3 services per row
    const rows = Math.ceil(microservices.length / servicesPerRow);
    const horizontalSpacing = (width - options.padding * 2) / servicesPerRow;
    const verticalSpacing = (height - options.padding * 2) / rows;

    // Generate service nodes in grid layout
    const serviceNodes: string[] = [];

    microservices.forEach((service, index) => {
      const row = Math.floor(index / servicesPerRow);
      const col = index % servicesPerRow;

      const x = options.padding + col * horizontalSpacing + horizontalSpacing / 2;
      const y = options.padding + row * verticalSpacing + verticalSpacing / 2;

      serviceNodes.push(this.createServiceNode(service, x, y, options));
    });

    // Combine all SVG elements
    const svgElements = [
      this.createArchitectureSvgHeader(width, height),
      ...serviceNodes,
      "</svg>",
    ];

    return svgElements.join("\n");
  }

  /**
   * Create a microservice node
   */
  private createServiceNode(
    service: Microservice,
    x: number,
    y: number,
    options: Required<ArchitectureDiagramSvgOptions>,
  ): string {
    const nodeWidth = 320; // Moderate block size
    const nodeHeight = 200; // Moderate block size
    const rectX = x - nodeWidth / 2;
    const rectY = y - nodeHeight / 2;

    // Create service box
    const serviceBox = `
      <rect
        x="${rectX}"
        y="${rectY}"
        width="${nodeWidth}"
        height="${nodeHeight}"
        rx="12"
        ry="12"
        fill="#ffffff"
        stroke="#00684A"
        stroke-width="3"
      />`;

    // Create service title only (much larger font)
    const serviceTitle = `
      <text
        x="${x}"
        y="${y}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="${options.fontFamily}"
        font-size="${options.fontSize + 5}"
        font-weight="700"
        fill="#001e2b"
      >
        ${escapeXml(service.name)}
      </text>`;

    return `
      <g id="service-${sanitizeId(service.name)}">
        ${serviceBox}
        ${serviceTitle}
      </g>`;
  }
}
