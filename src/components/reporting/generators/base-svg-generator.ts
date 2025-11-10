/**
 * Base class for SVG generators providing common utility methods.
 * Reduces code duplication across flowchart, domain-model, and architecture generators.
 */
export abstract class BaseSvgGenerator {
  /**
   * Escape XML special characters to prevent injection and rendering issues.
   */
  protected escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Sanitize text for use as HTML/SVG ID attribute.
   * Replaces non-alphanumeric characters (except hyphens and underscores) with hyphens.
   */
  protected sanitizeId(text: string): string {
    return text.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  }

  /**
   * Wrap text to fit within specified width based on font size.
   * Uses character width estimation and word wrapping.
   * Limits output to 3 lines maximum.
   */
  protected wrapText(text: string, maxWidth: number, fontSize: number): string[] {
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
   * Create SVG header with definitions.
   * @param width SVG width
   * @param height SVG height
   * @param arrowheadFillColor Color for the arrowhead marker (default: #00684A)
   */
  protected createSvgHeader(width: number, height: number, arrowheadFillColor = "#00684A"): string {
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
              fill="${arrowheadFillColor}"
            />
          </marker>
        </defs>`;
  }

  /**
   * Generate empty diagram SVG with a message.
   * @param width SVG width
   * @param height SVG height
   * @param message Message to display
   * @param fontFamily Font family for text
   * @param fontSize Font size for text
   */
  protected generateEmptyDiagram(
    width: number,
    height: number,
    message: string,
    fontFamily: string,
    fontSize: number,
  ): string {
    const centerX = width / 2;
    const centerY = height / 2;

    return `
      <svg
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
        xmlns="http://www.w3.org/2000/svg"
        style="background-color: #f8f9fa; border-radius: 8px;"
      >
        <text
          x="${centerX}"
          y="${centerY}"
          text-anchor="middle"
          font-family="${fontFamily}"
          font-size="${fontSize}"
          fill="#8b95a1"
        >
          ${this.escapeXml(message)}
        </text>
      </svg>`;
  }
}
