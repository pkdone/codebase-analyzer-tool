/**
 * Note: For non-simple MQL projectionss, and especially for partial projections of nested fields,
 * we need to create schemas inline using sourceRecordSchema.pick() or z.object() since MongoDB
 * projections revert to returning field types of 'unknown'.
 */
import { z } from "zod";
import { sourceSchema, sourceSummarySchema } from "../../schemas/sources.schema";
import { zodToJsonSchemaForMDB, zBsonObjectId } from "../../common/mdb/zod-to-mdb-json-schema";

/**
 * Type for source record with optional _id
 */
export type SourceRecord = z.infer<typeof sourceSchema> & { _id?: z.infer<typeof zBsonObjectId> };

/**
 * Type for source record with mandatory _id
 */
export type SourceRecordWithId = z.infer<typeof sourceSchema> & {
  _id: z.infer<typeof zBsonObjectId>;
};

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
  filepath: SourceRecord["filepath"];
  summary?: Pick<
    z.infer<typeof sourceSummarySchema>,
    "namespace" | "purpose" | "implementation" | "dependencies"
  >;
}

/**
 * Type for MongoDB projected document with database integration fields
 * Derived from source schemas to maintain consistency
 */
export interface ProjectedDatabaseIntegrationFields {
  filepath: SourceRecord["filepath"];
  summary?: Pick<z.infer<typeof sourceSummarySchema>, "namespace" | "databaseIntegration">;
}

/**
 * Type for MongoDB projected document with integration point fields
 * Derived from source schemas to maintain consistency
 */
export interface ProjectedIntegrationPointFields {
  filepath: SourceRecord["filepath"];
  summary?: Pick<z.infer<typeof sourceSummarySchema>, "namespace" | "integrationPoints">;
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
 * Interface representing a dependency entry for a Java class
 */
export interface JavaClassDependency {
  readonly level: number;
  readonly namespace: string;
  readonly references: readonly string[];
}

/**
 * Interface representing a hierarchical Java class dependency node
 */
export interface HierarchicalJavaClassDependency {
  readonly namespace: string;
  readonly originalLevel?: number; // Preserve original level from flat data
  readonly dependencies?: readonly HierarchicalJavaClassDependency[];
}

/**
 * Interface representing a top-level Java class with its hierarchical dependencies
 */
export interface HierarchicalTopLevelJavaClassDependencies {
  readonly namespace: string;
  readonly dependencies: readonly HierarchicalJavaClassDependency[];
}

/**
 * Interface representing a top-level Java class with its dependencies (flat structure)
 */
export interface ProjectedTopLevelJavaClassDependencies {
  readonly namespace: string;
  readonly dependencies: readonly JavaClassDependency[];
}

/**
 * Generate JSON schema for source file records
 */
export function getJSONSchema() {
  return zodToJsonSchemaForMDB(sourceSchema.extend({ _id: zBsonObjectId }));
}
