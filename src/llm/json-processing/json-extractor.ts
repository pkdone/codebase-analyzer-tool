/**
 * Interface to represent parsing outcome
 */
export interface ParsingOutcome {
  parsed: unknown;
  steps: string[];
  resilientDiagnostics?: string;
}

/**
 * Extract JSON content from text and parse it.
 * Handles both markdown-wrapped JSON and raw JSON content.
 * Improved algorithm to handle complex nested content with proper string awareness.
 */
export function extractBalancedJsonThenParse(textContent: string): unknown {
  // Find JSON content by looking for balanced braces/brackets, handling nested structures
  let jsonMatch: string | null = null;
  const markdownMatch = /```(?:json)?\s*([{[][\s\S]*?[}\]])\s*```/.exec(textContent);

  if (markdownMatch) {
    jsonMatch = markdownMatch[1];
  } else {
    // Look for the first opening brace or bracket and find its matching closing one
    const openBraceIndex = textContent.search(/[{[]/);

    if (openBraceIndex !== -1) {
      const startChar = textContent[openBraceIndex];
      const endChar = startChar === "{" ? "}" : "]";
      let depth = 0;
      let endIndex = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = openBraceIndex; i < textContent.length; i++) {
        const char = textContent[i];

        // Handle escape sequences
        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          continue;
        }

        // Handle string boundaries
        if (char === '"') {
          inString = !inString;
          continue;
        }

        // Only count braces when not inside a string
        if (!inString) {
          if (char === startChar) {
            depth++;
          } else if (char === endChar) {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          }
        }
      }

      if (endIndex !== -1) {
        jsonMatch = textContent.substring(openBraceIndex, endIndex + 1);
      } else {
        // Handle truncated JSON - extract from opening brace to end of content
        // This allows sanitization logic to attempt completion
        jsonMatch = textContent.substring(openBraceIndex);
      }
    }
  }

  if (!jsonMatch) throw new Error("No JSON content found");

  try {
    return JSON.parse(jsonMatch);
  } catch {
    // Signal to caller that we found JSON-ish content (so allow sanitization fallback) rather than no JSON at all
    // Use a distinct message different from "No JSON content found" so caller triggers sanitization path
    throw new Error("JsonParseFailed");
  }
}
