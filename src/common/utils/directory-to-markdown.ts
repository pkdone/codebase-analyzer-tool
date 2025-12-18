import { findFilesRecursively } from "../fs/directory-operations";
import { getFileExtension } from "../fs/path-utils";
import { readFile } from "../fs/file-operations";
import { formatFilesAsMarkdownCodeBlocksWithPath, type FileLike } from "./markdown-formatter";

/**
 * Configuration interface for directory formatting operations.
 */
export interface DirectoryFormattingConfig {
  readonly folderIgnoreList: readonly string[];
  readonly filenameIgnorePrefix: string;
  readonly binaryFileExtensionIgnoreList: readonly string[];
}

/**
 * Regex pattern to match trailing slash at end of string
 */
const TRAILING_SLASH_PATTERN = /\/$/;

/**
 * Format the directory contents as markdown code blocks
 * @param dirPath - The path to the directory
 * @param config - Configuration for directory formatting (ignore lists, etc.)
 * @returns Promise resolving to formatted content containing all source files as markdown code blocks
 */
export async function formatDirectoryAsMarkdown(
  dirPath: string,
  config: DirectoryFormattingConfig,
): Promise<string> {
  // Remove trailing slashes from the directory path
  const srcDirPath = dirPath.replace(TRAILING_SLASH_PATTERN, "");

  // Find all source files recursively with ignore rules applied
  const srcFilepaths = await findFilesRecursively(
    srcDirPath,
    config.folderIgnoreList,
    config.filenameIgnorePrefix,
  );

  // Merge all source files into markdown code blocks
  const codeBlocksContent = await mergeSourceFilesIntoMarkdownCodeblock(
    srcFilepaths,
    srcDirPath,
    config.binaryFileExtensionIgnoreList,
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
