import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../llm/core/llm-router";
import path from "path";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { readFile } from "../../common/fs/file-operations";
import { findFilesRecursively, sortFilesBySize } from "../../common/fs/directory-operations";
import { getFileExtension } from "../../common/fs/path-utils";
import { countLines } from "../../common/utils/text-analysis";
import { processItemsConcurrently } from "../../common/utils/async-utils";
import { FileSummarizer } from "./file-summarizer";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { SourceRecord } from "../../repositories/source/sources.model";
import { TOKENS } from "../../tokens";
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
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.FileSummarizer) private readonly fileSummarizer: FileSummarizer,
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
    await this.processAndStoreSourceFilesIntoDB(
      sortedFilepaths,
      projectName,
      srcDirPath,
      skipIfAlreadyCaptured,
    );
  }

  /**
   * Loops through a list of file paths, loads each file's content, and prints the content.
   */
  private async processAndStoreSourceFilesIntoDB(
    filepaths: string[],
    projectName: string,
    srcDirPath: string,
    skipIfAlreadyCaptured: boolean,
  ) {
    console.log(
      `Creating metadata for ${filepaths.length} files to go into the MongoDB database sources collection`,
    );

    // Batch load existing files once to avoid N+1 query problem
    const existingFiles = new Set<string>();
    if (skipIfAlreadyCaptured) {
      const existingFilePaths = await this.sourcesRepository.getProjectFilesPaths(projectName);
      existingFilePaths.forEach((filepath) => existingFiles.add(filepath));

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
    const filepath = path.relative(srcDirPath, fullFilepath);
    if (
      (fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST as readonly string[]).includes(type)
    )
      return; // Skip file if it has binary content

    if (skipIfAlreadyCaptured && existingFiles.has(filepath)) {
      return;
    }

    const rawContent = await readFile(fullFilepath);
    const content = rawContent.trim();
    if (!content) return; // Skip empty files
    const filename = path.basename(filepath);
    const linesCount = countLines(content);
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

    const contentVectorResult = await this.getContentEmbeddings(filepath, content);
    const contentVector = contentVectorResult ?? undefined;
    const sourceFileRecord: SourceRecord = {
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
    await this.sourcesRepository.insertSource(sourceFileRecord);
  }

  /**
   * Get the embeddings vector for a piece of content, limiting the content's size if it is likely
   * to blow the LLM context window size.
   */
  private async getContentEmbeddings(filepath: string, content: string) {
    return await this.llmRouter.generateEmbeddings(filepath, content);
  }
}
