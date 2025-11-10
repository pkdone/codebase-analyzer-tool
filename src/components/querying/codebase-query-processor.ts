import { injectable, inject } from "tsyringe";
import { fillPrompt } from "type-safe-prompt";
import LLMRouter from "../../llm/core/llm-router";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { ProjectedSourceMetataContentAndSummary } from "../../repositories/sources/sources.model";
import { repositoryTokens } from "../../di/repositories.tokens";
import { llmTokens } from "../../llm/core/llm.tokens";
import { inputConfig } from "./config/input.config";

/**
 * Provides ability to query the codebase, using Vector Search under the covers.
 */
@injectable()
export default class CodebaseQueryProcessor {
  /**
   * Constructor.
   */
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
  ) {}

  /**
   * Query the codebase, by first querying Vector Search and then using the results for RAG
   * interacton with the LLM.
   */
  async queryCodebaseWithQuestion(question: string, projectName: string) {
    const queryVector = await this.llmRouter.generateEmbeddings("Human question", question);
    if (queryVector === null || queryVector.length <= 0)
      return "No vector was generated for the question - unable to answer question";

    const bestMatchFiles = await this.sourcesRepository.vectorSearchProjectSourcesRawContent(
      projectName,
      queryVector,
      inputConfig.VECTOR_SEARCH_NUM_CANDIDATES,
      inputConfig.VECTOR_SEARCH_NUM_LIMIT,
    );

    if (bestMatchFiles.length <= 0) {
      console.log("Vector search on code using the question failed to return any results");
      return "Unable to answer question because no relevent code was found";
    }

    const codeBlocksAsText = this.formatSourcesForPrompt(bestMatchFiles);
    const resourceName = `Codebase query`;
    const prompt = this.createCodebaseQueryPrompt(question, codeBlocksAsText);
    const response = await this.llmRouter.executeCompletion<string>(resourceName, prompt, {
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
   * Creates a prompt for querying the codebase with a specific question.
   * This prompt instructs the LLM to act as a programmer and answer questions about provided code.
   *
   * @param question - The developer's question about the code
   * @param codeContent - The formatted code content to use as context
   * @returns The filled prompt string
   */
  private createCodebaseQueryPrompt(question: string, codeContent: string): string {
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
   * Formats source file metadata into markdown code blocks for LLM prompts.
   *
   * This utility converts an array of source files (with their content and file types)
   * into a single formatted string using markdown code block syntax. Each file's content
   * is wrapped in a code block with the appropriate language identifier.
   *
   * This is commonly used for:
   * - Preparing code for RAG (Retrieval-Augmented Generation) workflows
   * - Formatting vector search results for LLM consumption
   * - Creating structured prompts from multiple source files
   *
   * @param sourceFileMetadataList - Array of source file metadata including content and type
   * @returns Formatted string with markdown code blocks for each file
   */
  private formatSourcesForPrompt(
    sourceFileMetadataList: ProjectedSourceMetataContentAndSummary[],
  ): string {
    return sourceFileMetadataList
      .map((fileMetadata) => `\`\`\`${fileMetadata.type}\n${fileMetadata.content}\n\`\`\`\n\n`)
      .join("");
  }
}
