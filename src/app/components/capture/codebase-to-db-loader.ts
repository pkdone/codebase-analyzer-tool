import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../../common/llm/llm-router";
import path from "path";
import { getCanonicalFileType, type FileProcessingRulesType } from "../../config/file-handling";
import { readFile } from "../../../common/fs/file-operations";
import { findFilesRecursively } from "../../../common/fs/directory-operations";
import { sortFilesBySize } from "../../../common/fs/file-sorting";
import { getFileExtension } from "../../../common/fs/path-utils";
import { countLines } from "../../../common/utils/text-utils";
import { logErr } from "../../../common/utils/logging";
import { FileSummarizerService, type PartialSourceSummaryType } from "./file-summarizer.service";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { SourceRecord } from "../../repositories/sources/sources.model";
import {
  repositoryTokens,
  llmTokens,
  captureTokens,
  configTokens,
  serviceTokens,
} from "../../di/tokens";
import { isOk } from "../../../common/types/result.types";
import type { LlmConcurrencyService } from "../concurrency";

/**
 * Loads each source file into a class to represent it.
 */
@injectable()
export default class CodebaseToDBLoader {
  /**
   * Constructor with dependency injection.
   * @param sourcesRepository - Repository for storing source file data
   * @param llmRouter - Router for LLM operations (embeddings, summarization)
   * @param fileSummarizer - Service for generating file summaries
   * @param fileProcessingConfig - Configuration for file processing rules
   * @param llmConcurrencyService - Service for managing LLM call concurrency
   */
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(captureTokens.FileSummarizerService)
    private readonly fileSummarizer: FileSummarizerService,
    @inject(configTokens.FileProcessingRules)
    private readonly fileProcessingConfig: FileProcessingRulesType,
    @inject(serviceTokens.LlmConcurrencyService)
    private readonly llmConcurrencyService: LlmConcurrencyService,
  ) {}

  /**
   * Generate the set of representations of source files including each one's content and metadata.
   */
  async captureCodebaseToDatabase(
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyCaptured: boolean,
  ): Promise<void> {
    const srcFilepaths = await findFilesRecursively(srcDirPath, {
      folderIgnoreList: this.fileProcessingConfig.FOLDER_IGNORE_LIST,
      filenameIgnorePrefix: this.fileProcessingConfig.FILENAME_PREFIX_IGNORE,
      filenameIgnoreList: this.fileProcessingConfig.FILENAME_IGNORE_LIST,
    });
    // Sort files by size (largest first) to distribute work more evenly during concurrent processing
    const sortedFilepaths = await sortFilesBySize(srcFilepaths);
    await this.processAndStoreFiles(
      sortedFilepaths,
      projectName,
      srcDirPath,
      skipIfAlreadyCaptured,
    );
  }

  /**
   * Loops through a list of file paths, loads each file's content, and prints the content.
   */
  private async processAndStoreFiles(
    filepaths: readonly string[],
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyCaptured: boolean,
  ) {
    console.log(
      `Captuing data on ${filepaths.length} files to go into the MongoDB database sources collection`,
    );
    let existingFiles: ReadonlySet<string> = new Set<string>();

    if (skipIfAlreadyCaptured) {
      const existingFilePaths = await this.sourcesRepository.getProjectFilesPaths(projectName);
      existingFiles = new Set(existingFilePaths);

      if (existingFiles.size > 0) {
        console.log(
          `Not capturing some of the metadata files into the database because they've already been captured by a previous run - change env var 'SKIP_ALREADY_PROCESSED_FILES' to force re-processing of all files`,
        );
      }
    } else {
      console.log(
        `Deleting older version of the project's metadata files from the database to enable the metadata to be re-generated - change env var 'SKIP_ALREADY_PROCESSED_FILES' to avoid re-processing of all files`,
      );
      await this.sourcesRepository.deleteSourcesByProject(projectName);
    }

    let successes = 0;
    let failures = 0;
    const tasks = filepaths.map(async (filepath) => {
      return this.llmConcurrencyService.run(async () => {
        try {
          await this.processAndStoreSourceFile(
            filepath,
            projectName,
            srcDirPath,
            skipIfAlreadyCaptured,
            existingFiles,
          );
          successes++;
        } catch (error: unknown) {
          failures++;
          logErr(`Failed to process file: ${filepath}`, error);
        }
      });
    });
    await Promise.allSettled(tasks);
    console.log(
      `Processed ${filepaths.length} files. Succeeded: ${successes}, Failed: ${failures}`,
    );

    if (failures > 0) {
      console.warn(`Warning: ${failures} files failed to process. Check logs for details.`);
    }
  }

  /**
   * Processes a source file by reading content, generating summaries and embeddings, then stores the complete record.
   */
  private async processAndStoreSourceFile(
    fullFilepath: string,
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyCaptured: boolean,
    existingFiles: ReadonlySet<string>,
  ) {
    const fileType = getFileExtension(fullFilepath).toLowerCase();

    if (
      (this.fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST as readonly string[]).includes(
        fileType,
      )
    ) {
      return; // Skip file if it has binary content
    }

    const filepath = path.relative(srcDirPath, fullFilepath);
    if (skipIfAlreadyCaptured && existingFiles.has(filepath)) return;
    const rawContent = await readFile(fullFilepath);
    const content = rawContent.trim();
    if (!content) return; // Skip empty files
    const filename = path.basename(filepath);
    const linesCount = countLines(content);
    const { summary, summaryError, summaryVector } = await this.generateSummaryAndEmbeddings(
      filepath,
      fileType,
      content,
    );
    const contentVector = await this.getContentEmbeddings(filepath, content);
    const canonicalType = getCanonicalFileType(filepath, fileType);
    const sourceFileRecord: SourceRecord = {
      projectName,
      filename,
      filepath,
      fileType,
      canonicalType,
      linesCount,
      content,
      ...(summary && { summary }),
      ...(summaryError && { summaryError }),
      ...(summaryVector && { summaryVector }),
      ...(contentVector && { contentVector }),
    };
    await this.sourcesRepository.insertSource(sourceFileRecord);
  }

  /**
   * Generates summary and embeddings for a file, handling errors gracefully.
   * Returns the summary, any error that occurred, and the summary vector.
   */
  private async generateSummaryAndEmbeddings(
    filepath: string,
    type: string,
    content: string,
  ): Promise<{
    summary: PartialSourceSummaryType | undefined;
    summaryError: string | undefined;
    summaryVector: number[] | undefined;
  }> {
    let summary: PartialSourceSummaryType | undefined;
    let summaryError: string | undefined;
    let summaryVector: number[] | undefined;
    const summaryResult = await this.fileSummarizer.summarize(filepath, type, content);

    if (isOk(summaryResult)) {
      summary = summaryResult.value;
      const summaryVectorResult = await this.getContentEmbeddings(
        filepath,
        JSON.stringify(summary),
      );
      summaryVector = summaryVectorResult ?? undefined;
    } else {
      summaryError = `Failed to generate summary: ${summaryResult.error.message}`;
    }

    return { summary, summaryError, summaryVector };
  }

  /**
   * Get the embeddings vector for a piece of content, limiting the content's size if it is likely
   * to blow the LLM context window size.
   */
  private async getContentEmbeddings(filepath: string, content: string) {
    return await this.llmRouter.generateEmbeddings(filepath, content);
  }
}
