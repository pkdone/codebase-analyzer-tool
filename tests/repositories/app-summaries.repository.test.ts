import "reflect-metadata";
import { container } from "tsyringe";
import { coreTokens } from "../../src/di/tokens";
import { repositoryTokens } from "../../src/di/tokens";
import AppSummariesRepositoryImpl from "../../src/repositories/app-summaries/app-summaries.repository";
import { MongoClient } from "mongodb";
import { AppSummariesRepository } from "../../src/repositories/app-summaries/app-summaries.repository.interface";

describe("AppSummariesRepository DI & basic methods", () => {
  beforeAll(() => {
    // Register fake MongoClient and db name
    container.registerInstance(coreTokens.MongoClient, new MongoClient("mongodb://example.com"));
    container.registerInstance(coreTokens.DatabaseName, "testdb");
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
