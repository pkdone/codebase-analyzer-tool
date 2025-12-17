/**
 * Utility functions for SVG generation.
 * Provides common functionality for escaping XML, sanitizing IDs, text wrapping,
 * and creating SVG headers and empty diagrams.
 */

/**
 * Escape XML special characters to prevent injection and rendering issues.
 */
export function escapeXml(text: string): string {
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
export function sanitizeId(text: string): string {
  return text.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
}

/**
 * Wrap text to fit within specified width based on font size.
 * Uses character width estimation and word wrapping.
 * Limits output to 3 lines maximum.
 */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
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
export function createSvgHeader(
  width: number,
  height: number,
  arrowheadFillColor = "#00684A",
): string {
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
export function generateEmptyDiagram(
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
          ${escapeXml(message)}
        </text>
      </svg>`;
}
