import "reflect-metadata";
import { container } from "tsyringe";
import { repositoryTokens } from "../../../../src/app/di/tokens";
import { reportingTokens } from "../../../../src/app/di/tokens";
import { SourcesRepository } from "../../../../src/app/repositories/sources/sources.repository.interface";
import { AppSummariesRepository } from "../../../../src/app/repositories/app-summaries/app-summaries.repository.interface";
import { UiDataProvider } from "../../../../src/app/components/reporting/sections/advanced-data/ui-data-provider";
import { SourceRecord } from "../../../../src/app/repositories/sources/sources.model";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "../../../common/helpers/database/db-test-helper";

describe("UI Technology Analysis Integration Test", () => {
  let sourcesRepository: SourcesRepository;
  let appSummaryRepository: AppSummariesRepository;
  let uiDataProvider: UiDataProvider;
  const projectName = `ui-test-project-${Date.now()}`;

  beforeAll(async () => {
    // Setup the temporary database
    await setupTestDatabase();
    // Resolve repositories and data provider from DI container
    sourcesRepository = container.resolve<SourcesRepository>(repositoryTokens.SourcesRepository);
    appSummaryRepository = container.resolve<AppSummariesRepository>(
      repositoryTokens.AppSummariesRepository,
    );
    uiDataProvider = container.resolve<UiDataProvider>(reportingTokens.UiDataProvider);
  }, 60000);

  afterAll(async () => {
    // Teardown the temporary database
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up any data from previous tests
    await sourcesRepository.deleteSourcesByProject(projectName);
  });

  it("should perform end-to-end UI analysis with JSP files and framework detection", async () => {
    // Arrange: Insert test JSP files and XML config files with UI data
    const testJspFile1: SourceRecord = {
      projectName,
      filename: "home.ts",
      filepath: "webapp/pages/home.ts",
      fileType: "jsp",
      linesCount: 50,
      content: "JSP content with scriptlets",
      summary: {
        purpose: "Home page JSP file with user interface.",
        implementation: "JSP implementation with Java code and HTML markup for home page.",
        jspMetrics: {
          scriptletCount: 8,
          expressionCount: 15,
          declarationCount: 2,
          customTags: [
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
            { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" },
          ],
        },
      },
    };

    const testJspFile2: SourceRecord = {
      projectName,
      filename: "login.ts",
      filepath: "webapp/pages/login.ts",
      fileType: "jsp",
      linesCount: 30,
      content: "Login JSP content",
      summary: {
        purpose: "Login page JSP file for authentication.",
        implementation: "JSP implementation with login form and validation logic.",
        jspMetrics: {
          scriptletCount: 12,
          expressionCount: 5,
          declarationCount: 1,
          customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
        },
      },
    };

    const testJspFile3: SourceRecord = {
      projectName,
      filename: "admin.ts",
      filepath: "webapp/admin/admin.ts",
      fileType: "jsp",
      linesCount: 80,
      content: "Admin panel JSP",
      summary: {
        purpose: "Admin panel JSP file with complex operations.",
        implementation: "JSP implementation with multiple scriptlets and administrative functions.",
        jspMetrics: {
          scriptletCount: 25,
          expressionCount: 10,
          declarationCount: 5,
          customTags: [
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
            { prefix: "custom", uri: "/WEB-INF/custom.tld" },
          ],
        },
      },
    };

    const testWebXml: SourceRecord = {
      projectName,
      filename: "web.xml",
      filepath: "WEB-INF/web.xml",
      fileType: "xml",
      linesCount: 100,
      content: "Web.xml with Struts configuration",
      summary: {
        purpose: "Web application deployment descriptor with Struts framework.",
        implementation: "XML configuration for web application with Struts servlet mappings.",
        uiFramework: {
          name: "Struts",
          version: "1.3",
          configFile: "WEB-INF/web.xml",
        },
      },
    };

    const testStrutsConfig: SourceRecord = {
      projectName,
      filename: "struts-config.xml",
      filepath: "WEB-INF/struts-config.xml",
      fileType: "xml",
      linesCount: 150,
      content: "Struts configuration",
      summary: {
        purpose: "Struts framework configuration with action mappings.",
        implementation: "XML configuration defining Struts action classes and form beans.",
        uiFramework: {
          name: "Struts",
          version: "1.3",
          configFile: "WEB-INF/struts-config.xml",
        },
      },
    };

    // Insert test data
    await sourcesRepository.insertSource(testJspFile1);
    await sourcesRepository.insertSource(testJspFile2);
    await sourcesRepository.insertSource(testJspFile3);
    await sourcesRepository.insertSource(testWebXml);
    await sourcesRepository.insertSource(testStrutsConfig);

    // Act: Run UI analysis aggregation
    const uiAnalysisResult = await uiDataProvider.getUiTechnologyAnalysis(projectName);

    // Assert: Verify the aggregated results
    expect(uiAnalysisResult.totalJspFiles).toBe(3);
    expect(uiAnalysisResult.totalScriptlets).toBe(45); // 8 + 12 + 25
    expect(uiAnalysisResult.totalExpressions).toBe(30); // 15 + 5 + 10
    expect(uiAnalysisResult.totalDeclarations).toBe(8); // 2 + 1 + 5

    // Average scriptlets per file
    expect(uiAnalysisResult.averageScriptletsPerFile).toBeCloseTo(15); // 45 / 3

    // Files with high scriptlet count (>10 total blocks)
    // home: 25 blocks, login: 18 blocks, admin: 40 blocks -> all 3 have >10
    expect(uiAnalysisResult.filesWithHighScriptletCount).toBe(3);

    // Verify frameworks detected
    expect(uiAnalysisResult.frameworks).toHaveLength(1);
    expect(uiAnalysisResult.frameworks[0].name).toBe("Struts");
    expect(uiAnalysisResult.frameworks[0].version).toBe("1.3");
    expect(uiAnalysisResult.frameworks[0].configFiles).toHaveLength(2);
    expect(uiAnalysisResult.frameworks[0].configFiles).toContain("WEB-INF/web.xml");
    expect(uiAnalysisResult.frameworks[0].configFiles).toContain("WEB-INF/struts-config.xml");

    // Verify custom tag libraries de-duplicated and counted
    expect(uiAnalysisResult.customTagLibraries).toHaveLength(3); // c, fmt, custom

    const coreTag = uiAnalysisResult.customTagLibraries.find((t) => t.prefix === "c");
    expect(coreTag).toBeDefined();
    expect(coreTag?.usageCount).toBe(3); // Used in all 3 JSP files

    const fmtTag = uiAnalysisResult.customTagLibraries.find((t) => t.prefix === "fmt");
    expect(fmtTag).toBeDefined();
    expect(fmtTag?.usageCount).toBe(1); // Used only in home.tsp

    const customTag = uiAnalysisResult.customTagLibraries.find((t) => t.prefix === "custom");
    expect(customTag).toBeDefined();
    expect(customTag?.usageCount).toBe(1); // Used only in admin.tsp

    // Verify top scriptlet files
    expect(uiAnalysisResult.topScriptletFiles).toHaveLength(3);
    // Should be sorted by total blocks descending
    expect(uiAnalysisResult.topScriptletFiles[0].filePath).toBe("webapp/admin/admin.ts");
    expect(uiAnalysisResult.topScriptletFiles[0].totalScriptletBlocks).toBe(40); // 25 + 10 + 5
    expect(uiAnalysisResult.topScriptletFiles[1].filePath).toBe("webapp/pages/home.ts");
    expect(uiAnalysisResult.topScriptletFiles[1].totalScriptletBlocks).toBe(25); // 8 + 15 + 2
    expect(uiAnalysisResult.topScriptletFiles[2].filePath).toBe("webapp/pages/login.ts");
    expect(uiAnalysisResult.topScriptletFiles[2].totalScriptletBlocks).toBe(18); // 12 + 5 + 1
  });

  it("should handle projects with no JSP files", async () => {
    // Arrange: Insert only Java files
    const testJavaFile: SourceRecord = {
      projectName,
      filename: "Main.java",
      filepath: "src/Main.java",
      fileType: "java",
      linesCount: 20,
      content: "Java content",
      summary: {
        purpose: "Main application class for Java program.",
        implementation: "Java implementation of main entry point.",
      },
    };

    await sourcesRepository.insertSource(testJavaFile);

    // Act
    const result = await uiDataProvider.getUiTechnologyAnalysis(projectName);

    // Assert: Should return empty/zero results
    expect(result.totalJspFiles).toBe(0);
    expect(result.totalScriptlets).toBe(0);
    expect(result.frameworks).toHaveLength(0);
    expect(result.customTagLibraries).toHaveLength(0);
    expect(result.topScriptletFiles).toHaveLength(0);
  });

  it("should handle multiple different UI frameworks", async () => {
    // Arrange: Insert config files for different frameworks
    const strutsConfig: SourceRecord = {
      projectName,
      filename: "web.xml",
      filepath: "WEB-INF/web.xml",
      fileType: "xml",
      linesCount: 50,
      content: "Struts config",
      summary: {
        purpose: "Web.xml with Struts configuration.",
        implementation: "Deployment descriptor with Struts servlet.",
        uiFramework: {
          name: "Struts",
          version: "2.5",
          configFile: "WEB-INF/web.xml",
        },
      },
    };

    const jsfConfig: SourceRecord = {
      projectName,
      filename: "faces-config.xml",
      filepath: "WEB-INF/faces-config.xml",
      fileType: "xml",
      linesCount: 80,
      content: "JSF config",
      summary: {
        purpose: "JSF configuration file for faces servlet.",
        implementation: "Configuration for JSF managed beans and navigation.",
        uiFramework: {
          name: "JSF",
          version: "2.2",
          configFile: "WEB-INF/faces-config.xml",
        },
      },
    };

    await sourcesRepository.insertSource(strutsConfig);
    await sourcesRepository.insertSource(jsfConfig);

    // Act
    const result = await uiDataProvider.getUiTechnologyAnalysis(projectName);

    // Assert
    expect(result.frameworks).toHaveLength(2);
    expect(result.frameworks.find((f) => f.name === "Struts")).toBeDefined();
    expect(result.frameworks.find((f) => f.name === "JSF")).toBeDefined();
  });

  it("should store and retrieve UI analysis in app summary", async () => {
    // Arrange: Insert test data
    const testJspFile: SourceRecord = {
      projectName,
      filename: "test.ts",
      filepath: "test.ts",
      fileType: "jsp",
      linesCount: 20,
      content: "Test JSP",
      summary: {
        purpose: "Test JSP file for UI analysis integration test.",
        implementation: "JSP implementation with scriptlets for testing.",
        jspMetrics: {
          scriptletCount: 5,
          expressionCount: 3,
          declarationCount: 0,
          customTags: [],
        },
      },
    };

    await sourcesRepository.insertSource(testJspFile);

    // Create app summary
    await appSummaryRepository.createOrReplaceAppSummary({
      projectName,
      llmProvider: "test-provider",
    });

    // Act: Run data provider
    const uiData = await uiDataProvider.getUiTechnologyAnalysis(projectName);

    // Assert: Verify data provider results
    expect(uiData).toBeDefined();
    expect(uiData.totalJspFiles).toBe(1);
    expect(uiData.totalScriptlets).toBe(5);
    expect(uiData.totalExpressions).toBe(3);
    expect(uiData.topScriptletFiles).toHaveLength(1);
    expect(uiData.topScriptletFiles[0].filePath).toBe("test.ts");
  });
});
