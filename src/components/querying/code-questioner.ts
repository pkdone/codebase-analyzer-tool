import { injectable, inject } from "tsyringe";
import { fillPrompt } from "type-safe-prompt";
import LLMRouter from "../../llm/core/llm-router";
import { LLMOutputFormat } from "../../llm/llm.types";
import { appConfig } from "../../config/app.config";
import { convertArrayOfNumbersToArrayOfDoubles } from "../../common/mdb/mdb-utils";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { ProjectedSourceMetataContentAndSummary } from "../../repositories/source/sources.model";
import { TOKENS } from "../../di/tokens";

/**
 * Creates a prompt for querying the codebase with a specific question.
 * This prompt instructs the LLM to act as a programmer and answer questions about provided code.
 */
function createCodebaseQueryPrompt(question: string, codeContent: string): string {
  return fillPrompt(
    `Act as a senior developer. I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.

QUESTION:
{{question}}

CODE:
{{codeContent}}`,
    {
      question,
      codeContent,
    },
  );
}

/**
 * Provides ability to query the codebase, using Vector Search under the covers.
 */
@injectable()
export default class CodeQuestioner {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
  ) {}

  /**
   * Query the codebase, by first querying Vector Search and then using the results for RAG
   * interacton with the LLM.
   */
  async queryCodebaseWithQuestion(question: string, projectName: string) {
    const queryVector = await this.llmRouter.generateEmbeddings("Human question", question);
    if (queryVector === null || queryVector.length <= 0)
      return "No vector was generated for the question - unable to answer question";
    const queryVectorDoubles = convertArrayOfNumbersToArrayOfDoubles(queryVector); // HACK, see: https://jira.mongodb.org/browse/NODE-5714
    const bestMatchFiles = await this.sourcesRepository.vectorSearchProjectSourcesRawContent(
      projectName,
      appConfig.JAVA_FILE_TYPE,
      queryVectorDoubles,
      appConfig.VECTOR_SEARCH_NUM_CANDIDATES,
      appConfig.VECTOR_SEARCH_NUM_LIMIT,
    );

    if (bestMatchFiles.length <= 0) {
      console.log("Vector search on code using the question failed to return any results");
      return "Unable to answer question because no relevent code was found";
    }

    const codeBlocksAsText = this.mergeSourceCodeFilesContentIntoMarkdownText(bestMatchFiles);
    const resourceName = `Codebase query`;
    const prompt = createCodebaseQueryPrompt(question, codeBlocksAsText);
    const response = await this.llmRouter.executeCompletion(resourceName, prompt, {
      outputFormat: LLMOutputFormat.TEXT,
    });

    if (response) {
      const referencesText = bestMatchFiles.map((match) => ` * ${match.filepath}`).join("\n");
      return `${typeof response === "string" ? response : JSON.stringify(response)}\n\nReferences:\n${referencesText}`;
    } else {
      console.log(
        "Called the LLN with some data returned by Vector Search but the LLM returned an empty response",
      );
      return "Unable to answer question because no insight was generated";
    }
  }

  /**
   * Turns a list of content of source code file and their respective filetypes and produces one
   * piece of text using Markdown code-block syntax to delinante the content of each source file.
   */
  private mergeSourceCodeFilesContentIntoMarkdownText(
    sourceFileMetadataList: ProjectedSourceMetataContentAndSummary[],
  ) {
    const markdownParts: string[] = [];

    for (const fileMetadata of sourceFileMetadataList) {
      markdownParts.push(`\`\`\`${fileMetadata.type}\n${fileMetadata.content}\n\`\`\`\n\n`);
    }

    return markdownParts.join("");
  }
}
