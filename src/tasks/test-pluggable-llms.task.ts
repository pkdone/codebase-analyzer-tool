import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { pathsConfig } from "../config/paths.config";
import { readFile } from "../common/utils/file-operations";
import { LLMModelQuality, LLMOutputFormat } from "../llm/types/llm.types";
import LLMRouter from "../llm/core/llm-router";
import { Task } from "./task.types";
import { TOKENS } from "../di/tokens";

/**
 * Task to test the LLM functionality.
 */
@injectable()
export class PluggableLLMsTestTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Execute the task - tests the LLM functionality.
   */
  async execute(): Promise<void> {
    await this.runPluggableLLMs();
  }

  /**
   * Tests the LLM functionality.
   */
  private async runPluggableLLMs(): Promise<void> {
    const prompt = await readFile(pathsConfig.SAMPLE_PROMPT_FILEPATH);
    console.log("\n---PROMPT---");
    console.log(prompt);

    // Test embeddings generation
    console.log("\n\n---EMBEDDINGS---");
    const embeddingsResult = await this.llmRouter.generateEmbeddings(
      "hard-coded-test-input",
      prompt,
    );
    console.log(embeddingsResult ?? "<empty>");

    // Test primary LLM completion
    console.log("\n\n---COMPLETION (Primary LLM)---");
    const completionPrimaryResult = await this.llmRouter.executeCompletion(
      "hard-coded-test-input",
      prompt,
      {
        outputFormat: LLMOutputFormat.TEXT,
      },
      LLMModelQuality.PRIMARY,
    );
    console.log(completionPrimaryResult ?? "<empty>");

    // Test secondary LLM completion
    console.log("\n\n---COMPLETION (Secondary LLM)---");
    const completionSecondaryResult = await this.llmRouter.executeCompletion(
      "hard-coded-test-input",
      prompt,
      {
        outputFormat: LLMOutputFormat.TEXT,
      },
      LLMModelQuality.SECONDARY,
    );
    console.log(completionSecondaryResult ?? "<empty>");
  }
}
