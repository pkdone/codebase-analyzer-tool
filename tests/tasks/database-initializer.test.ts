import "reflect-metadata";
import { DatabaseInitializer } from "../../src/tasks/database-initializer";
import { coreTokens } from "../../src/di/tokens";

describe("DatabaseInitializer", () => {
  it("should be importable from tasks directory", () => {
    expect(DatabaseInitializer).toBeDefined();
    expect(typeof DatabaseInitializer).toBe("function");
  });

  it("should have the correct token registered", () => {
    expect(coreTokens.DatabaseInitializer).toBeDefined();
    expect(typeof coreTokens.DatabaseInitializer).toBe("symbol");
  });

  it("should be a class (constructor function)", () => {
    expect(DatabaseInitializer.prototype).toBeDefined();
    expect(typeof DatabaseInitializer.prototype.initializeDatabaseSchema).toBe("function");
  });

  it("should have expected public methods", () => {
    expect(typeof DatabaseInitializer.prototype.initializeDatabaseSchema).toBe("function");
  });
});
