import "reflect-metadata";
import { injectable } from "tsyringe";
import { Task } from "../task.types";
import { APP_PROVIDER_REGISTRY } from "../../llm/provider-registry";
import type { LLMProviderManifest } from "../../../common/llm/providers/llm-provider.types";
import { buildModelRegistry, getAllModelKeys } from "../../../common/llm/utils/model-registry";
import { LLMError } from "../../../common/llm/types/llm-errors.types";

/**
 * Represents a provider's models grouped by type.
 */
interface ProviderModelGroup {
  providerFamily: string;
  completionKeys: string[];
  embeddingKeys: string[];
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
    const groups = this.buildModelGroups();
    this.displayModelList(groups);
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
   * Build model groups from the provider registry.
   * @returns Array of provider model groups
   */
  private buildModelGroups(): ProviderModelGroup[] {
    const groups: ProviderModelGroup[] = [];

    for (const [, manifest] of APP_PROVIDER_REGISTRY) {
      const group = this.extractModelGroup(manifest);
      groups.push(group);
    }

    // Sort by provider family name for consistent output
    return groups.sort((a, b) => a.providerFamily.localeCompare(b.providerFamily));
  }

  /**
   * Extract model keys from a provider manifest.
   * @param manifest - The provider manifest to extract from
   * @returns A model group with completion and embedding keys
   */
  private extractModelGroup(manifest: LLMProviderManifest): ProviderModelGroup {
    return {
      providerFamily: manifest.providerFamily,
      completionKeys: manifest.models.completions.map((m) => m.modelKey),
      embeddingKeys: manifest.models.embeddings.map((m) => m.modelKey),
    };
  }

  /**
   * Display the formatted model list to the console.
   * @param groups - The provider model groups to display
   */
  private displayModelList(groups: ProviderModelGroup[]): void {
    // Calculate max provider name length for alignment
    const maxNameLength = Math.max(...groups.map((g) => g.providerFamily.length));

    // Display completions models
    console.log("");
    console.log("========================================");
    console.log("LLM Completions Models Available (keys)");
    console.log("========================================");

    for (const group of groups) {
      if (group.completionKeys.length > 0) {
        const paddedName = group.providerFamily.padEnd(maxNameLength);
        console.log(`  ${paddedName}:  ${group.completionKeys.join(", ")}`);
      }
    }

    // Display embeddings models
    console.log("");
    console.log("========================================");
    console.log("LLM Embeddings Models Available (keys)");
    console.log("========================================");

    for (const group of groups) {
      if (group.embeddingKeys.length > 0) {
        const paddedName = group.providerFamily.padEnd(maxNameLength);
        console.log(`  ${paddedName}:  ${group.embeddingKeys.join(", ")}`);
      }
    }

    console.log("");
  }
}
