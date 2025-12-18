import "reflect-metadata";
import { IntegrationPointsDataProvider } from "../../../../../src/app/components/reporting/sections/integration-points/integration-points-data-provider";
import type { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";

describe("IntegrationPointsDataProvider", () => {
  let provider: IntegrationPointsDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    mockSourcesRepository = {
      getProjectIntegrationPoints: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    provider = new IntegrationPointsDataProvider(mockSourcesRepository);
  });

  describe("getIntegrationPoints", () => {
    it("should return empty array when no integration points found", async () => {
      mockSourcesRepository.getProjectIntegrationPoints.mockResolvedValue([]);

      const result = await provider.getIntegrationPoints("test-project");

      expect(result).toEqual([]);
      expect(mockSourcesRepository.getProjectIntegrationPoints).toHaveBeenCalledWith(
        "test-project",
      );
    });

    it("should return integration points from repository", async () => {
      const mockRecords = [
        {
          filepath: "src/api/rest-controller.ts",
          summary: {
            namespace: "com.example.api",
            integrationPoints: [
              {
                mechanism: "REST",
                name: "UserController",
                description: "REST API for user management",
                path: "/api/users",
                method: "GET",
                protocol: "HTTP/1.1",
              },
            ],
          },
        },
        {
          filepath: "src/messaging/queue-handler.ts",
          summary: {
            namespace: "com.example.messaging",
            integrationPoints: [
              {
                mechanism: "JMS-QUEUE",
                name: "OrderQueue",
                description: "JMS queue for order processing",
                queueOrTopicName: "orders.queue",
                messageType: "OrderMessage",
                direction: "CONSUMER",
              },
            ],
          },
        },
      ] as any;

      mockSourcesRepository.getProjectIntegrationPoints.mockResolvedValue(mockRecords);

      const result = await provider.getIntegrationPoints("test-project");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        namespace: "com.example.api",
        filepath: "src/api/rest-controller.ts",
        mechanism: "REST",
        name: "UserController",
        path: "/api/users",
        method: "GET",
      });
      expect(result[1]).toMatchObject({
        namespace: "com.example.messaging",
        filepath: "src/messaging/queue-handler.ts",
        mechanism: "JMS-QUEUE",
        name: "OrderQueue",
        queueOrTopicName: "orders.queue",
      });
    });

    it("should use filepath as namespace when namespace is not provided", async () => {
      const mockRecords = [
        {
          filepath: "src/api/controller.ts",
          summary: {
            integrationPoints: [
              {
                mechanism: "REST",
                name: "TestController",
                description: "Test",
              },
            ],
          },
        },
      ] as any;

      mockSourcesRepository.getProjectIntegrationPoints.mockResolvedValue(mockRecords);

      const result = await provider.getIntegrationPoints("test-project");

      expect(result[0].namespace).toBe("src/api/controller.ts");
    });

    it("should filter out records without integration points", async () => {
      const mockRecords = [
        {
          filepath: "src/api/controller.ts",
          summary: {
            integrationPoints: [
              {
                mechanism: "REST",
                name: "TestController",
                description: "Test",
              },
            ],
          },
        },
        {
          filepath: "src/utils/helper.ts",
          summary: {},
        },
        {
          filepath: "src/service/service.ts",
          summary: null,
        },
      ] as any;

      mockSourcesRepository.getProjectIntegrationPoints.mockResolvedValue(mockRecords);

      const result = await provider.getIntegrationPoints("test-project");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("TestController");
    });
  });
});
