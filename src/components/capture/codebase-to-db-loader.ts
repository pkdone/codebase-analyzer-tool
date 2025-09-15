import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../llm/core/llm-router";
import path from "path";
import { appConfig } from "../../config/app.config";
import { readFile } from "../../common/utils/file-operations";
import { findFilesRecursively } from "../../common/utils/directory-operations";
import { getFileExtension } from "../../common/utils/path-utils";
import { countLines } from "../../common/utils/text-utils";
import pLimit from "p-limit";
import { logErrorMsgAndDetail } from "../../common/utils/error-utils";
import { FileSummarizer } from "./file-summarizer";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { SourceRecord } from "../../repositories/source/sources.model";
import { TOKENS } from "../../di/tokens";
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
      appConfig.FOLDER_IGNORE_LIST,
      appConfig.FILENAME_PREFIX_IGNORE,
      true,
    );
    await this.processAndStoreSourceFilesIntoDB(
      srcFilepaths,
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
      `Creating metadata for ${filepaths.length} files to the MongoDB database sources collection`,
    );

    if (skipIfAlreadyCaptured) {
      // Check if any files already exist for this project and log message once if they do
      const existingFilesCount = await this.sourcesRepository.getProjectFilesCount(projectName);

      if (existingFilesCount > 0) {
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

    const limit = pLimit(appConfig.MAX_CONCURRENCY);
    const tasks = filepaths.map(async (filepath) => {
      return limit(async () => {
        try {
          await this.processAndStoreSourceFile(
            filepath,
            projectName,
            srcDirPath,
            skipIfAlreadyCaptured,
          );
        } catch (error: unknown) {
          logErrorMsgAndDetail(
            `Problem introspecting and processing source file: ${filepath}`,
            error,
          );
          throw error; // Re-throw to be caught by Promise.allSettled
        }
      });
    });
    const results = await Promise.allSettled(tasks);
    const { successCount, failureCount } = results.reduce(
      (acc, result, index) => {
        if (result.status === "fulfilled") {
          acc.successCount++;
        } else {
          acc.failureCount++;
          const error: unknown = result.reason;
          logErrorMsgAndDetail(`Failed to process file: ${filepaths[index]}`, error);
        }
        return acc;
      },
      { successCount: 0, failureCount: 0 },
    );
    
    const totalFiles = filepaths.length;
    console.log(`Processed ${totalFiles} files. Succeeded: ${successCount}, Failed: ${failureCount}`);
    
    if (failureCount > 0) {
      console.warn(`Warning: ${failureCount} files failed to process. Check error logs above for details.`);
    } else {
      console.log(`All ${totalFiles} files processed successfully.`);
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
  ) {
    const type = getFileExtension(fullFilepath).toLowerCase();
    const filepath = path.relative(srcDirPath, fullFilepath);
    if ((appConfig.BINARY_FILE_EXTENSION_IGNORE_LIST as readonly string[]).includes(type)) return; // Skip file if it has binary content

    if (
      skipIfAlreadyCaptured &&
      (await this.sourcesRepository.doesProjectSourceExist(projectName, filepath))
    ) {
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
      summary = await this.fileSummarizer.getFileSummaryAsJSON(filepath, type, content);
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
