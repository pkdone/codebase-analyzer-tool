/**
 * Codebase formatting utilities for LLM prompts.
 *
 * This module contains application-specific logic for formatting source code
 * directories into markdown for LLM consumption. Unlike generic utilities in
 * src/common/utils/, this module is specifically designed for the codebase
 * analysis domain.
 */
import { findFilesRecursively } from "../../common/fs/directory-operations";
import { getFileExtension } from "../../common/fs/path-utils";
import { readFile } from "../../common/fs/file-operations";
import {
  formatFilesAsMarkdownCodeBlocksWithPath,
  type FileLike,
} from "../../common/utils/markdown-formatter";

/**
 * Regex pattern to match trailing slash at end of string
 */
const TRAILING_SLASH_PATTERN = /\/$/;

/**
 * Format source files in a directory as markdown code blocks.
 * Recursively finds all files, reads their contents, and formats them as markdown code blocks
 * with file path headers.
 * @param dirPath - The path to the directory containing source files
 * @param folderIgnoreList - List of folder names to ignore during traversal
 * @param filenameIgnorePrefix - Prefix for filenames to ignore
 * @param binaryFileExtensionIgnoreList - List of binary file extensions to skip
 * @param filenameIgnoreList - List of specific filenames to ignore
 * @returns Promise resolving to formatted content containing all source files as markdown code blocks
 */
export async function formatSourceFilesAsMarkdown(
  dirPath: string,
  folderIgnoreList: readonly string[],
  filenameIgnorePrefix: string,
  binaryFileExtensionIgnoreList: readonly string[],
  filenameIgnoreList: readonly string[] = [],
): Promise<string> {
  // Remove trailing slashes from the directory path
  const srcDirPath = dirPath.replace(TRAILING_SLASH_PATTERN, "");

  // Find all source files recursively with ignore rules applied
  const srcFilepaths = await findFilesRecursively(
    srcDirPath,
    folderIgnoreList,
    filenameIgnorePrefix,
    filenameIgnoreList,
  );

  // Merge all source files into markdown code blocks
  const codeBlocksContent = await mergeSourceFilesIntoMarkdownCodeblock(
    srcFilepaths,
    srcDirPath,
    binaryFileExtensionIgnoreList,
  );

  return codeBlocksContent;
}

/**
 * Merge the content of all source files into markdown code blocks.
 * @param filepaths - Array of file paths to process
 * @param srcDirPath - Base directory path for calculating relative paths
 * @param ignoreList - List of file extensions to ignore (binary files)
 * @returns Promise resolving to markdown content with code blocks
 */
async function mergeSourceFilesIntoMarkdownCodeblock(
  filepaths: string[],
  srcDirPath: string,
  ignoreList: readonly string[],
): Promise<string> {
  const filePromises = filepaths.map(async (filepath): Promise<FileLike | null> => {
    const type = getFileExtension(filepath).toLowerCase();
    if (ignoreList.includes(type)) return null; // Skip file if it has binary content
    const content = await readFile(filepath);
    return {
      filepath,
      type,
      content: content.trim(),
    };
  });
  const files = (await Promise.all(filePromises)).filter((file): file is FileLike => file !== null);
  return formatFilesAsMarkdownCodeBlocksWithPath(files, srcDirPath).trim();
}
