/**
 * Utility functions for aggregating file contents into markdown format.
 * Combines filesystem traversal with markdown formatting for common use cases
 * like preparing text files for LLM prompts in RAG (Retrieval Augmented Generation) applications.
 */

import { findFilesRecursively } from "../fs/directory-operations";
import { readFile } from "../fs/file-operations";
import { getFileExtension } from "../fs/path-utils";
import type { FileFilterConfig } from "../fs/file-filter.types";
import {
  formatFilesAsMarkdownCodeBlocksWithPath,
  type SourceFileContent,
} from "./markdown-formatter";

/**
 * Regex pattern to match trailing slash at end of string
 */
const TRAILING_SLASH_PATTERN = /\/$/;

/**
 * Aggregate files in a directory into markdown code blocks.
 * Recursively finds all files, reads their contents, and formats them as markdown code blocks
 * with file path headers.
 *
 * @param dirPath - The path to the directory containing files to aggregate
 * @param filterConfig - Configuration for filtering files during aggregation
 * @returns Promise resolving to formatted content containing all files as markdown code blocks
 */
export async function readAndFormatFilesAsMarkdown(
  dirPath: string,
  filterConfig: FileFilterConfig,
): Promise<string> {
  // Remove trailing slashes from the directory path
  const baseDirPath = dirPath.replace(TRAILING_SLASH_PATTERN, "");

  // Find all files recursively with ignore rules applied
  const filepaths = await findFilesRecursively(baseDirPath, {
    folderIgnoreList: filterConfig.folderIgnoreList,
    filenameIgnorePrefix: filterConfig.filenameIgnorePrefix,
    filenameIgnoreList: filterConfig.filenameIgnoreList,
  });

  // Merge all files into markdown code blocks
  const codeBlocksContent = await mergeFilesIntoMarkdownCodeblock(
    filepaths,
    baseDirPath,
    filterConfig.binaryFileExtensionIgnoreList,
  );

  return codeBlocksContent;
}

/**
 * Merge the content of all files into markdown code blocks.
 *
 * @param filepaths - Array of file paths to process
 * @param baseDirPath - Base directory path for calculating relative paths
 * @param ignoreList - List of file extensions to ignore (binary files)
 * @returns Promise resolving to markdown content with code blocks
 */
async function mergeFilesIntoMarkdownCodeblock(
  filepaths: string[],
  baseDirPath: string,
  ignoreList: readonly string[],
): Promise<string> {
  const filePromises = filepaths.map(async (filepath): Promise<SourceFileContent | null> => {
    const type = getFileExtension(filepath).toLowerCase();
    if (ignoreList.includes(type)) return null; // Skip file if it has binary content
    const content = await readFile(filepath);
    return {
      filepath,
      type,
      content: content.trim(),
    };
  });
  const files = (await Promise.all(filePromises)).filter(
    (file): file is SourceFileContent => file !== null,
  );
  return formatFilesAsMarkdownCodeBlocksWithPath(files, baseDirPath).trim();
}
