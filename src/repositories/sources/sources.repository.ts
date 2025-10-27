import { MongoClient, Sort, Document, OptionalId } from "mongodb";
import { Double } from "bson";
import { SourcesRepository } from "./sources.repository.interface";
import {
  SourceRecordWithId,
  ProjectedSourceMetataContentAndSummary,
  ProjectedSourceFilePathAndSummary,
  ProjectedSourceSummaryFields,
  ProjectedDatabaseIntegrationFields,
  ProjectedIntegrationPointFields,
  ProjectedFilePath,
  ProjectedFileTypesCountAndLines,
  ProjectedTopLevelJavaClassDependencies,
  SourceRecord,
  getJSONSchema,
  ProjectedFileAndLineStats,
  ProjectedTopComplexMethod,
  ProjectedCodeSmellStatistic,
  ProjectedCodeQualityStatistics,
} from "./sources.model";
import { databaseConfig } from "../../config/database.config";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import { logMongoValidationErrorIfPresent } from "../../common/mongodb/mdb-error-utils";
import { BaseRepository } from "../base-repository";
import { coreTokens } from "../../di/core.tokens";
import { inject, injectable } from "tsyringe";

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
    try {
      await this.collection.insertOne(sourceFileData as OptionalId<SourceRecordWithId>);
    } catch (error: unknown) {
      logMongoValidationErrorIfPresent(error);
      throw error;
    }
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
  async getProjectSourcesSummaries(
    projectName: string,
    fileTypes: string[],
  ): Promise<ProjectedSourceSummaryFields[]> {
    const query: { projectName: string; type?: { $in: string[] } } = {
      projectName,
    };

    // Only add type filter if fileTypes array is not empty
    if (fileTypes.length > 0) {
      query.type = { $in: fileTypes };
    }
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

  /**
   * Get database integration information for a project
   */
  async getProjectDatabaseIntegrations(
    projectName: string,
  ): Promise<ProjectedDatabaseIntegrationFields[]> {
    // TODO: look at index
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
    // TODO: look at index
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
    // TODO: look at index
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
  ): Promise<ProjectedSourceMetataContentAndSummary[]> {
    // Convert number[] to Double[] to work around MongoDB driver issue
    // See: https://jira.mongodb.org/browse/NODE-5714
    const queryVectorDoubles = this.numbersToBsonDoubles(queryVector);

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
          type: 1,
          content: 1,
          summary: 1,
        },
      },
    ];

    try {
      return await this.collection
        .aggregate<ProjectedSourceMetataContentAndSummary>(pipeline)
        .toArray();
    } catch (error: unknown) {
      logErrorMsgAndDetail(
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
    const [stats] = results;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!stats) return { fileCount: 0, linesOfCode: 0 };
    return {
      fileCount: stats.fileCount,
      linesOfCode: stats.linesOfCode,
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
          _id: "$type",
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
   * Get top level classes for a project with their full dependency structures.
   * Returns the complete dependency tree for each top-level class.
   * @param projectName The project name to filter by
   * @param fileType The file type to filter by (e.g., "java")
   */
  async getTopLevelClassDependencies(
    projectName: string,
    fileType: string,
  ): Promise<ProjectedTopLevelJavaClassDependencies[]> {
    // TODO: This is inneficient and should be optimized.
    const pipeline = [
      {
        $match: {
          projectName,
          type: fileType,
        },
      },
      {
        $project: {
          _id: 0,
          references: { $concatArrays: [["$summary.namespace"], "$summary.internalReferences"] },
        },
      },
      {
        $unwind: {
          path: "$references",
        },
      },
      {
        $match: {
          references: { $not: /^javax\..*/ },
        },
      },
      {
        $group: {
          _id: "$references",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $lte: 1 },
        },
      },
      {
        $graphLookup: {
          from: "sources",
          startWith: "$_id",
          connectFromField: "summary.internalReferences",
          connectToField: "summary.namespace",
          depthField: "level",
          maxDepth: databaseConfig.DEPENDENCY_GRAPH_MAX_DEPTH,
          as: "dependency_documents",
        },
      },
      {
        $project: {
          _id: 0,
          namespace: "$_id",
          dependency_count: { $size: "$dependency_documents" },
          dependencies: {
            $map: {
              input: "$dependency_documents",
              as: "dependency",
              in: {
                level: "$$dependency.level",
                namespace: "$$dependency.summary.namespace",
                references: "$$dependency.summary.internalReferences",
              },
            },
          },
        },
      },
      {
        $sort: {
          dependency_count: -1,
        },
      },
      { $limit: databaseConfig.DEPENDENCY_GRAPH_RESULT_LIMIT },
    ];

    return this.collection.aggregate<ProjectedTopLevelJavaClassDependencies>(pipeline).toArray();
  }

  /**
   * Get top N most complex methods across the project using aggregation pipeline
   */
  async getTopComplexMethods(
    projectName: string,
    limit = 10,
  ): Promise<ProjectedTopComplexMethod[]> {
    const pipeline = [
      {
        $match: {
          projectName,
          "summary.publicMethods": { $exists: true, $ne: [] },
        },
      },
      { $unwind: "$summary.publicMethods" },
      {
        $match: {
          "summary.publicMethods.cyclomaticComplexity": { $exists: true },
        },
      },
      {
        $set: {
          namespace: { $ifNull: ["$summary.namespace", "$filepath"] },
          complexity: "$summary.publicMethods.cyclomaticComplexity",
        },
      },
      { $sort: { complexity: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          methodName: { $concat: ["$namespace", "::", "$summary.publicMethods.name"] },
          filePath: "$filepath",
          linesOfCode: { $ifNull: ["$summary.publicMethods.linesOfCode", 0] },
          codeSmells: { $ifNull: ["$summary.publicMethods.codeSmells", []] },
          complexity: 1,
        },
      },
    ];
    return await this.collection.aggregate<ProjectedTopComplexMethod>(pipeline).toArray();
  }

  /**
   * Get code smell statistics using aggregation pipeline
   */
  async getCodeSmellStatistics(projectName: string): Promise<ProjectedCodeSmellStatistic[]> {
    // TODO: look at index
    const pipeline = [
      {
        $match: {
          projectName,
        },
      },
      {
        $facet: {
          methodSmells: [
            { $match: { "summary.publicMethods": { $exists: true, $ne: [] } } },
            { $unwind: "$summary.publicMethods" },
            {
              $match: {
                "summary.publicMethods.codeSmells": { $exists: true, $ne: [] },
              },
            },
            { $unwind: "$summary.publicMethods.codeSmells" },
            {
              $group: {
                _id: {
                  smell: "$summary.publicMethods.codeSmells",
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
          allSmells: { $concatArrays: ["$methodSmells", "$fileSmells"] },
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
    // TODO: look at index
    const pipeline = [
      {
        $match: {
          projectName,
        },
      },
      { $unwind: "$summary.publicMethods" },
      {
        $match: {
          "summary.publicMethods.cyclomaticComplexity": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          totalMethods: { $sum: 1 },
          totalComplexity: { $sum: "$summary.publicMethods.cyclomaticComplexity" },
          totalLinesOfCode: {
            $sum: { $ifNull: ["$summary.publicMethods.linesOfCode", 0] },
          },
          highComplexityCount: {
            $sum: {
              $cond: [{ $gt: ["$summary.publicMethods.cyclomaticComplexity", 10] }, 1, 0],
            },
          },
          veryHighComplexityCount: {
            $sum: {
              $cond: [{ $gt: ["$summary.publicMethods.cyclomaticComplexity", 20] }, 1, 0],
            },
          },
          longMethodCount: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ["$summary.publicMethods.linesOfCode", 0] }, 50] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalMethods: 1,
          averageComplexity: {
            $round: [{ $divide: ["$totalComplexity", "$totalMethods"] }, 2],
          },
          highComplexityCount: 1,
          veryHighComplexityCount: 1,
          averageMethodLength: {
            $round: [{ $divide: ["$totalLinesOfCode", "$totalMethods"] }, 2],
          },
          longMethodCount: 1,
        },
      },
    ];
    const results = await this.collection
      .aggregate<ProjectedCodeQualityStatistics>(pipeline)
      .toArray();
    return (
      results[0] ?? {
        totalMethods: 0,
        averageComplexity: 0,
        highComplexityCount: 0,
        veryHighComplexityCount: 0,
        averageMethodLength: 0,
        longMethodCount: 0,
      }
    );
  }

  /**
   * Get the JSON schema for collection validation
   */
  getCollectionValidationSchema(): Record<string, unknown> {
    return getJSONSchema();
  }

  /**
   * Iterates through the numbers in the array and converts each one explicitly to a BSON Double.
   * This works around a MongoDB driver issue.
   * @see https://jira.mongodb.org/browse/NODE-5714
   *
   * @param numbers The array of numbers to convert.
   * @returns The array of BSON Doubles.
   */
  private numbersToBsonDoubles(numbers: number[]): Double[] {
    return numbers.map((number) => new Double(number));
  }
}
