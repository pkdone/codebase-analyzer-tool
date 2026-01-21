import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { readFile } from "../../../common/fs/file-operations";
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
 * Task to test the LLM functionality by cycling through all configured models.
 */
@injectable()
export class PluggableLLMsTestTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Execute the task - tests all models in the configured chains.
   */
  async execute(): Promise<void> {
    await this.runPluggableLLMs();
  }

  /**
   * Tests the LLM functionality by iterating through all configured models.
   */
  private async runPluggableLLMs(): Promise<void> {
    const prompt = await readFile(SAMPLE_PROMPT_FILEPATH);
    console.log("\n===== PROMPT =====");
    console.log(prompt);

    // Test all embedding models in the chain
    await this.testEmbeddingChain(prompt);

    // Test all completion models in the chain
    await this.testCompletionChain(prompt);
    console.log("\n");
  }

  /**
   * Test all embedding models in the configured chain.
   */
  private async testEmbeddingChain(prompt: string): Promise<void> {
    const embeddingChain = this.llmRouter.getEmbeddingChain();

    console.log("\n\n========================================");
    console.log(`EMBEDDINGS CHAIN (${embeddingChain.length} model(s))`);
    console.log("========================================");

    for (let i = 0; i < embeddingChain.length; i++) {
      const model = embeddingChain[i];
      const modelName = `${model.providerFamily}/${model.modelKey}`;

      console.log(`\n----- [${i + 1}/${embeddingChain.length}] ${modelName} -----`);

      const result = await this.llmRouter.generateEmbeddings("test-embeddings", prompt, i);

      if (result) {
        const preview = result
          .slice(0, 5)
          .map((n) => n.toFixed(6))
          .join(", ");
        console.log(`✓ Success: (${result.length} dimensions) [${preview}, ...]`);
      } else {
        console.log("✗ Error: Failed to generate embeddings");
      }
    }
  }

  /**
   * Test all completion models in the configured chain.
   */
  private async testCompletionChain(prompt: string): Promise<void> {
    const completionChain = this.llmRouter.getCompletionChain();

    console.log("\n\n========================================");
    console.log(`COMPLETIONS CHAIN (${completionChain.length} model(s))`);
    console.log("========================================");

    for (let i = 0; i < completionChain.length; i++) {
      const model = completionChain[i];
      const modelName = `${model.providerFamily}/${model.modelKey}`;

      console.log(`\n----- [${i + 1}/${completionChain.length}] ${modelName} -----`);

      const result = await this.llmRouter.executeCompletion(
        "test-completion",
        prompt,
        { outputFormat: LLMOutputFormat.TEXT },
        i,
      );

      if (isOk(result)) {
        // Show first 500 chars of the response
        const preview =
          result.value.length > 500 ? result.value.substring(0, 500) + "..." : result.value;
        console.log(`✓ Success:\n${preview}`);
      } else {
        console.log(`✗ Error: ${result.error.message}`);
      }
    }
  }
}
