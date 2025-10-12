import path from "path";
import { fileProcessingConfig } from "../../../config/file-processing.config";
import { findFilesRecursively } from "../../../common/fs/directory-operations";
import { getFileExtension } from "../../../common/fs/path-utils";
import { readFile } from "../../../common/fs/file-operations";

/**
 * Regex pattern to match trailing slash at end of string
 */
const TRAILING_SLASH_PATTERN = /\/$/;

/**
 * Process a codebase directory and format its contents for use in an LLM prompt
 * @param codebaseDirPath - The path to the codebase directory
 * @returns Promise resolving to formatted content containing all source files as markdown code blocks
 */
export async function formatCodebaseForPrompt(codebaseDirPath: string): Promise<string> {
  // Remove trailing slashes from the directory path
  const srcDirPath = codebaseDirPath.replace(TRAILING_SLASH_PATTERN, "");

  // Find all source files recursively with ignore rules applied
  const srcFilepaths = await findFilesRecursively(
    srcDirPath,
    fileProcessingConfig.FOLDER_IGNORE_LIST,
    fileProcessingConfig.FILENAME_PREFIX_IGNORE,
  );

  // Merge all source files into markdown code blocks
  const codeBlocksContent = await mergeSourceFilesIntoMarkdownCodeblock(
    srcFilepaths,
    srcDirPath,
    fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
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
  const contentPromises = filepaths.map(async (filepath) => {
    const relativeFilepath = path.relative(srcDirPath, filepath);
    const type = getFileExtension(filepath).toLowerCase();
    if (ignoreList.includes(type)) return ""; // Skip file if it has binary content
    const content = await readFile(filepath);
    return `\n\`\`\` ${relativeFilepath}\n${content.trim()}\n\`\`\`\n`;
  });
  const contentParts = await Promise.all(contentPromises);
  return contentParts
    .filter((part) => part !== "")
    .join("")
    .trim();
}
