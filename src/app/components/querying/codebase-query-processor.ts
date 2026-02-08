import LLMRouter from "../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../common/llm/types/llm-request.types";
import { isLLMOk } from "../../../common/llm/types/llm-result.types";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { VectorSearchResult } from "../../repositories/sources/sources.model";
import { queryingInputConfig } from "./querying-input.config";
import { formatFilesAsMarkdownCodeBlocks } from "../../../common/utils/markdown-formatter";
import { buildQueryPrompt } from "../../prompts/prompt-builders";

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
 * @param vectorSearchResults - Array of vector search results including content and type
 * @returns Formatted string with markdown code blocks for each file
 */
function formatSourcesForPrompt(vectorSearchResults: VectorSearchResult[]): string {
  return formatFilesAsMarkdownCodeBlocks(
    vectorSearchResults.map((file) => ({
      filepath: file.filepath,
      type: file.fileExtension,
      content: file.content,
    })),
  );
}

/**
 * Query the codebase, by first querying Vector Search and then using the results for RAG
 * interaction with the LLM.
 *
 * @param sourcesRepository The sources repository instance
 * @param llmRouter The LLM router instance
 * @param question The question to ask about the codebase
 * @param projectName The name of the project to query
 * @returns The answer to the question or an error message
 */
export async function queryCodebaseWithQuestion(
  sourcesRepository: SourcesRepository,
  llmRouter: LLMRouter,
  question: string,
  projectName: string,
): Promise<string> {
  const embeddingResult = await llmRouter.generateEmbeddings("Human question", question);
  if (embeddingResult === null || embeddingResult.embeddings.length <= 0)
    return "No vector was generated for the question - unable to answer question";

  const bestMatchFiles = await sourcesRepository.vectorSearchProjectSources(
    projectName,
    embeddingResult.embeddings,
    queryingInputConfig.VECTOR_SEARCH_NUM_CANDIDATES,
    queryingInputConfig.VECTOR_SEARCH_NUM_LIMIT,
  );

  if (bestMatchFiles.length <= 0) {
    console.log("Vector search on code using the question failed to return any results");
    return "Unable to answer question because no relevent code was found";
  }

  const codeBlocksAsText = formatSourcesForPrompt(bestMatchFiles);
  const resourceName = `Codebase query`;
  const { prompt } = buildQueryPrompt(question, codeBlocksAsText);
  const result = await llmRouter.executeCompletion(resourceName, prompt, {
    outputFormat: LLMOutputFormat.TEXT,
  });

  if (isLLMOk(result)) {
    const referencesText = bestMatchFiles.map((match) => ` * ${match.filepath}`).join("\n");
    return `${result.value}\n\nReferences:\n${referencesText}`;
  } else {
    console.log(
      `Called the LLM with data from Vector Search but completion failed: ${result.error.message}`,
    );
    return "Unable to answer question because no insight was generated";
  }
}
