import "reflect-metadata";
import { injectable } from "tsyringe";
import { Task } from "../task.types";
import { APP_PROVIDER_REGISTRY } from "../../llm/provider-registry";
import { buildModelRegistry, getAllModelKeys } from "../../../common/llm/utils/model-registry";
import { LLMError } from "../../../common/llm/types/llm-errors.types";

/**
 * Represents a single row in the model table output.
 */
interface ModelTableRow {
  Provider: string;
  "Model Key": string;
}

/**
 * Task to list all available LLM models grouped by provider family.
 * This task reads from the static LLM_PROVIDER_REGISTRY and outputs
 * a formatted list of available models for both completions and embeddings.
 */
@injectable()
export class ListAvailableModelsTask implements Task {
  /**
   * Execute the task - validates model keys and lists all available models grouped by provider family.
   */
  async execute(): Promise<void> {
    if (!this.validateNoDuplicateModelKeys()) return;
    const { completionRows, embeddingRows } = this.buildModelRows();
    this.displayModelList(completionRows, embeddingRows);
    await Promise.resolve();
  }

  /**
   * Validate that no duplicate model keys exist across providers.
   * Uses the existing model-registry validation which throws on duplicates.
   * @returns true if valid (no duplicates), false if duplicates were found
   */
  private validateNoDuplicateModelKeys(): boolean {
    try {
      // buildModelRegistry() validates uniqueness and throws on duplicates
      const modelRegistry = buildModelRegistry(APP_PROVIDER_REGISTRY);
      getAllModelKeys(modelRegistry);
      return true;
    } catch (error) {
      if (error instanceof LLMError) {
        console.error("");
        console.error("========================================");
        console.error("ERROR: Model Key Validation Failed");
        console.error("========================================");
        console.error(error.message);
        console.error("");
        process.exitCode = 1;
        return false;
      }

      throw error;
    }
  }

  /**
   * Build model rows from the provider registry.
   * @returns Object containing arrays of completion and embedding model rows
   */
  private buildModelRows(): { completionRows: ModelTableRow[]; embeddingRows: ModelTableRow[] } {
    const completionRows: ModelTableRow[] = [];
    const embeddingRows: ModelTableRow[] = [];

    // Get manifests sorted by provider family name for consistent output
    const sortedManifests = [...APP_PROVIDER_REGISTRY.values()].toSorted((a, b) =>
      a.providerFamily.localeCompare(b.providerFamily),
    );

    for (const manifest of sortedManifests) {
      for (const model of manifest.models.completions) {
        completionRows.push({
          Provider: manifest.providerFamily,
          "Model Key": model.modelKey,
        });
      }

      for (const model of manifest.models.embeddings) {
        embeddingRows.push({
          Provider: manifest.providerFamily,
          "Model Key": model.modelKey,
        });
      }
    }

    return { completionRows, embeddingRows };
  }

  /**
   * Display the formatted model list to the console using tables.
   * @param completionRows - The completion model rows to display
   * @param embeddingRows - The embedding model rows to display
   */
  private displayModelList(completionRows: ModelTableRow[], embeddingRows: ModelTableRow[]): void {
    console.log("");
    console.log("========================================");
    console.log("LLM Completions Models Available (keys)");
    console.log("========================================");
    console.table(completionRows);

    console.log("");
    console.log("========================================");
    console.log("LLM Embeddings Models Available (keys)");
    console.log("========================================");
    console.table(embeddingRows);
    console.log("");
  }
}
