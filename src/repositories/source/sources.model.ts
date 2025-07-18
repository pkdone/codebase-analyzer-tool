import { z } from "zod";
import { zodToJsonSchemaForMDB, zBsonObjectId } from "../../common/mdb/zod-to-mdb-json-schema";
import { sourceFileSummarySchema } from "../../schemas/source-summaries.schema";
// Note, `.passthrough()` sets "additionalProperties": true

/**
 * Schema for source file record in the database
 */
export const sourceRecordSchema = z
  .object({
    _id: zBsonObjectId,
    projectName: z.string(),
    filename: z.string(),
    filepath: z.string(),
    type: z.string(),
    linesCount: z.number(),
    summary: sourceFileSummarySchema.optional(),
    summaryError: z.string().optional(),
    summaryVector: z.array(z.number()).optional(),
    content: z.string(),
    contentVector: z.array(z.number()).optional(),
  })
  .passthrough();

/**
 * Interface representing a source file record in the database
 * (making it optional for _id)
 */
export type SourceRecord = Omit<z.infer<typeof sourceRecordSchema>, "_id"> &
  Partial<Pick<z.infer<typeof sourceRecordSchema>, "_id">>;

/**
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create schemas inline using sourceRecordSchema.pick() or z.object() since MongoDB projections
 * revert to returning field types of 'unknown'.
 */

/**
 * Type for MongoDB projected document with just filepath
 */
export type ProjectedFilePath = z.infer<
  ReturnType<typeof sourceRecordSchema.pick<{ filepath: true }>>
>;

/**
 * Type for MongoDB projected document with filepath and summary fields
 */
export type ProjectedSourceFilePathAndSummary = z.infer<
  ReturnType<typeof sourceRecordSchema.pick<{ filepath: true; summary: true }>>
>;

/**
 * Type for MongoDB projected document with metadata, content and summary for vector search
 */
export type ProjectedSourceMetataContentAndSummary = z.infer<
  ReturnType<
    typeof sourceRecordSchema.pick<{
      projectName: true;
      type: true;
      filepath: true;
      content: true;
      summary: true;
    }>
  >
>;

/**
 * Schema for MongoDB projected document with filepath and specific summary fields
 * This schema ensures type safety for source summaries projection
 * Reflects the actual projection structure where nested fields are selected
 */
export const projectedSourceSummaryFieldsSchema = z.object({
  filepath: z.string(),
  summary: z
    .object({
      classpath: z.string().optional(),
      purpose: z.string().optional(),
      implementation: z.string().optional(),
    })
    .optional(),
});

/**
 * Type for MongoDB projected document with filepath and partial summary fields
 * Uses precise Zod schema instead of interface with optional fields
 */
export type ProjectedSourceSummaryFields = z.infer<typeof projectedSourceSummaryFieldsSchema>;

/**
 * Schema for MongoDB projected document with database integration fields
 * This schema ensures type safety for database integration projection
 * Reflects the actual projection structure where nested fields are selected
 */
export const projectedDatabaseIntegrationFieldsSchema = z.object({
  filepath: z.string(),
  summary: z
    .object({
      classpath: z.string().optional(),
      databaseIntegration: z
        .object({
          mechanism: z.string().optional(),
          description: z.string().optional(),
          codeExample: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Type for MongoDB projected document with database integration fields
 * Uses precise Zod schema instead of interface with optional fields
 */
export type ProjectedDatabaseIntegrationFields = z.infer<
  typeof projectedDatabaseIntegrationFieldsSchema
>;

/**
 * Interface representing
 */
export interface ProjectedFileTypesCountAndLines {
  readonly fileType: string;
  readonly lines: number;
  readonly files: number;
}

/**
 * Generate JSON schema for source file records
 */
export function getJSONSchema() {
  return zodToJsonSchemaForMDB(sourceRecordSchema);
}
