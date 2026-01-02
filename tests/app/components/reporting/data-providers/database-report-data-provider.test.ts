import "reflect-metadata";
import { DatabaseReportDataProvider } from "../../../../../src/app/components/reporting/sections/database/database-report-data-provider";

describe("DatabaseReportDataProvider.getStoredProceduresAndTriggers", () => {
  it("aggregates complexity counts correctly", async () => {
    const mockRepo = {
      getProjectStoredProceduresAndTriggers: jest.fn(async () => [
        { filepath: "a.sql", summary: { storedProcedures: [{ name: "p1", complexity: "LOW" }] } },
        { filepath: "b.sql", summary: { storedProcedures: [{ name: "p2", complexity: "HIGH" }] } },
        { filepath: "c.sql", summary: { triggers: [{ name: "t1", complexity: "MEDIUM" }] } },
      ]),
    } as any;
    const provider = new DatabaseReportDataProvider(mockRepo);
    const result = await provider.getStoredProceduresAndTriggers("proj");
    expect(result.procs.total).toBe(2);
    expect(result.procs.low).toBe(1);
    expect(result.procs.high).toBe(1);
    expect(result.trigs.total).toBe(1);
    expect(result.trigs.medium).toBe(1);
  });
});
