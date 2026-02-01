import { z } from "zod";
import { sourceSchema, sourceSummarySchema } from "../../schemas/sources.schema";
import {
  zodToJsonSchemaForMDB,
  zBsonObjectId,
} from "../../../common/schema/zod-to-mdb-json-schema";

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
 * Type representing the result of a vector search operation on source files.
 * Contains metadata, content, and summary fields needed for RAG workflows.
 */
export type VectorSearchResult = z.infer<
  ReturnType<
    typeof sourceSchema.pick<{
      projectName: true;
      fileType: true;
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
    | "namespace"
    | "purpose"
    | "implementation"
    | "dependencies"
    | "scheduledJobs"
    | "internalReferences"
    | "jspMetrics"
    | "uiFramework"
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
 * Interface representing aggregated project file and line statistics
 */
export interface ProjectedFileAndLineStats {
  readonly fileCount: number;
  readonly linesOfCode: number;
}

/**
 * Interface representing a top complex function/method projection.
 */
export interface ProjectedTopComplexFunction {
  readonly functionName: string;
  readonly filePath: string;
  readonly complexity: number;
  readonly linesOfCode: number;
  readonly codeSmells?: string[];
}

/**
 * Interface representing a code smell aggregate statistic.
 */
export interface ProjectedCodeSmellStatistic {
  readonly smellType: string;
  readonly occurrences: number;
  readonly affectedFiles: number;
}

/**
 * Interface representing overall code quality statistics aggregation.
 */
export interface ProjectedCodeQualityStatistics {
  readonly totalFunctions: number;
  readonly averageComplexity: number;
  readonly highComplexityCount: number;
  readonly veryHighComplexityCount: number;
  readonly averageFunctionLength: number;
  readonly longFunctionCount: number;
}
/**
 * Generate JSON schema for source file records
 */
export function getJSONSchema() {
  return zodToJsonSchemaForMDB(sourceSchema.extend({ _id: zBsonObjectId }));
}
