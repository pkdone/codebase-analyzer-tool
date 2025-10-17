import "reflect-metadata";
import { TOKENS } from "../../src/tokens";

describe("Renamed tokens exist", () => {
  it("AppSummariesRepository token is defined", () => {
    expect(TOKENS.AppSummariesRepository).toBeDefined();
  });
  it("LocalInsightsGenerator token is defined", () => {
    expect(TOKENS.LocalInsightsGenerator).toBeDefined();
  });
  it("MongoConnectionTestTask token is defined", () => {
    expect(TOKENS.MongoConnectionTestTask).toBeDefined();
  });
});
