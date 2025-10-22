import { injectable } from "tsyringe";

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
  nodeWidth?: number;
  nodeHeight?: number;
  padding?: number;
  fontSize?: number;
  fontFamily?: string;
}

/**
 * Generates SVG flowcharts for business processes.
 * Creates sequential flow diagrams showing key business activities as connected nodes.
 */
@injectable()
export class FlowchartSvgGenerator {
  private readonly defaultOptions: Required<FlowchartSvgOptions> = {
    width: 800,
    height: 400,
    nodeWidth: 150,
    nodeHeight: 60,
    padding: 40,
    fontSize: 12,
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  /**
   * Generate SVG flowchart for a single business process
   */
  generateFlowchartSvg(process: BusinessProcess, options: FlowchartSvgOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const activities = process.keyBusinessActivities;

    if (activities.length === 0) {
      return this.generateEmptyFlowchart(opts);
    }

    // Calculate dimensions based on number of activities
    const nodeSpacing = 200;
    const totalWidth = Math.max(opts.width, activities.length * nodeSpacing + opts.padding * 2);
    const totalHeight = opts.nodeHeight + opts.padding * 2; // Compact height based on node height

    // Generate SVG content
    const svgContent = this.buildFlowchartSvg(activities, totalWidth, totalHeight, opts);

    return svgContent;
  }

  /**
   * Generate SVG flowcharts for multiple business processes
   */
  generateMultipleFlowchartsSvg(
    processes: BusinessProcess[],
    options: FlowchartSvgOptions = {},
  ): string[] {
    return processes.map((process) => this.generateFlowchartSvg(process, options));
  }

  /**
   * Build the complete SVG markup for a flowchart
   */
  private buildFlowchartSvg(
    activities: BusinessProcessActivity[],
    width: number,
    height: number,
    options: Required<FlowchartSvgOptions>,
  ): string {
    const nodeSpacing = 200;
    const startX = options.padding + options.nodeWidth / 2; // Account for node centering
    const centerY = height / 2;

    // Generate nodes and connections
    const nodes: string[] = [];
    const connections: string[] = [];

    activities.forEach((activity, index) => {
      const x = startX + index * nodeSpacing;
      const nodeId = `node-${index}`;

      // Create node
      nodes.push(this.createFlowchartNode(nodeId, x, centerY, activity.activity, options));

      // Create connection to next node
      if (index < activities.length - 1) {
        const nextX = startX + (index + 1) * nodeSpacing;
        connections.push(
          this.createConnection(
            x + options.nodeWidth / 2, // Start from right edge of current node
            centerY,
            nextX - options.nodeWidth / 2, // End at left edge of next node
            centerY,
          ),
        );
      }
    });

    // Combine all SVG elements
    const svgElements = [this.createSvgHeader(width, height), ...connections, ...nodes, "</svg>"];

    return svgElements.join("\n");
  }

  /**
   * Create a flowchart node (rectangle with text)
   */
  private createFlowchartNode(
    id: string,
    x: number,
    y: number,
    text: string,
    options: Required<FlowchartSvgOptions>,
  ): string {
    const rectX = x - options.nodeWidth / 2;
    const rectY = y - options.nodeHeight / 2;

    // Wrap text to fit within node width
    const wrappedText = this.wrapText(text, options.nodeWidth, options.fontSize);
    const lineHeight = options.fontSize * 1.2;
    const totalTextHeight = (wrappedText.length - 1) * lineHeight;
    const startY = y - totalTextHeight / 2 + options.fontSize * 0.3; // Better vertical centering

    return `
      <g id="${id}">
        <rect
          x="${rectX}"
          y="${rectY}"
          width="${options.nodeWidth}"
          height="${options.nodeHeight}"
          rx="8"
          ry="8"
          fill="#ffffff"
          stroke="#00684A"
          stroke-width="2"
        />
        ${wrappedText
          .map(
            (line, index) => `
        <text
          x="${x}"
          y="${startY + index * lineHeight}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize}"
          font-weight="500"
          fill="#001e2b"
        >
          ${this.escapeXml(line)}
        </text>`,
          )
          .join("")}
      </g>`;
  }

  /**
   * Create a connection arrow between nodes
   */
  private createConnection(x1: number, y1: number, x2: number, y2: number): string {
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6; // 30 degrees

    // Calculate arrow head points
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowX1 = x2 - arrowLength * Math.cos(angle - arrowAngle);
    const arrowY1 = y2 - arrowLength * Math.sin(angle - arrowAngle);
    const arrowX2 = x2 - arrowLength * Math.cos(angle + arrowAngle);
    const arrowY2 = y2 - arrowLength * Math.sin(angle + arrowAngle);

    return `
      <g>
        <line
          x1="${x1}"
          y1="${y1}"
          x2="${x2}"
          y2="${y2}"
          stroke="#00684A"
          stroke-width="2"
          marker-end="url(#arrowhead)"
        />
        <polygon
          points="${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}"
          fill="#00684A"
        />
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
              fill="#00684A"
            />
          </marker>
        </defs>`;
  }

  /**
   * Generate empty flowchart for processes with no activities
   */
  private generateEmptyFlowchart(options: Required<FlowchartSvgOptions>): string {
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
          No business activities defined
        </text>
      </svg>`;
  }

  /**
   * Wrap text to fit within specified width
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    // Rough estimation: each character is about 0.6 * fontSize wide
    const charWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor(maxWidth / charWidth);

    if (text.length <= maxCharsPerLine) {
      return [text];
    }

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, force it onto its own line
          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.slice(0, 3); // Limit to 3 lines max
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
}
