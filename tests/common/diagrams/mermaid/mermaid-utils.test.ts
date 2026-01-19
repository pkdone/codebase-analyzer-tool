/**
 * Tests for the mermaid-utils in the common module.
 */

import {
  escapeMermaidLabel,
  generateNodeId,
  buildArrow,
  applyStyleClass,
} from "../../../../src/common/diagrams/mermaid";

describe("escapeMermaidLabel", () => {
  it("should escape double quotes", () => {
    expect(escapeMermaidLabel('Hello "World"')).toBe("Hello #quot;World#quot;");
  });

  it("should escape angle brackets", () => {
    expect(escapeMermaidLabel("<div>content</div>")).toBe("#lt;div#gt;content#lt;/div#gt;");
  });

  it("should escape square brackets", () => {
    expect(escapeMermaidLabel("[array]")).toBe("#91;array#93;");
  });

  it("should escape parentheses", () => {
    expect(escapeMermaidLabel("function(arg)")).toBe("function#40;arg#41;");
  });

  it("should escape curly braces", () => {
    expect(escapeMermaidLabel("{object}")).toBe("#123;object#125;");
  });

  it("should escape multiple special characters", () => {
    expect(escapeMermaidLabel('<a href="url">[link]')).toBe(
      "#lt;a href=#quot;url#quot;#gt;#91;link#93;",
    );
  });

  it("should return text unchanged if no special characters", () => {
    expect(escapeMermaidLabel("Normal text")).toBe("Normal text");
  });
});

describe("generateNodeId", () => {
  it("should create a basic node ID from text", () => {
    expect(generateNodeId("UserService", 0)).toBe("userservice_0");
  });

  it("should replace special characters with underscores", () => {
    expect(generateNodeId("User-Service", 1)).toBe("user_service_1");
  });

  it("should collapse multiple underscores", () => {
    expect(generateNodeId("User  Service", 2)).toBe("user_service_2");
  });

  it("should remove leading and trailing underscores", () => {
    expect(generateNodeId("_User_", 3)).toBe("user_3");
  });

  it("should handle complex strings", () => {
    expect(generateNodeId("User & Auth Service (v2)", 5)).toBe("user_auth_service_v2_5");
  });

  it("should convert to lowercase", () => {
    expect(generateNodeId("UserService", 0)).toBe("userservice_0");
  });
});

describe("buildArrow", () => {
  it("should create a simple arrow between nodes", () => {
    expect(buildArrow("nodeA", "nodeB")).toBe("    nodeA --> nodeB");
  });

  it("should create a labeled arrow", () => {
    expect(buildArrow("nodeA", "nodeB", "connects")).toBe('    nodeA -->|"connects"| nodeB');
  });

  it("should escape special characters in labels", () => {
    expect(buildArrow("nodeA", "nodeB", "<uses>")).toBe('    nodeA -->|"#lt;uses#gt;"| nodeB');
  });
});

describe("applyStyleClass", () => {
  it("should create a class style application", () => {
    expect(applyStyleClass("nodeA", "service")).toBe("    class nodeA service");
  });
});
