import { z } from "zod";
import { zodToJsonSchemaForMDB } from "../../common/mdb/zod-to-mdb-json-schema";
import { nameDescSchema, fullAppSummarySchema } from "../../schemas/app-summary-categories.schema";
import { zBsonObjectId } from "../../common/mdb/zod-to-mdb-json-schema";

/**
 * Type for full app summary record
 */
export type AppSummaryRecord = z.infer<typeof fullAppSummarySchema>;

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type AppSummaryNameDescArray = z.infer<typeof nameDescSchema>[];

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type PartialAppSummaryRecord = Partial<z.infer<typeof fullAppSummarySchema>>;

/**
 * Type for MongoDB projected document with app description and LLM provider fields
 */
export type ProjectedAppSummaryDescAndLLMProvider = Pick<
  z.infer<typeof fullAppSummarySchema>,
  "appDescription" | "llmProvider"
>;

/**
 * Generate JSON schema for application summary records
 */
export function getJSONSchema() {
  return zodToJsonSchemaForMDB(fullAppSummarySchema.extend({ _id: zBsonObjectId }));
}
