/**
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create schemas inline using sourceRecordSchema.pick() or z.object() since MongoDB projections
 * revert to returning field types of 'unknown'.
 */
import { z } from "zod";
import { nameDescSchema, appSummarySchema } from "../../schemas/app-summaries.schema";
import { zBsonObjectId, zodToJsonSchemaForMDB } from "../../common/mongodb/zod-to-mdb-json-schema";

/**
 * Type for app summary record without _id
 */
export type AppSummaryRecord = z.infer<typeof appSummarySchema> & {
  _id?: z.infer<typeof zBsonObjectId>;
};

/**
 * Type for app summary record without _id
 */
export type AppSummaryRecordWithId = z.infer<typeof appSummarySchema> & {
  _id: z.infer<typeof zBsonObjectId>;
};

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type AppSummaryNameDescArray = z.infer<typeof nameDescSchema>[];

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type PartialAppSummaryRecord = Partial<z.infer<typeof appSummarySchema>>;
/**
 * Generate JSON schema for application summary records
 */
export function getJSONSchema() {
  return zodToJsonSchemaForMDB(appSummarySchema.extend({ _id: zBsonObjectId }));
}
