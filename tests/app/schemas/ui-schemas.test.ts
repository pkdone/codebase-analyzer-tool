import { z } from "zod";
import {
  customTagSchema,
  jspMetricsSchema,
  uiFrameworkSchema,
  sourceSummarySchema,
} from "../../../src/app/schemas/sources.schema";

describe("Custom Tag Schema", () => {
  it("should validate a valid custom tag", () => {
    const testData = {
      prefix: "c",
      uri: "http://java.sun.com/jsp/jstl/core",
    };

    const result = customTagSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prefix).toBe("c");
      expect(result.data.uri).toBe("http://java.sun.com/jsp/jstl/core");
    }
  });

  it("should fail when prefix is missing", () => {
    const testData = {
      uri: "http://java.sun.com/jsp/jstl/core",
    };

    const result = customTagSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should fail when uri is missing", () => {
    const testData = {
      prefix: "c",
    };

    const result = customTagSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should validate custom tag library with relative path", () => {
    const testData = {
      prefix: "custom",
      uri: "/WEB-INF/custom.tld",
    };

    const result = customTagSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prefix).toBe("custom");
      expect(result.data.uri).toBe("/WEB-INF/custom.tld");
    }
  });
});

describe("JSP Metrics Schema", () => {
  it("should validate complete JSP metrics", () => {
    const testData = {
      scriptletCount: 5,
      expressionCount: 10,
      declarationCount: 2,
      customTags: [
        { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
        { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" },
      ],
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scriptletCount).toBe(5);
      expect(result.data.expressionCount).toBe(10);
      expect(result.data.declarationCount).toBe(2);
      expect(result.data.customTags).toHaveLength(2);
      expect(result.data.customTags?.[0].prefix).toBe("c");
      expect(result.data.customTags?.[1].prefix).toBe("fmt");
    }
  });

  it("should validate JSP metrics without custom tags", () => {
    const testData = {
      scriptletCount: 0,
      expressionCount: 0,
      declarationCount: 0,
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scriptletCount).toBe(0);
      expect(result.data.expressionCount).toBe(0);
      expect(result.data.declarationCount).toBe(0);
      expect(result.data.customTags).toBeUndefined();
    }
  });

  it("should validate JSP metrics with empty custom tags array", () => {
    const testData = {
      scriptletCount: 3,
      expressionCount: 5,
      declarationCount: 1,
      customTags: [],
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customTags).toEqual([]);
    }
  });

  it("should fail when scriptletCount is missing", () => {
    const testData = {
      expressionCount: 5,
      declarationCount: 1,
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should fail when expressionCount is missing", () => {
    const testData = {
      scriptletCount: 5,
      declarationCount: 1,
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should fail when declarationCount is missing", () => {
    const testData = {
      scriptletCount: 5,
      expressionCount: 10,
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should fail when counts are not numbers", () => {
    const testData = {
      scriptletCount: "5",
      expressionCount: "10",
      declarationCount: "2",
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should validate JSP metrics with multiple custom tags", () => {
    const testData = {
      scriptletCount: 0,
      expressionCount: 0,
      declarationCount: 0,
      customTags: [
        { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
        { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" },
        { prefix: "fn", uri: "http://java.sun.com/jsp/jstl/functions" },
        { prefix: "custom", uri: "/WEB-INF/custom.tld" },
      ],
    };

    const result = jspMetricsSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customTags).toHaveLength(4);
    }
  });
});

describe("UI Framework Schema", () => {
  it("should validate UI framework with version", () => {
    const testData = {
      name: "Struts",
      version: "1.3",
      configFile: "WEB-INF/web.xml",
    };

    const result = uiFrameworkSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Struts");
      expect(result.data.version).toBe("1.3");
      expect(result.data.configFile).toBe("WEB-INF/web.xml");
    }
  });

  it("should validate UI framework without version", () => {
    const testData = {
      name: "Spring MVC",
      configFile: "WEB-INF/spring-servlet.xml",
    };

    const result = uiFrameworkSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Spring MVC");
      expect(result.data.version).toBeUndefined();
      expect(result.data.configFile).toBe("WEB-INF/spring-servlet.xml");
    }
  });

  it("should fail when name is missing", () => {
    const testData = {
      version: "2.2",
      configFile: "WEB-INF/faces-config.xml",
    };

    const result = uiFrameworkSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should fail when configFile is missing", () => {
    const testData = {
      name: "JSF",
      version: "2.2",
    };

    const result = uiFrameworkSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should validate various framework names", () => {
    const frameworks = ["Struts", "JSF", "Spring MVC", "Struts 2", "Wicket", "Tapestry"];

    frameworks.forEach((name) => {
      const testData = {
        name,
        configFile: "WEB-INF/web.xml",
      };

      const result = uiFrameworkSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(name);
      }
    });
  });

  it("should validate various version formats", () => {
    const versions = ["1.0", "2.5.1", "3.0.0", "1.x", "latest"];

    versions.forEach((version) => {
      const testData = {
        name: "TestFramework",
        version,
        configFile: "config.xml",
      };

      const result = uiFrameworkSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(version);
      }
    });
  });
});

describe("Source Summary Schema - JSP Metrics Field", () => {
  it("should accept jspMetrics in sourceSummarySchema", () => {
    const testData = {
      purpose: "Test JSP file purpose with detailed explanation.",
      implementation: "Test JSP file implementation details and business logic.",
      jspMetrics: {
        scriptletCount: 5,
        expressionCount: 10,
        declarationCount: 2,
        customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
      },
    };

    const result = sourceSummarySchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jspMetrics).toBeDefined();
      expect(result.data.jspMetrics?.scriptletCount).toBe(5);
      expect(result.data.jspMetrics?.expressionCount).toBe(10);
      expect(result.data.jspMetrics?.declarationCount).toBe(2);
      expect(result.data.jspMetrics?.customTags).toHaveLength(1);
    }
  });

  it("should make jspMetrics optional", () => {
    const testData = {
      purpose: "Test file purpose with detailed explanation.",
      implementation: "Test file implementation details and business logic.",
    };

    const result = sourceSummarySchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jspMetrics).toBeUndefined();
    }
  });

  it("should support picking jspMetrics field", () => {
    const pickedSchema = sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      jspMetrics: true,
    });

    const testData = {
      purpose: "Test JSP purpose with detailed explanation.",
      implementation: "Test JSP implementation details and business logic.",
      jspMetrics: {
        scriptletCount: 3,
        expressionCount: 7,
        declarationCount: 0,
      },
    };

    const result = pickedSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jspMetrics).toBeDefined();
      expect(result.data.jspMetrics?.scriptletCount).toBe(3);
    }
  });
});

describe("Source Summary Schema - UI Framework Field", () => {
  it("should accept uiFramework in sourceSummarySchema", () => {
    const testData = {
      purpose: "Test XML configuration file purpose with detailed explanation.",
      implementation: "Test XML configuration implementation details and business logic.",
      uiFramework: {
        name: "Struts",
        version: "1.3",
        configFile: "WEB-INF/struts-config.xml",
      },
    };

    const result = sourceSummarySchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uiFramework).toBeDefined();
      expect(result.data.uiFramework?.name).toBe("Struts");
      expect(result.data.uiFramework?.version).toBe("1.3");
      expect(result.data.uiFramework?.configFile).toBe("WEB-INF/struts-config.xml");
    }
  });

  it("should make uiFramework optional", () => {
    const testData = {
      purpose: "Test file purpose with detailed explanation.",
      implementation: "Test file implementation details and business logic.",
    };

    const result = sourceSummarySchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uiFramework).toBeUndefined();
    }
  });

  it("should support picking uiFramework field", () => {
    const pickedSchema = sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      uiFramework: true,
    });

    const testData = {
      purpose: "Test XML purpose with detailed explanation.",
      implementation: "Test XML implementation details and business logic.",
      uiFramework: {
        name: "JSF",
        version: "2.2",
        configFile: "WEB-INF/faces-config.xml",
      },
    };

    const result = pickedSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uiFramework).toBeDefined();
      expect(result.data.uiFramework?.name).toBe("JSF");
    }
  });
});

describe("Source Summary Schema - Both UI Fields Together", () => {
  it("should accept both jspMetrics and uiFramework together", () => {
    const testData = {
      purpose: "Test comprehensive UI analysis with detailed explanation.",
      implementation: "Test implementation details with both JSP and framework analysis.",
      jspMetrics: {
        scriptletCount: 5,
        expressionCount: 10,
        declarationCount: 2,
        customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
      },
      uiFramework: {
        name: "Struts",
        version: "1.3",
        configFile: "WEB-INF/web.xml",
      },
    };

    const result = sourceSummarySchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jspMetrics).toBeDefined();
      expect(result.data.uiFramework).toBeDefined();
      expect(result.data.jspMetrics?.scriptletCount).toBe(5);
      expect(result.data.uiFramework?.name).toBe("Struts");
    }
  });

  it("should support picking both fields together", () => {
    const pickedSchema = sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      jspMetrics: true,
      uiFramework: true,
    });

    const testData = {
      purpose: "Test purpose with detailed explanation.",
      implementation: "Test implementation details and business logic.",
      jspMetrics: {
        scriptletCount: 0,
        expressionCount: 0,
        declarationCount: 0,
      },
      uiFramework: {
        name: "Spring MVC",
        configFile: "spring-servlet.xml",
      },
    };

    const result = pickedSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jspMetrics).toBeDefined();
      expect(result.data.uiFramework).toBeDefined();
    }
  });
});

describe("TypeScript Type Inference - UI Schemas", () => {
  it("should infer correct types for JSP metrics", () => {
    type JspMetrics = z.infer<typeof jspMetricsSchema>;

    const metrics: JspMetrics = {
      scriptletCount: 5,
      expressionCount: 10,
      declarationCount: 2,
      customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
    };

    // Type assertions to ensure the fields exist with correct types
    const scriptletCount: number = metrics.scriptletCount;
    const expressionCount: number = metrics.expressionCount;
    const declarationCount: number = metrics.declarationCount;
    const customTags: { prefix: string; uri: string }[] | undefined = metrics.customTags;

    expect(scriptletCount).toBe(5);
    expect(expressionCount).toBe(10);
    expect(declarationCount).toBe(2);
    expect(customTags).toHaveLength(1);
  });

  it("should infer correct types for UI framework", () => {
    type UiFramework = z.infer<typeof uiFrameworkSchema>;

    const framework: UiFramework = {
      name: "Struts",
      version: "1.3",
      configFile: "WEB-INF/web.xml",
    };

    // Type assertions
    const name: string = framework.name;
    const version: string | undefined = framework.version;
    const configFile: string = framework.configFile;

    expect(name).toBe("Struts");
    expect(version).toBe("1.3");
    expect(configFile).toBe("WEB-INF/web.xml");
  });
});
