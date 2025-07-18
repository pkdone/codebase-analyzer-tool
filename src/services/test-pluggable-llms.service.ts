import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { appConfig } from "../config/app.config";
import { readFile } from "../common/utils/fs-utils";
import { LLMModelQuality, LLMOutputFormat } from "../llm/llm.types";
import LLMRouter from "../llm/core/llm-router";
import { Service } from "../lifecycle/service.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to test the LLM functionality.
 */
@injectable()
export class PluggableLLMsTestService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Execute the service - tests the LLM functionality.
   */
  async execute(): Promise<void> {
    await this.testPluggableLLMs();
  }

  /**
   * Tests the LLM functionality.
   */
  private async testPluggableLLMs(): Promise<void> {
    const prompt = await readFile(appConfig.SAMPLE_PROMPT_FILEPATH);
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
