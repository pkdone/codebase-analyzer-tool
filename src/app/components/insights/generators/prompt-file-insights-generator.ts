import path from "path";
import os from "os";
import { injectable } from "tsyringe";
import { fileProcessingRules as fileProcessingConfig } from "../../../config/file-handling";
import { llmConcurrencyLimiter } from "../../../config/concurrency.config";
import { outputConfig } from "../../../config/output.config";
import { readFile, writeFile } from "../../../../common/fs/file-operations";
import {
  listDirectoryEntries,
  ensureDirectoryExists,
  findFilesRecursively,
} from "../../../../common/fs/directory-operations";
import { getFileExtension } from "../../../../common/fs/path-utils";
import { logErr } from "../../../../common/utils/logging";
import { formatError } from "../../../../common/utils/error-formatters";
import { inject } from "tsyringe";
import { llmTokens } from "../../../di/tokens";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm.types";
import {
  formatFilesAsMarkdownCodeBlocksWithPath,
  type SourceFileContent,
} from "../../../../common/utils/markdown-formatter";
import { formatDateForFilename } from "../../../../common/utils/date-utils";
import { inputConfig } from "../../../prompts/config/input.config";
import { isOk } from "../../../../common/types/result.types";

/**
 * Regex pattern to match trailing slash at end of string
 */
const TRAILING_SLASH_PATTERN = /\/$/;

/**
 * Interface to define the filename and question of a file requirement prompt
 */
interface FileRequirementPrompt {
  filename: string;
  question: string;
}

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
  return formatFilesAsMarkdownCodeBlocksWithPath(files, srcDirPath).trim();
}

/**
 * Class responsible for processing codebase insights using prompt files.
 * Generates insights directly from prompt files in the input/ directory,
 * bypassing the database-driven workflow and writing output directly to files.
 */
@injectable()
export class PromptFileInsightsGenerator {
  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Process source files with prompts and write individual output files.
   */
  async generateInsightsToFiles(srcDirPath: string, llmName: string): Promise<string[]> {
    const prompts = await this.loadPrompts();
    const codeBlocksContent = await formatSourceFilesAsMarkdown(
      srcDirPath,
      fileProcessingConfig.FOLDER_IGNORE_LIST,
      fileProcessingConfig.FILENAME_PREFIX_IGNORE,
      fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      fileProcessingConfig.FILENAME_IGNORE_LIST,
    );
    await this.dumpCodeBlocksToTempFile(codeBlocksContent);
    const tasks = prompts.map(async (prompt) => {
      return llmConcurrencyLimiter(async () => {
        const result = await this.executePromptAgainstCodebase(prompt, codeBlocksContent);
        const outputFileName = `${prompt.filename}.result`;
        const outputFilePath = path.join(process.cwd(), outputConfig.OUTPUT_DIR, outputFileName);
        await writeFile(
          outputFilePath,
          `GENERATED-BY: ${llmName}\n\nREQUIREMENT: ${prompt.question}\n\nRECOMENDATIONS:\n\n${result.trim()}\n`,
        );
        return outputFilePath;
      });
    });

    return Promise.all(tasks);
  }

  /**
   * Execute a prompt against a codebase and return the LLM's response.
   */
  private async executePromptAgainstCodebase(
    prompt: FileRequirementPrompt,
    codeBlocksContents: string,
  ): Promise<string> {
    const resource = prompt.filename;
    const fullPrompt = `${prompt.question}\n${codeBlocksContents}`;
    let response = "";

    try {
      const result = await this.llmRouter.executeCompletion(resource, fullPrompt, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      if (!isOk(result)) {
        response = `LLM completion failed: ${result.error.message}`;
      } else {
        // Type-safe: return type correctly infers string for TEXT output format
        response = result.value;
      }
    } catch (error: unknown) {
      logErr("Problem introspecting and processing source files", error);
      response = formatError(error);
    }

    return response;
  }

  /**
   * Load prompts from files in the input folder
   */
  private async loadPrompts(): Promise<FileRequirementPrompt[]> {
    const inputDir = inputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH;
    const prompts: FileRequirementPrompt[] = [];

    try {
      await ensureDirectoryExists(inputDir);
      const files = await listDirectoryEntries(inputDir);
      const promptFiles = files.filter((file) =>
        inputConfig.REQUIREMENTS_FILE_REGEX.test(file.name),
      );

      for (const file of promptFiles) {
        const filePath = path.join(inputDir, file.name);
        const content = await readFile(filePath);
        prompts.push({
          filename: file.name.replace(".prompt", ""),
          question: content.trim(),
        });
      }
    } catch (error: unknown) {
      logErr("Problem loading prompts from input folder", error);
    }

    return prompts;
  }

  /**
   * Dump code blocks content to a temporary file for debugging/inspection purposes.
   */
  private async dumpCodeBlocksToTempFile(codeBlocksContent: string): Promise<void> {
    const timestamp = formatDateForFilename();
    const tempFileName = `codebase-dump-${timestamp}.txt`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      await writeFile(tempFilePath, codeBlocksContent);
      console.log(`Project code has been dumped to: ${tempFilePath}`);
    } catch (error: unknown) {
      logErr("Failed to dump code blocks to temp file", error);
    }
  }
}
