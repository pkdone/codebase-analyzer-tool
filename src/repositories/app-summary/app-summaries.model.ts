import { z } from "zod";
import { zodToJsonSchemaForMDB, zBsonObjectId } from "../../common/mdb/zod-to-mdb-json-schema";
import {
  nameDescSchema,
  appDescriptionSchema,
  boundedContextsSchema,
  entitiesSchema,
  businessProcessesSchema,
  technologiesSchema,
  aggregatesSchema,
  repositoriesSchema,
  potentialMicroservicesSchema,
} from "../../schemas/app-summary-categories.schema";

/**
 * Schema for arrays of name-description pairs used in app summaries
 */
export const appSummaryNameDescArraySchema = z.array(nameDescSchema);

/**
 * Zod schema for application summary records in the database
 */
export const appSummaryRecordSchema = z
  .object({
    _id: zBsonObjectId,
    projectName: z.string(),
    llmProvider: z.string(),
    appDescription: appDescriptionSchema.shape.appDescription.optional(),
    businessProcesses: businessProcessesSchema.shape.businessProcesses.optional(),
    technologies: technologiesSchema.shape.technologies.optional(),
    boundedContexts: boundedContextsSchema.shape.boundedContexts.optional(),
    aggregates: aggregatesSchema.shape.aggregates.optional(),
    entities: entitiesSchema.shape.entities.optional(),
    repositories: repositoriesSchema.shape.repositories.optional(),
    potentialMicroservices: potentialMicroservicesSchema.shape.potentialMicroservices.optional(),
  })
  .passthrough();

/**
 * Schema for MongoDB projected document with app description and LLM provider fields
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.
 */
export const projectedAppSummaryDescAndLLMProviderSchema = appSummaryRecordSchema.pick({
  appDescription: true,
  llmProvider: true,
});

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type AppSummaryNameDescArray = z.infer<typeof appSummaryNameDescArraySchema>;

/**
 * Interface representing an application summary record in the database
 * (making it optional for _id)
 */
type AppSummaryRecordTmp = z.infer<typeof appSummaryRecordSchema>;
export type AppSummaryRecord = Omit<AppSummaryRecordTmp, "_id"> &
  Partial<Pick<AppSummaryRecordTmp, "_id">>;

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type PartialAppSummaryRecord = Partial<AppSummaryRecord>;

/**
 * Type for MongoDB projected document with app description and LLM provider fields
 */
export type ProjectedAppSummaryDescAndLLMProvider = z.infer<
  typeof projectedAppSummaryDescAndLLMProviderSchema
>;

/**
 * Generate JSON schema for application summary records
 */
export function getJSONSchema() {
  return zodToJsonSchemaForMDB(appSummaryRecordSchema);
}
