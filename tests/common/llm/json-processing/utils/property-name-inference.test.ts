/**
 * Tests for the property name inference utilities.
 */

import {
  inferPropertyName,
  isKnownProperty,
} from "../../../../../src/common/llm/json-processing/utils/property-name-inference";

describe("property-name-inference", () => {
  describe("inferPropertyName", () => {
    describe("with known properties from schema", () => {
      const knownProperties = ["name", "type", "value", "description", "namespace"];

      it("should match exact property names", () => {
        expect(inferPropertyName("name", knownProperties)).toBe("name");
        expect(inferPropertyName("type", knownProperties)).toBe("type");
      });

      it("should match prefix of known properties", () => {
        expect(inferPropertyName("desc", knownProperties)).toBe("description");
        expect(inferPropertyName("names", knownProperties)).toBe("namespace");
      });

      it("should match suffix of known properties (truncated starts)", () => {
        expect(inferPropertyName("ription", knownProperties)).toBe("description");
        expect(inferPropertyName("space", knownProperties)).toBe("namespace");
      });

      it("should use fuzzy matching for typos when within distance threshold", () => {
        // "naem" is 1 edit from "name" (swap a and e)
        expect(inferPropertyName("naem", knownProperties)).toBe("name");
        // "tyep" is 2 edits from "type" (swap y and p), may not match within default threshold
        // Falls back to default "name" when no close match found
        expect(inferPropertyName("tyep", knownProperties)).toBe("name");
      });

      it("should prefer schema matches over common patterns", () => {
        const customSchema = ["namespace", "naturalKey"];
        expect(inferPropertyName("na", customSchema)).toBe("namespace");
      });
    });

    describe("without schema (common patterns)", () => {
      it("should infer from common short fragments", () => {
        expect(inferPropertyName("na")).toBe("name");
        expect(inferPropertyName("ty")).toBe("type");
        expect(inferPropertyName("va")).toBe("value");
        expect(inferPropertyName("n")).toBe("name");
      });

      it("should return 'name' for unknown fragments", () => {
        expect(inferPropertyName("xyz")).toBe("name");
        expect(inferPropertyName("foo")).toBe("name");
        expect(inferPropertyName("qw")).toBe("name");
      });

      it("should handle empty fragment", () => {
        expect(inferPropertyName("")).toBe("name");
      });
    });

    describe("edge cases", () => {
      it("should handle empty known properties array", () => {
        expect(inferPropertyName("na", [])).toBe("name");
      });

      it("should handle undefined known properties", () => {
        expect(inferPropertyName("na", undefined)).toBe("name");
      });

      it("should be case-insensitive when matching", () => {
        const knownProperties = ["Name", "TYPE", "Value"];
        expect(inferPropertyName("name", knownProperties)).toBe("Name");
        expect(inferPropertyName("TYPE", knownProperties)).toBe("TYPE");
      });
    });
  });

  describe("isKnownProperty", () => {
    describe("with known properties from schema", () => {
      const knownProperties = ["userId", "email", "createdAt"];

      it("should return true for exact matches", () => {
        expect(isKnownProperty("userId", knownProperties)).toBe(true);
        expect(isKnownProperty("email", knownProperties)).toBe(true);
        expect(isKnownProperty("createdAt", knownProperties)).toBe(true);
      });

      it("should return true for case-insensitive matches", () => {
        expect(isKnownProperty("USERID", knownProperties)).toBe(true);
        expect(isKnownProperty("Email", knownProperties)).toBe(true);
        expect(isKnownProperty("createdat", knownProperties)).toBe(true);
      });

      it("should return false for unknown properties", () => {
        expect(isKnownProperty("foo", knownProperties)).toBe(false);
        expect(isKnownProperty("bar", knownProperties)).toBe(false);
        expect(isKnownProperty("unknown", knownProperties)).toBe(false);
      });
    });

    describe("without schema (common property names)", () => {
      it("should return true for common property names", () => {
        expect(isKnownProperty("name")).toBe(true);
        expect(isKnownProperty("type")).toBe(true);
        expect(isKnownProperty("value")).toBe(true);
        expect(isKnownProperty("id")).toBe(true);
        expect(isKnownProperty("key")).toBe(true);
        expect(isKnownProperty("kind")).toBe(true);
        expect(isKnownProperty("text")).toBe(true);
        expect(isKnownProperty("purpose")).toBe(true);
      });

      it("should be case-insensitive for common properties", () => {
        expect(isKnownProperty("NAME")).toBe(true);
        expect(isKnownProperty("Type")).toBe(true);
        expect(isKnownProperty("VALUE")).toBe(true);
      });

      it("should return false for non-common properties", () => {
        expect(isKnownProperty("foo")).toBe(false);
        expect(isKnownProperty("bar")).toBe(false);
        expect(isKnownProperty("customProperty")).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle empty known properties array", () => {
        // Falls back to common property names
        expect(isKnownProperty("name", [])).toBe(true);
        expect(isKnownProperty("foo", [])).toBe(false);
      });

      it("should handle undefined known properties", () => {
        // Falls back to common property names
        expect(isKnownProperty("name", undefined)).toBe(true);
        expect(isKnownProperty("foo", undefined)).toBe(false);
      });

      it("should handle empty property name", () => {
        expect(isKnownProperty("")).toBe(false);
        expect(isKnownProperty("", ["name", "type"])).toBe(false);
      });
    });
  });
});
