import "reflect-metadata";
import { container } from "tsyringe";
import { reportingTokens } from "../../../../src/app/di/tokens";
import { registerReportingComponents } from "../../../../src/app/di/registration-modules/reporting-registration";

describe("Reporting Registration Module", () => {
  beforeEach(() => {
    container.clearInstances();
    container.reset();
  });

  describe("registerReportingComponents", () => {
    it("should register all reporting components as singletons", () => {
      registerReportingComponents();

      expect(container.isRegistered(reportingTokens.HtmlReportWriter)).toBe(true);
      expect(container.isRegistered(reportingTokens.JsonReportWriter)).toBe(true);
      expect(container.isRegistered(reportingTokens.FlowchartDiagramGenerator)).toBe(true);
      expect(container.isRegistered(reportingTokens.DomainModelDiagramGenerator)).toBe(true);
      expect(container.isRegistered(reportingTokens.ArchitectureDiagramGenerator)).toBe(true);
      expect(container.isRegistered(reportingTokens.ReportArtifactGenerator)).toBe(true);
    });

    it("should register components only once even on multiple calls", () => {
      registerReportingComponents();
      const isRegistered1 = container.isRegistered(reportingTokens.HtmlReportWriter);

      registerReportingComponents();
      const isRegistered2 = container.isRegistered(reportingTokens.HtmlReportWriter);

      expect(isRegistered1).toBe(true);
      expect(isRegistered2).toBe(true);
    });

    it("should log registration message", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      registerReportingComponents();

      expect(consoleSpy).toHaveBeenCalledWith("Reporting components registered");
      consoleSpy.mockRestore();
    });
  });
});
