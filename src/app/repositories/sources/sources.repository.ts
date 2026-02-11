import { MongoClient, Sort, Document } from "mongodb";
import { numbersToBsonDoubles } from "../../../common/mongodb/bson-utils";
import { SourcesRepository } from "./sources.repository.interface";
import {
  SourceRecordWithId,
  VectorSearchResult,
  ProjectedSourceFilePathAndSummary,
  ProjectedSourceSummaryFields,
  ProjectedDatabaseIntegrationFields,
  ProjectedIntegrationPointFields,
  ProjectedFilePath,
  ProjectedFileExtensionStats,
  SourceRecord,
  ProjectedFileAndLineStats,
  ProjectedTopComplexFunction,
  ProjectedCodeSmellStatistic,
  ProjectedCodeQualityStatistics,
  ProjectedDatabaseStatistics,
} from "./sources.model";
import type { DatabaseConfigType } from "../../config/database.config";
import type { CodeQualityConfigType } from "../../config/code-quality.config";
import { SOURCE_FIELDS } from "../../schemas/source-file.schema";
import { logErr } from "../../../common/utils/logging";
import { BaseRepository } from "../base/base-repository";
import { coreTokens, configTokens } from "../../di/tokens";
import { inject, injectable } from "tsyringe";

/**
 * Type guard to check if aggregation result matches ProjectedFileAndLineStats structure.
 */
function isProjectedFileAndLineStats(data: unknown): data is ProjectedFileAndLineStats {
  return (
    typeof data === "object" &&
    data !== null &&
    "fileCount" in data &&
    typeof data.fileCount === "number" &&
    "linesOfCode" in data &&
    typeof data.linesOfCode === "number"
  );
}

/**
 * MongoDB implementation of the Sources repository
 */
@injectable()
export default class SourcesRepositoryImpl
  extends BaseRepository<SourceRecordWithId>
  implements SourcesRepository
{
  /**
   * Constructor.
   *
   * @param mongoClient - MongoDB client instance (injected)
   * @param dbName - Database name (injected)
   * @param dbConfig - Database configuration (injected)
   * @param qualityConfig - Code quality thresholds configuration (injected)
   */
  constructor(
    @inject(coreTokens.MongoClient) mongoClient: MongoClient,
    @inject(coreTokens.DatabaseName) dbName: string,
    @inject(configTokens.DatabaseConfig) private readonly dbConfig: DatabaseConfigType,
    @inject(configTokens.CodeQualityConfig) private readonly qualityConfig: CodeQualityConfigType,
  ) {
    super(mongoClient, dbName, dbConfig.SOURCES_COLLECTION_NAME);
  }

  /**
   * Insert a source file record into the database.
   *
   * TYPE ASSERTION RATIONALE:
   * The cast to SourceRecordWithId is required due to TypeScript limitations with intersection types.
   * Both `SourceRecord` and `OptionalUnlessRequiredId<SourceRecordWithId>` have `_id?: ObjectId`,
   * making them semantically equivalent for MongoDB insertions. However, TypeScript cannot prove
   * structural compatibility when `SourceRecordWithId` is defined as an intersection type
   * (`z.infer<typeof sourceSchema> & { _id: ObjectId }`). The MongoDB driver's
   * `OptionalUnlessRequiredId` utility type doesn't distribute across intersections as expected.
   *
   * This cast is safe because MongoDB's insertOne will auto-generate _id if not provided.
   */
  async insertSource(sourceFileData: SourceRecord): Promise<void> {
    await this.safeInsert(sourceFileData as SourceRecordWithId);
  }

  /**
   * Insert multiple source file records into the database in a single batch operation.
   * More efficient than multiple individual insertSource calls for bulk ingestion.
   *
   * TYPE ASSERTION RATIONALE: Same as insertSource - the cast is safe because
   * MongoDB's insertMany will auto-generate _id if not provided.
   */
  async insertSources(sourceFileDataList: readonly SourceRecord[]): Promise<void> {
    if (sourceFileDataList.length === 0) return;
    await this.collection.insertMany(
      sourceFileDataList as unknown as SourceRecordWithId[],
      { ordered: false }, // Continue inserting even if some documents fail
    );
  }

  /**
   * Delete all source files for a specific project
   */
  async deleteSourcesByProject(projectName: string): Promise<void> {
    await this.collection.deleteMany({ projectName });
  }

  /**
   * Get source file summaries for a project filtered by file extension
   */
  async getProjectSourcesSummariesByFileExtension(
    projectName: string,
    fileExtensions: string[],
  ): Promise<ProjectedSourceSummaryFields[]> {
    return this.getProjectSourcesSummariesByField(projectName, "fileExtension", fileExtensions);
  }

  /**
   * Get source file summaries for a project filtered by canonical type
   */
  async getProjectSourcesSummariesByCanonicalType(
    projectName: string,
    canonicalTypes: string[],
  ): Promise<ProjectedSourceSummaryFields[]> {
    return this.getProjectSourcesSummariesByField(projectName, "canonicalType", canonicalTypes);
  }

  /**
   * Get database integration information for a project
   */
  async getProjectDatabaseIntegrations(
    projectName: string,
  ): Promise<ProjectedDatabaseIntegrationFields[]> {
    const query = {
      projectName,
      [SOURCE_FIELDS.SUMMARY_DB_INTEGRATION]: { $exists: true, $ne: null },
      [SOURCE_FIELDS.SUMMARY_DB_INTEGRATION_MECHANISM]: { $ne: "NONE" },
    };
    const options: { projection: Document; sort: Sort } = {
      projection: {
        _id: 0,
        [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1,
        [SOURCE_FIELDS.SUMMARY_DB_INTEGRATION]: 1,
        [SOURCE_FIELDS.FILEPATH]: 1,
      },
      sort: {
        [SOURCE_FIELDS.SUMMARY_DB_INTEGRATION_MECHANISM]: 1,
        [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1,
      },
    };
    return await this.collection.find<ProjectedDatabaseIntegrationFields>(query, options).toArray();
  }

  /**
   * Get stored procedures and triggers information for a project
   */
  async getProjectStoredProceduresAndTriggers(
    projectName: string,
  ): Promise<ProjectedSourceFilePathAndSummary[]> {
    const query = {
      $and: [
        { projectName },
        {
          $or: [
            { [SOURCE_FIELDS.SUMMARY_STORED_PROCEDURES]: { $exists: true, $ne: [] } },
            { [SOURCE_FIELDS.SUMMARY_TRIGGERS]: { $exists: true, $ne: [] } },
          ],
        },
      ],
    };
    const options = {
      projection: { _id: 0, summary: 1, [SOURCE_FIELDS.FILEPATH]: 1 },
    };
    return this.collection.find<ProjectedSourceFilePathAndSummary>(query, options).toArray();
  }

  /**
   * Get integration points (APIs, queues, topics, SOAP services) for a project
   */
  async getProjectIntegrationPoints(
    projectName: string,
  ): Promise<ProjectedIntegrationPointFields[]> {
    const query = {
      projectName,
      [SOURCE_FIELDS.SUMMARY_INTEGRATION_POINTS]: { $exists: true, $ne: [] },
    };
    const options: { projection: Document; sort: Sort } = {
      projection: {
        _id: 0,
        [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1,
        [SOURCE_FIELDS.SUMMARY_INTEGRATION_POINTS]: 1,
        [SOURCE_FIELDS.FILEPATH]: 1,
      },
      sort: { [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1 },
    };
    return this.collection.find<ProjectedIntegrationPointFields>(query, options).toArray();
  }

  /**
   * Perform vector search on project sources.
   * Returns sources with metadata, content, and summary for similarity matching.
   */
  async vectorSearchProjectSources(
    projectName: string,
    queryVector: number[],
    numCandidates: number,
    limit: number,
  ): Promise<VectorSearchResult[]> {
    // Convert number[] to Double[] to work around MongoDB driver issue
    // See: https://jira.mongodb.org/browse/NODE-5714
    const queryVectorDoubles = numbersToBsonDoubles(queryVector);

    const pipeline = [
      {
        $vectorSearch: {
          index: this.dbConfig.CONTENT_VECTOR_INDEX_NAME,
          path: this.dbConfig.CONTENT_VECTOR_FIELD,
          filter: {
            projectName: { $eq: projectName },
          },
          queryVector: queryVectorDoubles,
          numCandidates,
          limit,
        },
      },
      {
        $project: {
          _id: 0,
          projectName: 1,
          filepath: 1,
          fileExtension: 1,
          content: 1,
          summary: 1,
        },
      },
    ];

    try {
      return await this.collection.aggregate<VectorSearchResult>(pipeline).toArray();
    } catch (error: unknown) {
      logErr(
        `Problem performing Atlas Vector Search aggregation - ensure the vector index is defined for the '${this.dbConfig.SOURCES_COLLECTION_NAME}' collection`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get file paths for a specific project (used for testing)
   */
  async getProjectFilesPaths(projectName: string): Promise<string[]> {
    const query = { projectName };
    const options = { projection: { _id: 0, filepath: 1 } };
    return this.collection
      .find<ProjectedFilePath>(query, options)
      .map((record) => record.filepath)
      .toArray();
  }

  /**
   * Get file count and total lines of code for a project in a single query
   */
  async getProjectFileAndLineStats(projectName: string): Promise<ProjectedFileAndLineStats> {
    const pipeline = [
      { $match: { projectName } },
      {
        $group: {
          _id: null,
          fileCount: { $sum: 1 },
          linesOfCode: { $sum: "$linesCount" },
        },
      },
    ];
    const results = await this.collection.aggregate<ProjectedFileAndLineStats>(pipeline).toArray();
    // Use type guard to validate aggregation result structure
    const rawStats = results[0];
    const stats = isProjectedFileAndLineStats(rawStats) ? rawStats : undefined;
    return {
      fileCount: stats?.fileCount ?? 0,
      linesOfCode: stats?.linesOfCode ?? 0,
    };
  }

  /**
   * Get files count and lines of code count for each file extension for a project
   */
  async getProjectFileExtensionStats(projectName: string): Promise<ProjectedFileExtensionStats[]> {
    const pipeline = [
      { $match: { projectName } },
      {
        $group: {
          _id: "$fileExtension",
          lines: { $sum: "$linesCount" },
          files: { $sum: 1 },
        },
      },
      { $set: { fileExtension: "$_id" } },
      { $sort: { files: -1, lines: -1 } },
    ];
    return await this.collection.aggregate<ProjectedFileExtensionStats>(pipeline).toArray();
  }

  /**
   * Get top N most complex functions/methods across the project using aggregation pipeline
   */
  async getTopComplexFunctions(
    projectName: string,
    limit = 10,
  ): Promise<ProjectedTopComplexFunction[]> {
    const pipeline = [
      {
        $match: {
          projectName,
          "summary.publicFunctions": { $exists: true, $ne: [] },
        },
      },
      { $unwind: "$summary.publicFunctions" },
      {
        $match: {
          "summary.publicFunctions.cyclomaticComplexity": { $exists: true },
        },
      },
      {
        $set: {
          namespace: { $ifNull: ["$summary.namespace", "$filepath"] },
          complexity: "$summary.publicFunctions.cyclomaticComplexity",
        },
      },
      { $sort: { complexity: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          functionName: { $concat: ["$namespace", "::", "$summary.publicFunctions.name"] },
          filePath: "$filepath",
          linesOfCode: { $ifNull: ["$summary.publicFunctions.linesOfCode", 0] },
          codeSmells: { $ifNull: ["$summary.publicFunctions.codeSmells", []] },
          complexity: 1,
        },
      },
    ];
    return await this.collection.aggregate<ProjectedTopComplexFunction>(pipeline).toArray();
  }

  /**
   * Get code smell statistics using aggregation pipeline
   */
  async getCodeSmellStatistics(projectName: string): Promise<ProjectedCodeSmellStatistic[]> {
    const pipeline = [
      {
        $match: {
          projectName,
        },
      },
      {
        $facet: {
          functionSmells: [
            { $match: { "summary.publicFunctions": { $exists: true, $ne: [] } } },
            { $unwind: "$summary.publicFunctions" },
            {
              $match: {
                "summary.publicFunctions.codeSmells": { $exists: true, $ne: [] },
              },
            },
            { $unwind: "$summary.publicFunctions.codeSmells" },
            {
              $group: {
                _id: {
                  smell: "$summary.publicFunctions.codeSmells",
                  file: "$filepath",
                },
              },
            },
            {
              $group: {
                _id: "$_id.smell",
                occurrences: { $sum: 1 },
                affectedFiles: { $addToSet: "$_id.file" },
              },
            },
          ],
          fileSmells: [
            {
              $match: {
                "summary.codeQualityMetrics.fileSmells": { $exists: true, $ne: [] },
              },
            },
            { $unwind: "$summary.codeQualityMetrics.fileSmells" },
            {
              $group: {
                _id: {
                  smell: "$summary.codeQualityMetrics.fileSmells",
                  file: "$filepath",
                },
              },
            },
            {
              $group: {
                _id: "$_id.smell",
                occurrences: { $sum: 1 },
                affectedFiles: { $addToSet: "$_id.file" },
              },
            },
          ],
        },
      },
      {
        $project: {
          allSmells: { $concatArrays: ["$functionSmells", "$fileSmells"] },
        },
      },
      { $unwind: "$allSmells" },
      {
        $group: {
          _id: "$allSmells._id",
          occurrences: { $sum: "$allSmells.occurrences" },
          affectedFilesArrays: { $push: "$allSmells.affectedFiles" },
        },
      },
      {
        $project: {
          _id: 0,
          smellType: "$_id",
          occurrences: 1,
          affectedFiles: {
            $size: {
              $setUnion: {
                $reduce: {
                  input: "$affectedFilesArrays",
                  initialValue: [],
                  in: { $setUnion: ["$$value", "$$this"] },
                },
              },
            },
          },
        },
      },
      { $sort: { occurrences: -1 } },
    ];

    return await this.collection.aggregate<ProjectedCodeSmellStatistic>(pipeline).toArray();
  }

  /**
   * Get overall code quality statistics using aggregation pipeline
   */
  async getCodeQualityStatistics(projectName: string): Promise<ProjectedCodeQualityStatistics> {
    const pipeline = [
      {
        $match: {
          projectName,
        },
      },
      { $unwind: "$summary.publicFunctions" },
      {
        $match: {
          "summary.publicFunctions.cyclomaticComplexity": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          totalFunctions: { $sum: 1 },
          totalComplexity: { $sum: "$summary.publicFunctions.cyclomaticComplexity" },
          totalLinesOfCode: {
            $sum: { $ifNull: ["$summary.publicFunctions.linesOfCode", 0] },
          },
          highComplexityCount: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    "$summary.publicFunctions.cyclomaticComplexity",
                    this.qualityConfig.HIGH_COMPLEXITY_THRESHOLD,
                  ],
                },
                1,
                0,
              ],
            },
          },
          veryHighComplexityCount: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    "$summary.publicFunctions.cyclomaticComplexity",
                    this.qualityConfig.VERY_HIGH_COMPLEXITY_THRESHOLD,
                  ],
                },
                1,
                0,
              ],
            },
          },
          longFunctionCount: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $ifNull: ["$summary.publicFunctions.linesOfCode", 0] },
                    this.qualityConfig.LONG_FUNCTION_THRESHOLD,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalFunctions: 1,
          averageComplexity: {
            $round: [{ $divide: ["$totalComplexity", "$totalFunctions"] }, 2],
          },
          highComplexityCount: 1,
          veryHighComplexityCount: 1,
          averageFunctionLength: {
            $round: [{ $divide: ["$totalLinesOfCode", "$totalFunctions"] }, 2],
          },
          longFunctionCount: 1,
        },
      },
    ];
    const results = await this.collection
      .aggregate<ProjectedCodeQualityStatistics>(pipeline)
      .toArray();
    return (
      results[0] ?? {
        totalFunctions: 0,
        averageComplexity: 0,
        highComplexityCount: 0,
        veryHighComplexityCount: 0,
        averageFunctionLength: 0,
        longFunctionCount: 0,
      }
    );
  }

  /**
   * Get aggregated database statistics for a project using aggregation pipeline.
   * Counts total stored procedures and triggers across all source files.
   */
  async getDatabaseStatistics(projectName: string): Promise<ProjectedDatabaseStatistics> {
    const pipeline = [
      { $match: { projectName } },
      {
        $facet: {
          storedProcedureCounts: [
            {
              $match: {
                [SOURCE_FIELDS.SUMMARY_STORED_PROCEDURES]: { $exists: true, $ne: [] },
              },
            },
            { $unwind: "$summary.storedProcedures" },
            { $count: "total" },
          ],
          triggerCounts: [
            {
              $match: {
                [SOURCE_FIELDS.SUMMARY_TRIGGERS]: { $exists: true, $ne: [] },
              },
            },
            { $unwind: "$summary.triggers" },
            { $count: "total" },
          ],
        },
      },
    ];

    type FacetResult = {
      storedProcedureCounts: { total: number }[];
      triggerCounts: { total: number }[];
    };

    const results = await this.collection.aggregate<FacetResult>(pipeline).toArray();
    const facet = results[0];

    if (!facet) {
      return {
        storedObjectCounts: { totalProcedures: 0, totalTriggers: 0 },
      };
    }

    return {
      storedObjectCounts: {
        totalProcedures: facet.storedProcedureCounts[0]?.total ?? 0,
        totalTriggers: facet.triggerCounts[0]?.total ?? 0,
      },
    };
  }

  /**
   * Private helper to get source file summaries filtered by a specific field.
   * Consolidates shared logic between getProjectSourcesSummariesByFileExtension and getProjectSourcesSummariesByCanonicalType.
   */
  private async getProjectSourcesSummariesByField(
    projectName: string,
    filterField: "fileExtension" | "canonicalType",
    filterValues: string[],
  ): Promise<ProjectedSourceSummaryFields[]> {
    const query: Document = { projectName };

    // Only add filter if values array is not empty
    if (filterValues.length > 0) {
      query[filterField] = { $in: filterValues };
    }

    return this.findProjectSourcesSummaries(query);
  }

  /**
   * Private helper method to execute the common query for source summaries
   */
  private async findProjectSourcesSummaries(
    query: Document,
  ): Promise<ProjectedSourceSummaryFields[]> {
    const options: { projection: Document; sort: Sort } = {
      projection: {
        _id: 0,
        [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1,
        [SOURCE_FIELDS.SUMMARY_PURPOSE]: 1,
        [SOURCE_FIELDS.SUMMARY_IMPLEMENTATION]: 1,
        [SOURCE_FIELDS.SUMMARY_DEPENDENCIES]: 1,
        [SOURCE_FIELDS.SUMMARY_SCHEDULED_JOBS]: 1,
        [SOURCE_FIELDS.SUMMARY_INTERNAL_REFERENCES]: 1,
        [SOURCE_FIELDS.SUMMARY_JSP_METRICS]: 1,
        [SOURCE_FIELDS.SUMMARY_UI_FRAMEWORK]: 1,
        [SOURCE_FIELDS.FILEPATH]: 1,
      },
      sort: { [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1 },
    };
    return this.collection.find<ProjectedSourceSummaryFields>(query, options).toArray();
  }
}
