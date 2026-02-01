import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../../common/llm/llm-router";
import path from "path";
import { type FileProcessingRulesType } from "../../config/file-handling";
import { getCanonicalFileType } from "./utils";
import type { CanonicalFileType } from "../../schemas/canonical-file-types";
import { readFile } from "../../../common/fs/file-operations";
import { findFilesWithSize } from "../../../common/fs/directory-operations";
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

/** Default batch size for bulk database inserts */
const DEFAULT_BATCH_SIZE = 50;

/**
 * Service that orchestrates the ingestion of source files from a codebase into the database.
 * Handles file discovery, content reading, LLM-based summarization, embedding generation,
 * and persistence of source records.
 */
@injectable()
export default class CodebaseIngestionService {
  /** Buffer for collecting records to batch insert */
  private recordBuffer: SourceRecord[] = [];

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
  async ingestCodebaseToDatabase(
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyIngested: boolean,
  ): Promise<void> {
    // Use findFilesWithSize for efficient file discovery with sizes in a single pass
    // Files are pre-sorted by size (largest first) for better work distribution
    const filesWithSize = await findFilesWithSize(srcDirPath, {
      folderIgnoreList: this.fileProcessingConfig.FOLDER_IGNORE_LIST,
      filenameIgnorePrefix: this.fileProcessingConfig.FILENAME_PREFIX_IGNORE,
      filenameIgnoreList: this.fileProcessingConfig.FILENAME_IGNORE_LIST,
    });
    const sortedFilepaths = filesWithSize.map((f) => f.filepath);
    await this.processAndStoreFiles(
      sortedFilepaths,
      projectName,
      srcDirPath,
      skipIfAlreadyIngested,
    );
  }

  /**
   * Loops through a list of file paths, loads each file's content, and prints the content.
   */
  private async processAndStoreFiles(
    filepaths: readonly string[],
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyIngested: boolean,
  ) {
    console.log(
      `Ingesting data on ${filepaths.length} files to go into the MongoDB database sources collection`,
    );
    let existingFiles: ReadonlySet<string> = new Set<string>();

    if (skipIfAlreadyIngested) {
      const existingFilePaths = await this.sourcesRepository.getProjectFilesPaths(projectName);
      existingFiles = new Set(existingFilePaths);

      if (existingFiles.size > 0) {
        console.log(
          `Not ingesting some of the metadata files into the database because they've already been ingested by a previous run - change env var 'SKIP_ALREADY_PROCESSED_FILES' to force re-processing of all files`,
        );
      }
    } else {
      console.log(
        `Deleting older version of the project's metadata files from the database to enable the metadata to be re-generated - change env var 'SKIP_ALREADY_PROCESSED_FILES' to avoid re-processing of all files`,
      );
      await this.sourcesRepository.deleteSourcesByProject(projectName);
    }

    // Clear the record buffer before starting
    this.recordBuffer = [];

    let successes = 0;
    let failures = 0;
    const tasks = filepaths.map(async (filepath) => {
      return this.llmConcurrencyService.run(async () => {
        try {
          await this.processAndStoreSourceFile(
            filepath,
            projectName,
            srcDirPath,
            skipIfAlreadyIngested,
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

    // Flush any remaining records in the buffer
    await this.flushRecordBuffer();

    console.log(
      `Processed ${filepaths.length} files. Succeeded: ${successes}, Failed: ${failures}`,
    );

    if (failures > 0) {
      console.warn(`Warning: ${failures} files failed to process. Check logs for details.`);
    }
  }

  /**
   * Flushes the record buffer by batch inserting all buffered records.
   * Called when buffer reaches capacity or at the end of processing.
   */
  private async flushRecordBuffer(): Promise<void> {
    if (this.recordBuffer.length === 0) return;

    const batch = [...this.recordBuffer];
    this.recordBuffer = [];

    try {
      await this.sourcesRepository.insertSources(batch);
    } catch (error: unknown) {
      // If batch insert fails, fall back to individual inserts
      logErr(`Batch insert failed, falling back to individual inserts`, error);
      for (const record of batch) {
        try {
          await this.sourcesRepository.insertSource(record);
        } catch (insertError: unknown) {
          logErr(`Failed to insert record for: ${record.filepath}`, insertError);
        }
      }
    }
  }

  /**
   * Processes a source file by reading content, generating summaries and embeddings, then stores the complete record.
   */
  private async processAndStoreSourceFile(
    fullFilepath: string,
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyIngested: boolean,
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
    if (skipIfAlreadyIngested && existingFiles.has(filepath)) return;
    const rawContent = await readFile(fullFilepath);
    const content = rawContent.trim();
    if (!content) return; // Skip empty files
    const filename = path.basename(filepath);
    const linesCount = countLines(content);
    // Compute canonical type once and pass it through the call chain
    const canonicalType = getCanonicalFileType(filepath, fileType);

    // Run summary generation and content embeddings in parallel for better throughput
    // These are independent LLM operations that don't depend on each other
    const [summaryResult, contentVector] = await Promise.all([
      this.generateSummaryAndEmbeddings(filepath, canonicalType, content),
      this.getContentEmbeddings(filepath, content),
    ]);
    const { summary, summaryError, summaryVector } = summaryResult;

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

    // Add to buffer and flush when batch size is reached
    this.recordBuffer.push(sourceFileRecord);
    if (this.recordBuffer.length >= DEFAULT_BATCH_SIZE) {
      await this.flushRecordBuffer();
    }
  }

  /**
   * Generates summary and embeddings for a file, handling errors gracefully.
   * Returns the summary, any error that occurred, and the summary vector.
   *
   * @param filepath The relative path to the file being summarized
   * @param canonicalFileType The canonical file type (e.g., "java", "javascript")
   * @param content The file content to summarize
   */
  private async generateSummaryAndEmbeddings(
    filepath: string,
    canonicalFileType: CanonicalFileType,
    content: string,
  ): Promise<{
    summary: PartialSourceSummaryType | undefined;
    summaryError: string | undefined;
    summaryVector: number[] | undefined;
  }> {
    let summary: PartialSourceSummaryType | undefined;
    let summaryError: string | undefined;
    let summaryVector: number[] | undefined;
    const summaryResult = await this.fileSummarizer.summarize(filepath, canonicalFileType, content);

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
