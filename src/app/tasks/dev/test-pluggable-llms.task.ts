import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { readFile } from "../../../common/fs/file-operations";
import { LLMModelTier } from "../../../common/llm/types/llm-model.types";
import { LLMOutputFormat } from "../../../common/llm/types/llm-request.types";
import LLMRouter from "../../../common/llm/llm-router";
import { Task } from "../task.types";
import { llmTokens } from "../../di/tokens";
import { isOk } from "../../../common/types/result.types";

/**
 * File path to the sample prompt file
 */
const SAMPLE_PROMPT_FILEPATH = "./input/sample.prompt";

/**
 * Task to test the LLM functionality.
 */
@injectable()
export class PluggableLLMsTestTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

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
    const prompt = await readFile(SAMPLE_PROMPT_FILEPATH);
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
      LLMModelTier.PRIMARY,
    );
    console.log(isOk(completionPrimaryResult) ? completionPrimaryResult.value : "<error>");

    // Test fallback LLM completion
    console.log("\n\n---COMPLETION (Secondary LLM)---");
    const completionSecondaryResult = await this.llmRouter.executeCompletion(
      "hard-coded-test-input",
      prompt,
      {
        outputFormat: LLMOutputFormat.TEXT,
      },
      LLMModelTier.SECONDARY,
    );
    console.log(isOk(completionSecondaryResult) ? completionSecondaryResult.value : "<error>");
  }
}
