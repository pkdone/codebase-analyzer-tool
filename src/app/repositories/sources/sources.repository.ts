import { MongoClient, Sort, Document } from "mongodb";
import { numbersToBsonDoubles } from "../../../common/mongodb/bson-utils";
import { SourcesRepository } from "./sources.repository.interface";
import {
  SourceRecordWithId,
  ProjectedSourceMetadataContentAndSummary,
  ProjectedSourceFilePathAndSummary,
  ProjectedSourceSummaryFields,
  ProjectedDatabaseIntegrationFields,
  ProjectedIntegrationPointFields,
  ProjectedFilePath,
  ProjectedFileTypesCountAndLines,
  SourceRecord,
  ProjectedFileAndLineStats,
  ProjectedTopComplexFunction,
  ProjectedCodeSmellStatistic,
  ProjectedCodeQualityStatistics,
} from "./sources.model";
import { databaseConfig } from "../../components/database/database.config";
import { logErr } from "../../../common/utils/logging";
import { BaseRepository } from "../base/base-repository";
import { coreTokens } from "../../di/tokens";
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
   */
  constructor(
    @inject(coreTokens.MongoClient) mongoClient: MongoClient,
    @inject(coreTokens.DatabaseName) dbName: string,
  ) {
    super(mongoClient, dbName, databaseConfig.SOURCES_COLLECTION_NAME);
  }

  /**
   * Insert a source file record into the database
   */
  async insertSource(sourceFileData: SourceRecord): Promise<void> {
    await this.safeInsert(sourceFileData as SourceRecordWithId);
  }

  /**
   * Delete all source files for a specific project
   */
  async deleteSourcesByProject(projectName: string): Promise<void> {
    await this.collection.deleteMany({ projectName });
  }

  /**
   * Check if a source file already exists for a project
   */
  async doesProjectSourceExist(projectName: string, filepath: string): Promise<boolean> {
    const query = {
      projectName,
      filepath,
    };
    const options = {
      projection: { _id: 1 },
    };
    const result = await this.collection.findOne(query, options);
    return result !== null;
  }

  /**
   * Get source file summaries for a project
   */
  async getProjectSourcesSummariesByFileType(
    projectName: string,
    fileTypes: string[],
  ): Promise<ProjectedSourceSummaryFields[]> {
    return this.getProjectSourcesSummariesByField(projectName, "fileType", fileTypes);
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
      "summary.databaseIntegration": { $exists: true, $ne: null },
      "summary.databaseIntegration.mechanism": { $ne: "NONE" },
    };
    const options: { projection: Document; sort: Sort } = {
      projection: {
        _id: 0,
        "summary.namespace": 1,
        "summary.databaseIntegration": 1,
        filepath: 1,
      },
      sort: {
        "summary.databaseIntegration.mechanism": 1,
        "summary.namespace": 1,
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
            { "summary.storedProcedures": { $exists: true, $ne: [] } },
            { "summary.triggers": { $exists: true, $ne: [] } },
          ],
        },
      ],
    };
    const options = {
      projection: { _id: 0, summary: 1, filepath: 1 },
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
      "summary.integrationPoints": { $exists: true, $ne: [] },
    };
    const options: { projection: Document; sort: Sort } = {
      projection: {
        _id: 0,
        "summary.namespace": 1,
        "summary.integrationPoints": 1,
        filepath: 1,
      },
      sort: { "summary.namespace": 1 },
    };
    return this.collection.find<ProjectedIntegrationPointFields>(query, options).toArray();
  }

  /**
   * Perform vector search on source file content
   */
  async vectorSearchProjectSourcesRawContent(
    projectName: string,
    queryVector: number[],
    numCandidates: number,
    limit: number,
  ): Promise<ProjectedSourceMetadataContentAndSummary[]> {
    // Convert number[] to Double[] to work around MongoDB driver issue
    // See: https://jira.mongodb.org/browse/NODE-5714
    const queryVectorDoubles = numbersToBsonDoubles(queryVector);

    const pipeline = [
      {
        $vectorSearch: {
          index: databaseConfig.CONTENT_VECTOR_INDEX_NAME,
          path: databaseConfig.CONTENT_VECTOR_FIELD,
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
          fileType: 1,
          content: 1,
          summary: 1,
        },
      },
    ];

    try {
      return await this.collection
        .aggregate<ProjectedSourceMetadataContentAndSummary>(pipeline)
        .toArray();
    } catch (error: unknown) {
      logErr(
        `Problem performing Atlas Vector Search aggregation - ensure the vector index is defined for the '${databaseConfig.SOURCES_COLLECTION_NAME}' collection`,
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
   * Get files count and lines of code count for each file typefor a project
   */
  async getProjectFileTypesCountAndLines(
    projectName: string,
  ): Promise<ProjectedFileTypesCountAndLines[]> {
    const pipeline = [
      { $match: { projectName } },
      {
        $group: {
          _id: "$fileType",
          lines: { $sum: "$linesCount" },
          files: { $sum: 1 },
        },
      },
      { $set: { fileType: "$_id" } },
      { $sort: { files: -1, lines: -1 } },
    ];
    return await this.collection.aggregate<ProjectedFileTypesCountAndLines>(pipeline).toArray();
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
              $cond: [{ $gt: ["$summary.publicFunctions.cyclomaticComplexity", 10] }, 1, 0],
            },
          },
          veryHighComplexityCount: {
            $sum: {
              $cond: [{ $gt: ["$summary.publicFunctions.cyclomaticComplexity", 20] }, 1, 0],
            },
          },
          longFunctionCount: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$summary.publicFunctions.linesOfCode", 0] }, 50] },
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
   * Private helper to get source file summaries filtered by a specific field.
   * Consolidates shared logic between getProjectSourcesSummariesByFileType and getProjectSourcesSummariesByCanonicalType.
   */
  private async getProjectSourcesSummariesByField(
    projectName: string,
    filterField: "fileType" | "canonicalType",
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
        "summary.namespace": 1,
        "summary.purpose": 1,
        "summary.implementation": 1,
        "summary.dependencies": 1,
        "summary.scheduledJobs": 1,
        "summary.internalReferences": 1,
        "summary.jspMetrics": 1,
        "summary.uiFramework": 1,
        filepath: 1,
      },
      sort: { "summary.namespace": 1 },
    };
    return this.collection.find<ProjectedSourceSummaryFields>(query, options).toArray();
  }
}
