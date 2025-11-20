import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../llm/core/llm-router";
import path from "path";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { readFile } from "../../common/fs/file-operations";
import { findFilesRecursively, sortFilesBySize } from "../../common/fs/directory-operations";
import { getFileExtension } from "../../common/fs/path-utils";
import { countLines } from "../../common/utils/text-utils";
import { processItemsConcurrently } from "../../common/utils/async-utils";
import { FileSummarizer } from "./file-summarizer";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { SourceRecord } from "../../repositories/sources/sources.model";
import { repositoryTokens, llmTokens, captureTokens } from "../../di/tokens";
import type { SourceSummaryType } from "./file-summarizer";

/**
 * Loads each source file into a class to represent it.
 */
@injectable()
export default class CodebaseToDBLoader {
  /**
   * Constructor.
   */
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(captureTokens.FileSummarizer) private readonly fileSummarizer: FileSummarizer,
  ) {}

  /**
   * Generate the set of representations of source files including each one's content and metadata.
   */
  async captureCodebaseToDatabase(
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyCaptured: boolean,
  ): Promise<void> {
    const srcFilepaths = await findFilesRecursively(
      srcDirPath,
      fileProcessingConfig.FOLDER_IGNORE_LIST,
      fileProcessingConfig.FILENAME_PREFIX_IGNORE,
    );
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
    filepaths: string[],
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyCaptured: boolean,
  ) {
    console.log(
      `Creating metadata for ${filepaths.length} files to go into the MongoDB database sources collection`,
    );
    let existingFiles = new Set<string>();

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

    await processItemsConcurrently(
      filepaths,
      async (filepath) => {
        await this.processAndStoreSourceFile(
          filepath,
          projectName,
          srcDirPath,
          skipIfAlreadyCaptured,
          existingFiles,
        );
      },
      fileProcessingConfig.MAX_CONCURRENCY,
      "file",
    );
  }

  /**
   * Processes a source file by reading content, generating summaries and embeddings, then stores the complete record.
   */
  private async processAndStoreSourceFile(
    fullFilepath: string,
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyCaptured: boolean,
    existingFiles: Set<string>,
  ) {
    const type = getFileExtension(fullFilepath).toLowerCase();

    if (
      (fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST as readonly string[]).includes(type)
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
      type,
      content,
    );
    const contentVector = await this.getContentEmbeddings(filepath, content);
    const sourceFileRecord = this.buildSourceRecord({
      projectName,
      filename,
      filepath,
      type,
      linesCount,
      content,
      summary,
      summaryError,
      summaryVector,
      contentVector: contentVector ?? undefined,
    });
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
    summary: SourceSummaryType | undefined;
    summaryError: string | undefined;
    summaryVector: number[] | undefined;
  }> {
    let summary: SourceSummaryType | undefined;
    let summaryError: string | undefined;
    let summaryVector: number[] | undefined;

    try {
      summary = await this.fileSummarizer.summarizeFile(filepath, type, content);
      const summaryVectorResult = await this.getContentEmbeddings(
        filepath,
        JSON.stringify(summary),
      );
      summaryVector = summaryVectorResult ?? undefined;
    } catch (error: unknown) {
      summaryError = `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { summary, summaryError, summaryVector };
  }

  /**
   * Builds a SourceRecord from the provided parameters.
   * Only includes optional fields (summary, vectors, errors) if they have values.
   */
  private buildSourceRecord(params: {
    projectName: string;
    filename: string;
    filepath: string;
    type: string;
    linesCount: number;
    content: string;
    summary: SourceSummaryType | undefined;
    summaryError: string | undefined;
    summaryVector: number[] | undefined;
    contentVector: number[] | undefined;
  }): SourceRecord {
    const {
      projectName,
      filename,
      filepath,
      type,
      linesCount,
      content,
      summary,
      summaryError,
      summaryVector,
      contentVector,
    } = params;
    return {
      projectName,
      filename,
      filepath,
      type,
      linesCount,
      content,
      ...(summary && { summary }),
      ...(summaryError && { summaryError }),
      ...(summaryVector && { summaryVector }),
      ...(contentVector && { contentVector }),
    };
  }

  /**
   * Get the embeddings vector for a piece of content, limiting the content's size if it is likely
   * to blow the LLM context window size.
   */
  private async getContentEmbeddings(filepath: string, content: string) {
    return await this.llmRouter.generateEmbeddings(filepath, content);
  }
}
