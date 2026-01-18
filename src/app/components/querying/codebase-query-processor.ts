import { fillPrompt } from "type-safe-prompt";
import LLMRouter from "../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../common/llm/types/llm.types";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { ProjectedSourceMetadataContentAndSummary } from "../../repositories/sources/sources.model";
import { queryingInputConfig } from "./querying-input.config";
import { formatFilesAsMarkdownCodeBlocks } from "../../../common/utils/markdown-formatter";
import { isOk } from "../../../common/types/result.types";

/**
 * Template for querying the codebase with a specific question.
 * Used for RAG (Retrieval-Augmented Generation) workflows where vector search results
 * are provided as context for answering developer questions about the codebase.
 */
const CODEBASE_QUERY_TEMPLATE = `Act as a senior developer analyzing the code in an existing application. I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.

QUESTION:
{{question}}

CODE:
{{content}}`;

/**
 * Creates a prompt for querying the codebase with a specific question.
 * This prompt instructs the LLM to act as a programmer and answer questions about provided code.
 *
 * @param question - The developer's question about the code
 * @param codeContent - The formatted code content to use as context
 * @returns The filled prompt string
 */
function createCodebaseQueryPrompt(question: string, codeContent: string): string {
  return fillPrompt(CODEBASE_QUERY_TEMPLATE, { question, content: codeContent });
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
function formatSourcesForPrompt(
  sourceFileMetadataList: ProjectedSourceMetadataContentAndSummary[],
): string {
  return formatFilesAsMarkdownCodeBlocks(
    sourceFileMetadataList.map((file) => ({
      filepath: file.filepath,
      type: file.fileType,
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
  const queryVector = await llmRouter.generateEmbeddings("Human question", question);
  if (queryVector === null || queryVector.length <= 0)
    return "No vector was generated for the question - unable to answer question";

  const bestMatchFiles = await sourcesRepository.vectorSearchProjectSources(
    projectName,
    queryVector,
    queryingInputConfig.VECTOR_SEARCH_NUM_CANDIDATES,
    queryingInputConfig.VECTOR_SEARCH_NUM_LIMIT,
  );

  if (bestMatchFiles.length <= 0) {
    console.log("Vector search on code using the question failed to return any results");
    return "Unable to answer question because no relevent code was found";
  }

  const codeBlocksAsText = formatSourcesForPrompt(bestMatchFiles);
  const resourceName = `Codebase query`;
  const prompt = createCodebaseQueryPrompt(question, codeBlocksAsText);
  const result = await llmRouter.executeCompletion(resourceName, prompt, {
    outputFormat: LLMOutputFormat.TEXT,
  });

  if (isOk(result)) {
    const referencesText = bestMatchFiles.map((match) => ` * ${match.filepath}`).join("\n");
    return `${result.value}\n\nReferences:\n${referencesText}`;
  } else {
    console.log(
      `Called the LLM with data from Vector Search but completion failed: ${result.error.message}`,
    );
    return "Unable to answer question because no insight was generated";
  }
}
