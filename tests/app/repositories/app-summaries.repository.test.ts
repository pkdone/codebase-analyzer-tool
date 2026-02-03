import "reflect-metadata";
import { container } from "tsyringe";
import { coreTokens, configTokens } from "../../../src/app/di/tokens";
import { repositoryTokens } from "../../../src/app/di/tokens";
import AppSummariesRepositoryImpl from "../../../src/app/repositories/app-summaries/app-summaries.repository";
import { MongoClient } from "mongodb";
import { AppSummariesRepository } from "../../../src/app/repositories/app-summaries/app-summaries.repository.interface";
import { databaseConfig } from "../../../src/app/config/database.config";

describe("AppSummariesRepository DI & basic methods", () => {
  beforeAll(() => {
    // Register fake MongoClient and db name
    container.registerInstance(coreTokens.MongoClient, new MongoClient("mongodb://example.com"));
    container.registerInstance(coreTokens.DatabaseName, "testdb");
    // Register database config for dependency injection
    container.registerInstance(configTokens.DatabaseConfig, databaseConfig);
    container.registerSingleton<AppSummariesRepository>(
      repositoryTokens.AppSummariesRepository,
      AppSummariesRepositoryImpl,
    );
  });

  it("resolves implementation via DI", () => {
    const repo = container.resolve<AppSummariesRepository>(repositoryTokens.AppSummariesRepository);
    expect(repo).toBeInstanceOf(AppSummariesRepositoryImpl);
  });

  it("can be resolved from container", () => {
    const repo = container.resolve<AppSummariesRepository>(repositoryTokens.AppSummariesRepository);
    expect(repo).toBeTruthy();
    expect(repo).toBeInstanceOf(Object);
  });
});
