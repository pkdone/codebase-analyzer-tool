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
    width: 1200,
    height: 800,
    padding: 40,
    fontSize: 11,
    fontFamily: "system-ui, -apple-system, sans-serif",
    serviceSpacing: 200,
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
    const centerY = height / 2;
    const startX = options.padding;

    // Generate service nodes
    const serviceNodes: string[] = [];
    const servicePositions: { x: number; y: number; name: string }[] = [];

    microservices.forEach((service, index) => {
      const x = startX + index * options.serviceSpacing;
      const y = centerY;

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
    const nodeWidth = 180;
    const nodeHeight = 120;
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

    // Create service title
    const serviceTitle = `
      <text
        x="${x}"
        y="${y - 30}"
        text-anchor="middle"
        font-family="${options.fontFamily}"
        font-size="${options.fontSize + 2}"
        font-weight="700"
        fill="#001e2b"
      >
        ${this.escapeXml(this.truncateText(service.name, 20))}
      </text>`;

    // Create service subtitle
    const serviceSubtitle = `
      <text
        x="${x}"
        y="${y - 10}"
        text-anchor="middle"
        font-family="${options.fontFamily}"
        font-size="${options.fontSize - 1}"
        font-weight="500"
        fill="#00684A"
      >
        Microservice
      </text>`;

    // Create endpoints list
    const endpointsText = service.endpoints
      .slice(0, 3) // Show max 3 endpoints
      .map((endpoint, index) => {
        const endpointY = y + 10 + index * 15;
        return `
          <text
            x="${x}"
            y="${endpointY}"
            text-anchor="middle"
            font-family="${options.fontFamily}"
            font-size="${options.fontSize - 2}"
            fill="#5f6b7a"
          >
            ${endpoint.method} ${this.truncateText(endpoint.path, 15)}
          </text>`;
      })
      .join("");

    // Add "..." if there are more endpoints
    const moreEndpoints =
      service.endpoints.length > 3
        ? `
      <text
        x="${x}"
        y="${y + 55}"
        text-anchor="middle"
        font-family="${options.fontFamily}"
        font-size="${options.fontSize - 2}"
        fill="#8b95a1"
      >
        +${service.endpoints.length - 3} more...
      </text>`
        : "";

    return `
      <g id="service-${this.sanitizeId(service.name)}">
        ${serviceBox}
        ${serviceTitle}
        ${serviceSubtitle}
        ${endpointsText}
        ${moreEndpoints}
      </g>`;
  }

  /**
   * Create connections between services based on integration points
   */
  private createIntegrationConnections(
    servicePositions: { x: number; y: number; name: string }[],
    integrationPoints: IntegrationPointInfo[],
    options: Required<ArchitectureDiagramSvgOptions>,
  ): string[] {
    const connections: string[] = [];
    const serviceMap = new Map(servicePositions.map((pos) => [pos.name.toLowerCase(), pos]));

    integrationPoints.forEach((integration) => {
      // Try to match integration points to services
      const sourceService = this.findMatchingService(integration.namespace, serviceMap);
      const targetService = this.findMatchingService(integration.name, serviceMap);

      if (sourceService && targetService && sourceService !== targetService) {
        connections.push(
          this.createServiceConnection(
            sourceService.x,
            sourceService.y,
            targetService.x,
            targetService.y,
            options,
          ),
        );
      }
    });

    return connections;
  }

  /**
   * Find a service that matches the integration point
   */
  private findMatchingService(
    integrationName: string,
    serviceMap: Map<string, { x: number; y: number; name: string }>,
  ): { x: number; y: number; name: string } | null {
    const integrationLower = integrationName.toLowerCase();

    // Direct name match
    if (serviceMap.has(integrationLower)) {
      const result = serviceMap.get(integrationLower);
      if (result) {
        return result;
      }
    }

    // Partial name match
    for (const [_serviceName, servicePos] of serviceMap) {
      if (_serviceName.includes(integrationLower) || integrationLower.includes(_serviceName)) {
        return servicePos;
      }
    }

    // Keyword-based matching
    const keywords = this.extractKeywords(integrationName);
    for (const [, servicePos] of serviceMap) {
      const serviceKeywords = this.extractKeywords(servicePos.name);
      const overlap = keywords.filter((keyword) => serviceKeywords.includes(keyword));
      if (overlap.length > 0) {
        return servicePos;
      }
    }

    return null;
  }

  /**
   * Extract keywords from a service name
   */
  private extractKeywords(name: string): string[] {
    return name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3)
      .slice(0, 5);
  }

  /**
   * Create a connection between two services
   */
  private createServiceConnection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: Required<ArchitectureDiagramSvgOptions>,
  ): string {
    // Calculate connection points on service boundaries
    const serviceWidth = 180;

    const leftX = x1 + serviceWidth / 2;
    const rightX = x2 - serviceWidth / 2;
    const centerY = (y1 + y2) / 2;

    return `
      <g>
        <line
          x1="${leftX}"
          y1="${centerY}"
          x2="${rightX}"
          y2="${centerY}"
          stroke="#00ED64"
          stroke-width="3"
          stroke-dasharray="8,4"
        />
        <polygon
          points="${rightX},${centerY} ${rightX - 15},${centerY - 5} ${rightX - 15},${centerY + 5}"
          fill="#00ED64"
        />
        <text
          x="${(leftX + rightX) / 2}"
          y="${centerY - 10}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize - 2}"
          fill="#00684A"
          font-weight="500"
        >
          Integration
        </text>
      </g>`;
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
   * Truncate text to fit within node width
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + "...";
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
