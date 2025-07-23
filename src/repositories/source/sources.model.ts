/**
 * Note: For non-simple MQL projectionss, and especially for partial projections of nested fields,
 * we need to create schemas inline using sourceRecordSchema.pick() or z.object() since MongoDB
 * projections revert to returning field types of 'unknown'.
 */
import { z } from "zod";
import { zodToJsonSchemaForMDB, zBsonObjectId } from "../../common/mdb/zod-to-mdb-json-schema";
import { sourceSchema, sourceSummarySchema } from "../../schemas/sources.schema";

/**
 * Type for source record without _id
 */
export type SourceRecordNoId = z.infer<typeof sourceSchema>;

/**
 * Type for source record without _id
 */
export type SourceRecord = SourceRecordNoId & { _id: z.infer<typeof zBsonObjectId> };

/**
 * Type for MongoDB projected document with just filepath
 */
export type ProjectedFilePath = z.infer<ReturnType<typeof sourceSchema.pick<{ filepath: true }>>>;

/**
 * Type for MongoDB projected document with filepath and summary fields
 */
export type ProjectedSourceFilePathAndSummary = z.infer<
  ReturnType<typeof sourceSchema.pick<{ filepath: true; summary: true }>>
>;

/**
 * Type for MongoDB projected document with metadata, content and summary for vector search
 */
export type ProjectedSourceMetataContentAndSummary = z.infer<
  ReturnType<
    typeof sourceSchema.pick<{
      projectName: true;
      type: true;
      filepath: true;
      content: true;
      summary: true;
    }>
  >
>;

/**
 * Type for MongoDB projected document with filepath and partial summary fields
 * Derived from source schemas to maintain consistency
 */
export interface ProjectedSourceSummaryFields {
  filepath: SourceRecordNoId["filepath"];
  summary?: Pick<z.infer<typeof sourceSummarySchema>, "classpath" | "purpose" | "implementation">;
}

/**
 * Type for MongoDB projected document with database integration fields
 * Derived from source schemas to maintain consistency
 */
export interface ProjectedDatabaseIntegrationFields {
  filepath: SourceRecordNoId["filepath"];
  summary?: Pick<z.infer<typeof sourceSummarySchema>, "classpath" | "databaseIntegration">;
}

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
  return zodToJsonSchemaForMDB(sourceSchema.extend({ _id: zBsonObjectId }));
}
