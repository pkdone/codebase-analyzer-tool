import path from "path";
import os from "os";
import { injectable } from "tsyringe";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { outputConfig } from "../../config/output.config";
import { readFile, writeFile } from "../../common/fs/file-operations";
import { listDirectoryEntries, ensureDirectoryExists } from "../../common/fs/directory-operations";
import pLimit from "p-limit";
import { logError } from "../../common/utils/logging";
import { formatError } from "../../common/utils/error-formatters";
import { inject } from "tsyringe";
import { llmTokens } from "../../di/tokens";
import LLMRouter from "../../llm/llm-router";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { formatCodebaseAsMarkdown } from "../../common/utils/codebase-to-markdown";
import { formatDateForFilename } from "../../common/utils/date-utils";
import { inputConfig } from "../../config/input.config";

/**
 * Interface to define the filename and question of a file requirement prompt
 */
interface FileRequirementPrompt {
  filename: string;
  question: string;
}

/**
 * Class responsible for processing codebase insights using prompt files.
 * Generates insights directly from prompt files in the input/ directory,
 * bypassing the database-driven workflow and writing output directly to files.
 */
@injectable()
export class RawAnalyzerDrivenByReqsFiles {
  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Process source files with prompts and write individual output files.
   */
  async generateInsightsToFiles(srcDirPath: string, llmName: string): Promise<string[]> {
    const prompts = await this.loadPrompts();
    const codeBlocksContent = await formatCodebaseAsMarkdown(srcDirPath);
    await this.dumpCodeBlocksToTempFile(codeBlocksContent);
    const limit = pLimit(fileProcessingConfig.MAX_CONCURRENCY);
    const tasks = prompts.map(async (prompt) => {
      return limit(async () => {
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
      const executionResult = await this.llmRouter.executeCompletion(resource, fullPrompt, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      if (executionResult === null) {
        response = "No response received from LLM.";
      } else {
        // executionResult is guaranteed to be a string when outputFormat is TEXT
        response = executionResult;
      }
    } catch (error: unknown) {
      logError("Problem introspecting and processing source files", error);
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
      logError("Problem loading prompts from input folder", error);
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
      logError("Failed to dump code blocks to temp file", error);
    }
  }
}
