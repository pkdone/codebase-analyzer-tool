import { z } from "zod";
import { nameDescSchema, appSummarySchema } from "../../schemas/app-summaries.schema";
import {
  zBsonObjectId,
  zodToJsonSchemaForMDB,
} from "../../../common/schema/zod-to-mdb-json-schema";

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
 * Type representing fields that can be requested from the app summaries repository.
 * Excludes '_id' which is always included in query results.
 * This type ensures compile-time safety when specifying fields to fetch.
 */
export type RequestableAppSummaryField = Exclude<keyof AppSummaryRecordWithId, "_id">;
/**
 * Generate JSON schema for application summary records
 */
export function getJSONSchema() {
  return zodToJsonSchemaForMDB(appSummarySchema.extend({ _id: zBsonObjectId }));
}
