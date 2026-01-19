import { executeRules } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { JAVA_SPECIFIC_RULES } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/java-specific-rules";

describe("JAVA_SPECIFIC_RULES", () => {
  describe("javaPackageInJson", () => {
    it("should remove Java package declaration between JSON elements", () => {
      const input = `{
  "name": "TestClass",
  "references": [
    "com.example.Class"
  ],
package com.example.test;
  "otherProp": []
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("package com.example.test");
      expect(result.content).toContain('"otherProp": []');
    });

    it("should handle package declarations with multiple levels", () => {
      const input = `{
  "items": []
],
package org.apache.commons.lang3.text;
  "nextProp": "value"
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("package org.apache");
    });
  });

  describe("javaImportInJson", () => {
    it("should remove single Java import statement", () => {
      const input = `{
  "name": "Test"
],
import java.util.List;
  "items": []
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("import java.util.List");
      expect(result.content).toContain('"items": []');
    });

    it("should remove multiple consecutive Java import statements", () => {
      const input = `{
  "name": "Test"
],
import java.util.List;
import java.util.Map;
import java.io.IOException;
  "items": []
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("import java.util.List");
      expect(result.content).not.toContain("import java.util.Map");
      expect(result.content).not.toContain("import java.io.IOException");
    });
  });

  describe("javaPackageAfterJson", () => {
    it("should remove package declaration after closing brace", () => {
      const input = `{
  "name": "Test"
}
package com.example;`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("package com.example");
      expect(result.content.trim()).toMatch(/}$/);
    });

    it("should remove package declaration with following code", () => {
      const input = `{
  "name": "Test"
}
package com.example;

public class MyClass {
  // class content
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("package");
      expect(result.content).not.toContain("class MyClass");
    });
  });

  describe("javaImportAfterJson", () => {
    it("should remove import statements after closing brace", () => {
      const input = `{
  "name": "Test"
}
import java.util.List;`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("import java.util.List");
      expect(result.content.trim()).toMatch(/}$/);
    });
  });

  describe("javaClassAfterJson", () => {
    it("should remove public class definition after JSON", () => {
      const input = `{
  "name": "Test"
}
public class MyClass {
  private String name;
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("public class");
      expect(result.content).not.toContain("MyClass");
    });

    it("should remove interface definition after JSON", () => {
      const input = `{
  "name": "Test"
}
public interface MyInterface {
  void doSomething();
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("interface");
    });

    it("should remove enum definition after JSON", () => {
      const input = `{
  "name": "Test"
}
public enum Status {
  ACTIVE, INACTIVE
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("enum");
    });

    it("should handle private and protected modifiers", () => {
      const input = `{
  "name": "Test"
}
private class InnerClass {
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("private class");
    });
  });

  describe("integration", () => {
    it("should produce valid JSON after removing Java artifacts", () => {
      const input = `{
  "name": "TestClass",
  "purpose": "Test class for something"
}
package com.example;

import java.util.List;

public class TestClass {
  private List<String> items;
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.name).toBe("TestClass");
      expect(parsed.purpose).toBe("Test class for something");
    });

    it("should not modify valid JSON without Java artifacts", () => {
      const input = `{
  "name": "Test",
  "items": ["a", "b", "c"]
}`;
      const result = executeRules(input, JAVA_SPECIFIC_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });
});
