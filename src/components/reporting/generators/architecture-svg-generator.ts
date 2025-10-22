import { injectable } from "tsyringe";
import type { IntegrationPointInfo } from "../report-gen.types";

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
      return this.generateEmptyArchitectureDiagram(opts);
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
   * Build the complete SVG markup for an architecture diagram
   */
  private buildArchitectureDiagramSvg(
    microservices: Microservice[],
    integrationPoints: IntegrationPointInfo[],
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
    const servicePositions: { x: number; y: number; name: string }[] = [];

    microservices.forEach((service, index) => {
      const row = Math.floor(index / servicesPerRow);
      const col = index % servicesPerRow;

      const x = options.padding + col * horizontalSpacing + horizontalSpacing / 2;
      const y = options.padding + row * verticalSpacing + verticalSpacing / 2;

      servicePositions.push({ x, y, name: service.name });
      serviceNodes.push(this.createServiceNode(service, x, y, options));
    });

    // Generate integration connections
    const connections = this.createIntegrationConnections(
      servicePositions,
      integrationPoints,
      options,
    );

    // Combine all SVG elements
    const svgElements = [
      this.createSvgHeader(width, height),
      ...connections,
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
        ${this.escapeXml(service.name)}
      </text>`;

    return `
      <g id="service-${this.sanitizeId(service.name)}">
        ${serviceBox}
        ${serviceTitle}
      </g>`;
  }

  /**
   * Create connections between services based on integration points
   */
  private createIntegrationConnections(
    _servicePositions: { x: number; y: number; name: string }[],
    _integrationPoints: IntegrationPointInfo[],
    _options: Required<ArchitectureDiagramSvgOptions>,
  ): string[] {
    // Disable integration connections for cleaner diagram
    return [];
  }

  /**
   * Create SVG header with definitions
   */
  private createSvgHeader(width: number, height: number): string {
    return `
      <svg
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
        xmlns="http://www.w3.org/2000/svg"
        style="background-color: #f8f9fa; border-radius: 8px;"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#00ED64"
            />
          </marker>
        </defs>`;
  }

  /**
   * Generate empty diagram for no microservices
   */
  private generateEmptyArchitectureDiagram(
    options: Required<ArchitectureDiagramSvgOptions>,
  ): string {
    const centerX = options.width / 2;
    const centerY = options.height / 2;

    return `
      <svg
        width="${options.width}"
        height="${options.height}"
        viewBox="0 0 ${options.width} ${options.height}"
        xmlns="http://www.w3.org/2000/svg"
        style="background-color: #f8f9fa; border-radius: 8px;"
      >
        <text
          x="${centerX}"
          y="${centerY}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize}"
          fill="#8b95a1"
        >
          No microservices architecture defined
        </text>
      </svg>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Sanitize text for use as HTML ID
   */
  private sanitizeId(text: string): string {
    return text.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  }
}
