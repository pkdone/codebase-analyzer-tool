import path from "path";
import os from "os";
import { injectable } from "tsyringe";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { outputConfig } from "../../config/output.config";
import { readFile, writeFile } from "../../common/fs/file-operations";
import { listDirectoryEntries, ensureDirectoryExists } from "../../common/fs/directory-operations";
import pLimit from "p-limit";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import { formatErrorMessage } from "../../common/utils/error-formatters";
import LLMRouter from "../../llm/core/llm-router";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { formatCodebaseForPrompt } from "./utils/codebase-formatter";
import { formatDateForFilename } from "../../common/utils/date-utils";
import { inputConfig } from "../querying/config/input.config";

/**
 * Interface to define the filename and question of a file requirement prompt
 */
export interface FileRequirementPrompt {
  filename: string;
  question: string;
}

/**
 * Class responsible for processing codebase insights using LLM
 */
@injectable()
export class RawCodeToInsightsFileGenerator {
  /**
   * Load prompts from files in the input folder
   */
  async loadPrompts(): Promise<FileRequirementPrompt[]> {
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
      logErrorMsgAndDetail("Problem loading prompts from input folder", error);
    }

    return prompts;
  }

  /**
   * Process source files with prompts and write individual output files.
   */
  async generateInsightsToFiles(
    llmRouter: LLMRouter,
    srcDirPath: string,
    llmName: string,
    prompts: FileRequirementPrompt[],
  ): Promise<string[]> {
    const codeBlocksContent = await formatCodebaseForPrompt(srcDirPath);
    await this.dumpCodeBlocksToTempFile(codeBlocksContent);
    const limit = pLimit(fileProcessingConfig.MAX_CONCURRENCY);
    const tasks = prompts.map(async (prompt) => {
      return limit(async () => {
        const result = await this.executePromptAgainstCodebase(
          prompt,
          codeBlocksContent,
          llmRouter,
        );
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
    llmRouter: LLMRouter,
  ): Promise<string> {
    const resource = prompt.filename;
    const fullPrompt = `${prompt.question}\n${codeBlocksContents}`;
    let response = "";

    try {
      const executionResult = await llmRouter.executeCompletion(resource, fullPrompt, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      if (!executionResult) {
        response = "No response received from LLM.";
      } else {
        response =
          typeof executionResult === "object" ? JSON.stringify(executionResult) : executionResult;
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail("Problem introspecting and processing source files", error);
      response = formatErrorMessage(error);
    }

    return response;
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
      logErrorMsgAndDetail("Failed to dump code blocks to temp file", error);
    }
  }
}
