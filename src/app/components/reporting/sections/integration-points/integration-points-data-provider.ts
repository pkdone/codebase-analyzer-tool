import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type { IntegrationPointInfo } from "./integration-points.types";

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
   * Uses spread syntax to map integration point fields, adding namespace and filepath from the record.
   */
  async getIntegrationPoints(projectName: string): Promise<IntegrationPointInfo[]> {
    const records = await this.sourcesRepository.getProjectIntegrationPoints(projectName);
    return records.flatMap((record) => {
      const { summary } = record;

      if (summary?.integrationPoints) {
        return summary.integrationPoints.map((point) => ({
          namespace: summary.namespace ?? record.filepath,
          filepath: record.filepath,
          ...point,
        }));
      }

      return [];
    });
  }
}
