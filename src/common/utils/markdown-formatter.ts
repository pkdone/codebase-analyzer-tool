import path from "path";

/**
 * Utility functions for formatting content as markdown code blocks.
 */

/**
 * Interface for file-like objects that can be formatted as markdown code blocks.
 */
export interface FileLike {
  /** File path or relative path */
  filepath: string;
  /** File type/extension (e.g., 'ts', 'js', 'java') */
  type: string;
  /** File content */
  content: string;
}

/**
 * Formats an array of file-like objects into markdown code blocks.
 * Each file is wrapped in a code block with the appropriate language identifier.
 *
 * @param files - Array of file-like objects with filepath, type, and content
 * @returns Formatted string with markdown code blocks for each file
 *
 * @example
 * ```typescript
 * const files = [
 *   { filepath: 'src/app.ts', type: 'ts', content: 'export const app = {};' }
 * ];
 * const formatted = formatFilesAsMarkdownCodeBlocks(files);
 * // Returns: "```ts\nexport const app = {};\n```\n\n"
 * ```
 */
export function formatFilesAsMarkdownCodeBlocks(files: FileLike[]): string {
  return files.map((file) => `\`\`\`${file.type}\n${file.content}\n\`\`\`\n\n`).join("");
}

/**
 * Formats an array of file-like objects into markdown code blocks with filepath as header.
 * Each file is wrapped in a code block with the filepath as a comment/header.
 *
 * @param files - Array of file-like objects with filepath, type, and content
 * @param baseDirPath - Optional base directory path for calculating relative paths
 * @returns Formatted string with markdown code blocks for each file
 *
 * @example
 * ```typescript
 * const files = [
 *   { filepath: '/project/src/app.ts', type: 'ts', content: 'export const app = {};' }
 * ];
 * const formatted = formatFilesAsMarkdownCodeBlocksWithPath(files, '/project');
 * // Returns: "\n``` src/app.ts\nexport const app = {};\n```\n"
 * ```
 */
export function formatFilesAsMarkdownCodeBlocksWithPath(
  files: FileLike[],
  baseDirPath?: string,
): string {
  return files
    .map((file) => {
      const relativePath = baseDirPath ? path.relative(baseDirPath, file.filepath) : file.filepath;
      return `\n\`\`\` ${relativePath}\n${file.content.trim()}\n\`\`\`\n`;
    })
    .join("");
}
