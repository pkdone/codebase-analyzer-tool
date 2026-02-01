import path from "path";
import os from "os";
import { injectable, inject } from "tsyringe";
import type { FileProcessingRulesType } from "../../../config/file-handling";
import { outputConfig } from "../../../config/output.config";
import { readFile, writeFile } from "../../../../common/fs/file-operations";
import {
  listDirectoryEntries,
  ensureDirectoryExists,
} from "../../../../common/fs/directory-operations";
import { logErr, logWarn } from "../../../../common/utils/logging";
import { formatError } from "../../../../common/utils/error-formatters";
import { llmTokens, configTokens, serviceTokens } from "../../../di/tokens";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm-request.types";
import { aggregateFilesToMarkdown } from "../../../../common/utils/file-content-aggregator";
import { formatDateForFilename } from "../../../../common/utils/date-utils";
import { inputConfig } from "../../../config/input.config";
import { isOk } from "../../../../common/types/result.types";
import type { LlmConcurrencyService } from "../../concurrency";

/**
 * Interface to define the filename and question of a file requirement prompt
 */
interface FileRequirementPrompt {
  filename: string;
  question: string;
}

/**
 * Executor responsible for processing codebase analysis requirements using prompt files.
 * Executes requirement prompts from files in the input/ directory against the codebase,
 * bypassing the database-driven workflow and writing output directly to files.
 */
@injectable()
export class RequirementPromptExecutor {
  /**
   * Constructor with dependency injection.
   * @param llmRouter - Router for LLM operations
   * @param fileProcessingConfig - Configuration for file processing rules
   * @param llmConcurrencyService - Service for managing LLM call concurrency
   */
  constructor(
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(configTokens.FileProcessingRules)
    private readonly fileProcessingConfig: FileProcessingRulesType,
    @inject(serviceTokens.LlmConcurrencyService)
    private readonly llmConcurrencyService: LlmConcurrencyService,
  ) {}

  /**
   * Execute requirement prompts against source files and write individual output files.
   */
  async executeRequirementsToFiles(srcDirPath: string, llmName: string): Promise<string[]> {
    const prompts = await this.loadPrompts();
    const codeBlocksContent = await aggregateFilesToMarkdown(srcDirPath, {
      folderIgnoreList: this.fileProcessingConfig.FOLDER_IGNORE_LIST,
      filenameIgnorePrefix: this.fileProcessingConfig.FILENAME_PREFIX_IGNORE,
      binaryFileExtensionIgnoreList: this.fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      filenameIgnoreList: this.fileProcessingConfig.FILENAME_IGNORE_LIST,
    });
    await this.dumpCodeBlocksToTempFile(codeBlocksContent);
    const tasks = prompts.map(async (prompt) => {
      return this.llmConcurrencyService.run(async () => {
        const result = await this.executePromptAgainstCodebase(prompt, codeBlocksContent);
        const outputFileName = `${prompt.filename}.result`;
        const outputFilePath = path.join(process.cwd(), outputConfig.OUTPUT_DIR, outputFileName);

        // Add indicator for empty responses
        const isEmpty = !result.trim();
        const content = isEmpty
          ? `GENERATED-BY: ${llmName}\n\nREQUIREMENT: ${prompt.question}\n\nRECOMENDATIONS:\n\n[WARNING: LLM returned an empty response]\n`
          : `GENERATED-BY: ${llmName}\n\nREQUIREMENT: ${prompt.question}\n\nRECOMENDATIONS:\n\n${result.trim()}\n`;

        await writeFile(outputFilePath, content);
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
        // Detect and warn about empty responses
        if (!response.trim()) {
          logWarn(`Empty LLM response received for prompt: ${resource}`);
        }
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
