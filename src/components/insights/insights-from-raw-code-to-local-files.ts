import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { injectable } from "tsyringe";
import { appConfig } from "../../config/app.config";
import {
  readFile,
  writeFile,
  readDirContents,
  findFilesRecursively,
} from "../../common/utils/fs-utils";
import pLimit from "p-limit";
import { logErrorMsgAndDetail, getErrorText } from "../../common/utils/error-utils";
import LLMRouter from "../../llm/core/llm-router";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { mergeSourceFilesIntoMarkdownCodeblock } from "../../common/utils/markdown-utils";

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
  static async loadPrompts(): Promise<FileRequirementPrompt[]> {
    const inputDir = appConfig.REQUIREMENTS_PROMPTS_FOLDERPATH;
    const prompts: FileRequirementPrompt[] = [];

    try {
      await fs.mkdir(inputDir, { recursive: true });
      const files = await readDirContents(inputDir);
      const promptFiles = files.filter((file) => appConfig.REQUIREMENTS_FILE_REGEX.test(file.name));

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
    const srcFilepaths = await findFilesRecursively(
      srcDirPath,
      appConfig.FOLDER_IGNORE_LIST,
      appConfig.FILENAME_PREFIX_IGNORE,
    );
    const codeBlocksContent = await mergeSourceFilesIntoMarkdownCodeblock(srcFilepaths, srcDirPath, appConfig.BINARY_FILE_EXTENSION_IGNORE_LIST);
    await this.dumpCodeBlocksToTempFile(codeBlocksContent);
    const limit = pLimit(appConfig.MAX_CONCURRENCY);
    const tasks = prompts.map(async (prompt) => {
      return limit(async () => {
        const result = await this.executePromptAgainstCodebase(
          prompt,
          codeBlocksContent,
          llmRouter,
        );
        const outputFileName = `${prompt.filename}.result`;
        const outputFilePath = path.join(process.cwd(), appConfig.OUTPUT_DIR, outputFileName);
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
      response = getErrorText(error);
    }

    return response;
  }

  /**
   * Dump code blocks content to a temporary file for debugging/inspection purposes.
   */
  private async dumpCodeBlocksToTempFile(codeBlocksContent: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
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
