import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type { IntegrationPointInfo } from "../../report-gen.types";

/**
 * Data provider responsible for aggregating integration points (APIs, queues, topics, SOAP services)
 * found in the project.
 */
@injectable()
export class IntegrationPointsDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Returns a list of integration points (APIs, queues, topics, SOAP services) found in the project.
   */
  async getIntegrationPoints(projectName: string): Promise<IntegrationPointInfo[]> {
    const records = await this.sourcesRepository.getProjectIntegrationPoints(projectName);
    return records.flatMap((record) => {
      const { summary } = record;
      if (summary?.integrationPoints) {
        return summary.integrationPoints.map((point) => ({
          namespace: summary.namespace ?? record.filepath,
          filepath: record.filepath,
          mechanism: point.mechanism,
          name: point.name,
          description: point.description,
          path: point.path,
          method: point.method,
          queueOrTopicName: point.queueOrTopicName,
          messageType: point.messageType,
          direction: point.direction,
          requestBody: point.requestBody,
          responseBody: point.responseBody,
          authentication: point.authentication,
          protocol: point.protocol,
          connectionInfo: point.connectionInfo,
        }));
      }
      return [];
    });
  }
}
