import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../../common/llm/llm-router";
import type { EmbeddingResult } from "../../../common/llm/llm-router";
import path from "path";
import { type FileProcessingRulesType } from "../../config/file-handling";
import { getCanonicalFileType } from "./utils";
import type { CanonicalFileType } from "../../schemas/canonical-file-types";
import { readFile } from "../../../common/fs/file-operations";
import { findFilesSortedBySize } from "../../../common/fs/directory-operations";
import { getFileExtension } from "../../../common/fs/path-utils";
import { countLines } from "../../../common/utils/text-utils";
import { logErr } from "../../../common/utils/logging";
import { FileSummarizerService, type PartialSourceSummaryType } from "./file-summarizer.service";
import { BufferedSourcesWriter } from "./buffered-sources-writer";
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
 * Orchestrates the capture of source files from a codebase into the database.
 * Coordinates file discovery, content reading, LLM-based summarization, embedding generation,
 * and persistence of source records.
 *
 * This is the main entry point for the codebase capture process. It delegates specific
 * responsibilities to specialized services while managing the overall workflow.
 */
@injectable()
export default class CodebaseCaptureOrchestrator {
  /**
   * Constructor with dependency injection.
   * @param sourcesRepository - Repository for storing source file data
   * @param llmRouter - Router for LLM operations (embeddings, summarization)
   * @param fileSummarizer - Service for generating file summaries
   * @param fileProcessingConfig - Configuration for file processing rules
   * @param llmConcurrencyService - Service for managing LLM call concurrency
   * @param bufferedWriter - Buffered writer for batching database inserts
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
    @inject(captureTokens.BufferedSourcesWriter)
    private readonly bufferedWriter: BufferedSourcesWriter,
  ) {}

  /**
   * Captures source files from a codebase directory, generating summaries and embeddings,
   * then persisting them to the database.
   *
   * @param projectName - The name of the project being captured
   * @param srcDirPath - The root directory path containing source files
   * @param skipIfAlreadyIngested - Whether to skip files already in the database
   */
  async captureCodebase(
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyIngested: boolean,
  ): Promise<void> {
    // Use findFilesSortedBySize for efficient file discovery with sizes in a single pass
    // Files are pre-sorted by size (largest first) for better work distribution
    const filesWithSize = await findFilesSortedBySize(srcDirPath, {
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

    // Reset the buffered writer before starting
    this.bufferedWriter.reset();

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
    await this.bufferedWriter.flush();

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
    skipIfAlreadyIngested: boolean,
    existingFiles: ReadonlySet<string>,
  ) {
    const fileExtension = getFileExtension(fullFilepath).toLowerCase();

    if (
      (this.fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST as readonly string[]).includes(
        fileExtension,
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
    const canonicalType = getCanonicalFileType(filepath, fileExtension);

    // Run summary generation and content embeddings in parallel for better throughput
    // These are independent LLM operations that don't depend on each other
    const [summaryResult, contentVectorResult] = await Promise.all([
      this.generateSummaryAndEmbeddings(filepath, canonicalType, content),
      this.generateContentEmbeddings(filepath, content),
    ]);
    const { summary, summaryError, summaryVector, completionModelKey } = summaryResult;

    // Extract embedding model info from content vector result (if available)
    // Use modelKey (not full modelId) for storage - e.g., "bedrock-claude-opus-4.6" not "BedrockClaude/bedrock-claude-opus-4.6"
    const embeddingModelKey = contentVectorResult?.meta.modelKey;
    const contentVector = contentVectorResult?.embeddings;

    const sourceFileRecord: SourceRecord = {
      projectName,
      filename,
      filepath,
      fileExtension,
      canonicalType,
      linesCount,
      content,
      ...(summary && { summary }),
      ...(summaryError && { summaryError }),
      ...(summaryVector && { summaryVector }),
      ...(contentVector && { contentVector }),
      llmCapture: {
        completionModel: completionModelKey,
        embeddingModel: embeddingModelKey,
        capturedAt: new Date(),
      },
    };

    // Queue to buffered writer (automatically flushes when batch size is reached)
    await this.bufferedWriter.queueRecord(sourceFileRecord);
  }

  /**
   * Generates summary and embeddings for a file, handling errors gracefully.
   * Returns the summary, any error that occurred, the summary vector, and the model used.
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
    completionModelKey: string | undefined;
  }> {
    let summary: PartialSourceSummaryType | undefined;
    let summaryError: string | undefined;
    let summaryVector: number[] | undefined;
    let completionModelKey: string | undefined;
    const summaryResult = await this.fileSummarizer.summarize(filepath, canonicalFileType, content);

    if (isOk(summaryResult)) {
      summary = summaryResult.value.summary;
      completionModelKey = summaryResult.value.modelKey;
      const summaryVectorResult = await this.generateContentEmbeddings(
        filepath,
        JSON.stringify(summary),
      );
      summaryVector = summaryVectorResult?.embeddings;
    } else {
      summaryError = `Failed to generate summary: ${summaryResult.error.message}`;
    }

    return { summary, summaryError, summaryVector, completionModelKey };
  }

  /**
   * Generates embeddings for content via the LLM embedding model.
   * Returns the embedding result with vector and model metadata, or null if generation fails.
   *
   * @param filepath - The filepath for context in logging and error messages
   * @param content - The content to generate embeddings for
   */
  private async generateContentEmbeddings(
    filepath: string,
    content: string,
  ): Promise<EmbeddingResult | null> {
    return await this.llmRouter.generateEmbeddings(filepath, content);
  }
}
