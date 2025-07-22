import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../llm/core/llm-router";
import path from "path";
import { appConfig } from "../../config/app.config";
import { readFile, findFilesRecursively } from "../../common/utils/fs-utils";
import { getFileExtension } from "../../common/utils/path-utils";
import { countLines } from "../../common/utils/text-utils";
import pLimit from "p-limit";
import { logErrorMsgAndDetail } from "../../common/utils/error-utils";
import { FileSummarizer } from "./file-summarizer";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { SourceRecordNoId } from "../../repositories/source/sources.model";
import { TOKENS } from "../../di/tokens";
import type { SourceSummaryType } from "../../schemas/source-summaries.schema";

/**
 * Loads each source file into a class to represent it.
 */
@injectable()
export default class CodebaseToDBLoader {
  // Private fields
  private hasLoggedAlreadyCapturedMessage = false;

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
  async loadIntoDB(
    projectName: string,
    srcDirPath: string,
    ignoreIfAlreadyCaptured: boolean,
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
      ignoreIfAlreadyCaptured,
    );
  }

  /**
   * Loops through a list of file paths, loads each file's content, and prints the content.
   */
  private async processAndStoreSourceFilesIntoDB(
    filepaths: string[],
    projectName: string,
    srcDirPath: string,
    ignoreIfAlreadyCaptured: boolean,
  ) {
    console.log(
      `Creating metadata for ${filepaths.length} files to the MongoDB database sources collection`,
    );

    if (!ignoreIfAlreadyCaptured) {
      console.log(
        `Deleting older version of the project's metadata files from the database to enable the metadata to be re-generated - change env var 'IGNORE_ALREADY_PROCESSED_FILES' to avoid re-processing of all files`,
      );
      await this.sourcesRepository.deleteSourcesByProject(projectName);
    }

    const limit = pLimit(appConfig.MAX_CONCURRENCY);
    const tasks = filepaths.map(async (filepath) => {
      return limit(async () => {
        try {
          await this.captureSrcFileMetadataToRepository(
            filepath,
            projectName,
            srcDirPath,
            ignoreIfAlreadyCaptured,
          );
        } catch (error: unknown) {
          logErrorMsgAndDetail(
            `Problem introspecting and processing source file: ${filepath}`,
            error,
          );
        }
      });
    });

    await Promise.all(tasks);
  }

  /**
   * Capture metadata for a file using the LLM.
   */
  private async captureSrcFileMetadataToRepository(
    fullFilepath: string,
    projectName: string,
    srcDirPath: string,
    ignoreIfAlreadyCaptured: boolean,
  ) {
    const type = getFileExtension(fullFilepath).toLowerCase();
    const filepath = fullFilepath.replace(`${srcDirPath}/`, "");
    if ((appConfig.BINARY_FILE_EXTENSION_IGNORE_LIST as readonly string[]).includes(type)) return; // Skip file if it has binary content

    if (
      ignoreIfAlreadyCaptured &&
      (await this.sourcesRepository.doesProjectSourceExist(projectName, filepath))
    ) {
      if (!this.hasLoggedAlreadyCapturedMessage) {
        console.log(
          `Not capturing some of the metadata files into the database because they've already been captured by a previous run - change env var 'IGNORE_ALREADY_PROCESSED_FILES' to force re-processing of all files`,
        );
        this.hasLoggedAlreadyCapturedMessage = true;
      }

      return;
    }

    const rawContent = await readFile(fullFilepath);
    const content = rawContent.trim();
    if (!content) return; // Skip empty files
    const filename = path.basename(filepath);
    const linesCount = countLines(content);
    const summaryResult = await this.fileSummarizer.getFileSummaryAsJSON(filepath, type, content);
    let summary: SourceSummaryType | undefined;
    let summaryError: string | undefined;
    let summaryVector: number[] | undefined;

    if (summaryResult.success) {
      summary = summaryResult.data;
      const summaryVectorResult = await this.getContentEmbeddings(
        filepath,
        JSON.stringify(summary),
      );
      summaryVector = summaryVectorResult ?? undefined;
    } else {
      summaryError = summaryResult.error;
    }

    const contentVectorResult = await this.getContentEmbeddings(filepath, content);
    const contentVector = contentVectorResult ?? undefined;
    const sourceFileRecord: SourceRecordNoId = {
      projectName: projectName,
      filename,
      filepath,
      type,
      linesCount,
      content,
      ...(summary !== undefined && { summary }),
      ...(summaryError !== undefined && { summaryError }),
      ...(summaryVector !== undefined && { summaryVector }),
      ...(contentVector !== undefined && { contentVector }),
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
