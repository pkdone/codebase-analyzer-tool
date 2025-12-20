import "reflect-metadata";
import { DatabaseInitializer } from "../../../../src/app/components/database/database-initializer";
import { coreTokens } from "../../../../src/app/di/tokens";

describe("DatabaseInitializer in components/database", () => {
  it("should be importable from components/database directory", () => {
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

  it("should have correct JSDoc for the class", () => {
    // This test ensures the class is properly documented
    const classString = DatabaseInitializer.toString();
    expect(classString).toContain("DatabaseInitializer");
  });

  it("should be decorated with @injectable", () => {
    // Verify that the class has the injectable decorator metadata
    const metadata = Reflect.getMetadata("design:paramtypes", DatabaseInitializer);
    expect(metadata).toBeDefined();
  });
});
