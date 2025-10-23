import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "../../src/tokens";
import AppSummariesRepositoryImpl from "../../src/repositories/app-summaries/app-summaries.repository";
import { MongoClient } from "mongodb";
import { AppSummariesRepository } from "../../src/repositories/app-summaries/app-summaries.repository.interface";

describe("AppSummariesRepository DI & basic methods", () => {
  beforeAll(() => {
    // Register fake MongoClient and db name
    container.registerInstance(TOKENS.MongoClient, new MongoClient("mongodb://example.com"));
    container.registerInstance(TOKENS.DatabaseName, "testdb");
    container.registerSingleton<AppSummariesRepository>(
      TOKENS.AppSummariesRepository,
      AppSummariesRepositoryImpl,
    );
  });

  it("resolves implementation via DI", () => {
    const repo = container.resolve<AppSummariesRepository>(TOKENS.AppSummariesRepository);
    expect(repo).toBeInstanceOf(AppSummariesRepositoryImpl);
  });

  it("exposes collection schema", () => {
    const repo = container.resolve<AppSummariesRepository>(TOKENS.AppSummariesRepository);
    const schema = repo.getCollectionValidationSchema();
    expect(schema).toBeTruthy();
    expect(typeof schema).toBe("object");
  });
});
