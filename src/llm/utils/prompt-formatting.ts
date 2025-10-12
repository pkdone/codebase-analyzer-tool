import type { ProjectedSourceMetataContentAndSummary } from "../../repositories/source/sources.model";

/**
 * Formats source file metadata into markdown code blocks for LLM prompts.
 *
 * This utility converts an array of source files (with their content and file types)
 * into a single formatted string using markdown code block syntax. Each file's content
 * is wrapped in a code block with the appropriate language identifier.
 *
 * This is commonly used for:
 * - Preparing code for RAG (Retrieval-Augmented Generation) workflows
 * - Formatting vector search results for LLM consumption
 * - Creating structured prompts from multiple source files
 *
 * @param sourceFileMetadataList - Array of source file metadata including content and type
 * @returns Formatted string with markdown code blocks for each file
 *
 * @example
 * ```typescript
 * const files = [
 *   { filepath: 'app.ts', type: 'typescript', content: 'const x = 1;' },
 *   { filepath: 'app.py', type: 'python', content: 'x = 1' }
 * ];
 * const formatted = formatSourcesForPrompt(files);
 * // Returns: ```typescript\nconst x = 1;\n```\n\n```python\nx = 1\n```\n\n
 * ```
 */
export function formatSourcesForPrompt(
  sourceFileMetadataList: ProjectedSourceMetataContentAndSummary[],
): string {
  return sourceFileMetadataList
    .map((fileMetadata) => `\`\`\`${fileMetadata.type}\n${fileMetadata.content}\n\`\`\`\n\n`)
    .join("");
}
