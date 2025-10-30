import { CanonicalFileType, PromptDefinition } from "../../prompt.types";
import { sourceConfigMap } from "./sources.config";
import { sourceSummarySchema } from "../../../schemas/sources.schema";

/**
 * Dynamically generates prompt metadata from the centralized configuration
 */
function generatePromptMetadata(): Record<CanonicalFileType, PromptDefinition> {
  const result: Record<string, PromptDefinition> = {};

  for (const [fileType, config] of Object.entries(sourceConfigMap)) {
    // Dynamically pick fields from the master schema
    const schemaFields = config.schemaFields.reduce<Record<string, true>>((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});

    result[fileType] = {
      contentDesc: config.contentDesc,
      hasComplexSchema: config.hasComplexSchema,
      responseSchema: sourceSummarySchema.pick(
        schemaFields as Parameters<typeof sourceSummarySchema.pick>[0],
      ),
      instructions: config.instructions,
      template: config.template,
    };
  }

  return result as Record<CanonicalFileType, PromptDefinition>;
}

/**
 * Data-driven mapping of prompt types to their templates and schemas
 */
export const fileTypePromptMetadata = generatePromptMetadata();
