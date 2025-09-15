import { Sort, Document, OptionalId } from "mongodb";
import { Double } from "bson";
import { SourcesRepository } from "./sources.repository.interface";
import {
  SourceRecordWithId,
  ProjectedSourceMetataContentAndSummary,
  ProjectedSourceFilePathAndSummary,
  ProjectedSourceSummaryFields,
  ProjectedDatabaseIntegrationFields,
  ProjectedFilePath,
  ProjectedFileTypesCountAndLines,
  SourceRecord,
} from "./sources.model";
import { databaseConfig } from "../../config/database.config";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import { logMongoValidationErrorIfPresent } from "../../common/mdb/mdb-error-utils";
import { getJSONSchema } from "./sources.model";
import { BaseRepository } from "../base-repository";
import { MongoClient } from "mongodb";
import { TOKENS } from "../../di/tokens";
import { inject, injectable } from "tsyringe";

/**
 * MongoDB implementation of the Sources repository
 */
@injectable()
export default class SourcesRepositoryImpl extends BaseRepository<SourceRecordWithId> implements SourcesRepository {
  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.MongoClient) mongoClient: MongoClient) {
    super(mongoClient, databaseConfig.SOURCES_COLLECTION_NAME);
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
    const query = {
      projectName,
      type: { $in: fileTypes },
    };
    const options: { projection: Document; sort: Sort } = {
      projection: {
        _id: 0,
        "summary.classpath": 1,
        "summary.purpose": 1,
        "summary.implementation": 1,
        filepath: 1,
      },
      sort: { "summary.classpath": 1 },
    };
    return this.collection.find<ProjectedSourceSummaryFields>(query, options).toArray();
  }

  /**
   * Get database integration information for a project
   */
  async getProjectDatabaseIntegrations(
    projectName: string,
    fileTypes: string[],
  ): Promise<ProjectedDatabaseIntegrationFields[]> {
    const query = {
      projectName,
      type: { $in: fileTypes },
      "summary.databaseIntegration": { $exists: true, $ne: null },
      "summary.databaseIntegration.mechanism": { $ne: "NONE" },
    };
    const options: { projection: Document; sort: Sort } = {
      projection: {
        _id: 0,
        "summary.classpath": 1,
        "summary.databaseIntegration.mechanism": 1,
        "summary.databaseIntegration.description": 1,
        "summary.databaseIntegration.codeExample": 1,
        filepath: 1,
      },
      sort: {
        "summary.databaseIntegration.mechanism": 1,
        "summary.classpath": 1,
      },
    };
    return await this.collection.find<ProjectedDatabaseIntegrationFields>(query, options).toArray();
  }

  /**
   * Get stored procedures and triggers information for a project
   */
  async getProjectStoredProceduresAndTriggers(
    projectName: string,
    fileTypes: string[],
  ): Promise<ProjectedSourceFilePathAndSummary[]> {
    const query = {
      $and: [
        { projectName },
        { type: { $in: fileTypes } },
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
   * Perform vector search on source file content
   */
  async vectorSearchProjectSourcesRawContent(
    projectName: string,
    fileType: string,
    queryVector: number[],
    numCandidates: number,
    limit: number,
  ): Promise<ProjectedSourceMetataContentAndSummary[]> {
    // Convert number[] to Double[] to work around MongoDB driver issue
    // See: https://jira.mongodb.org/browse/NODE-5714
    const queryVectorDoubles = this.numbersToBsonDoubles(queryVector);

    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: databaseConfig.CONTENT_VECTOR_INDEX_NAME,
          path: databaseConfig.CONTENT_VECTOR_FIELD,
          filter: {
            $and: [{ projectName: { $eq: projectName } }, { type: { $eq: fileType } }],
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
   * Get file count for a project
   */
  async getProjectFilesCount(projectName: string): Promise<number> {
    const pipeline: Document[] = [{ $match: { projectName } }, { $group: { _id: "", count: { $sum: 1 } } }];
    const result = await this.collection.aggregate<{ count: number }>(pipeline).toArray();
    return result[0]?.count ?? 0;
  }

  /**
   * Get total lines of code for a project
   */
  async getProjectTotalLinesOfCode(projectName: string): Promise<number> {
    const pipeline: Document[] = [
      { $match: { projectName } },
      { $group: { _id: "", count: { $sum: "$linesCount" } } },
    ];
    const result = await this.collection.aggregate<{ count: number }>(pipeline).toArray();
    return result[0]?.count ?? 0;
  }

  /**
   * Get files count and lines of code count for each file typefor a project
   */
  async getProjectFileTypesCountAndLines(
    projectName: string,
  ): Promise<ProjectedFileTypesCountAndLines[]> {
    const pipeline: Document[] = [
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
   * Get the JSON schema for collection validation
   */
  getCollectionValidationSchema(): object {
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
