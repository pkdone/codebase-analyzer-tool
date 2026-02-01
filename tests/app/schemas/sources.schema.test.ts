import { dependencySchema } from "../../../src/app/schemas/source-file.schema";

describe("dependencySchema", () => {
  describe("version field", () => {
    it("should accept dependency with version", () => {
      const validDependency = {
        name: "spring-core",
        groupId: "org.springframework",
        version: "5.3.9",
        scope: "compile",
        type: "jar",
      };

      const result = dependencySchema.safeParse(validDependency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe("5.3.9");
      }
    });

    it("should accept dependency without version (optional field)", () => {
      const dependencyWithoutVersion = {
        name: "j2ee.jar",
        groupId: "javax.j2ee",
        scope: "compile",
        type: "jar",
      };

      const result = dependencySchema.safeParse(dependencyWithoutVersion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBeUndefined();
      }
    });

    it("should accept dependency with null version (converted to undefined by convertNullToUndefined)", () => {
      const dependencyWithNullVersion = {
        name: "j2ee.jar",
        groupId: "javax.j2ee",
        version: null,
        scope: "compile",
        type: "jar",
      };

      const result = dependencySchema.safeParse(dependencyWithNullVersion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBeNull(); // Zod preserves null values
      }
    });

    it("should reject dependency with invalid version type", () => {
      const invalidDependency = {
        name: "spring-core",
        groupId: "org.springframework",
        version: 123, // number instead of string
        scope: "compile",
        type: "jar",
      };

      const result = dependencySchema.safeParse(invalidDependency);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["version"]);
        expect(result.error.issues[0].code).toBe("invalid_type");
      }
    });

    it("should accept minimal dependency with only required fields", () => {
      const minimalDependency = {
        name: "some-library",
      };

      const result = dependencySchema.safeParse(minimalDependency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("some-library");
        expect(result.data.version).toBeUndefined();
        expect(result.data.groupId).toBeUndefined();
        expect(result.data.scope).toBeUndefined();
        expect(result.data.type).toBeUndefined();
      }
    });
  });

  describe("integration with convertNullToUndefined transform", () => {
    it("should work with convertNullToUndefined transform for null version", () => {
      // Simulate the convertNullToUndefined transform behavior
      function convertNullToUndefined(value: unknown): unknown {
        if (value === null) return undefined;
        if (typeof value !== "object") return value;
        if (Array.isArray(value)) {
          return value.map(convertNullToUndefined);
        }
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          const converted = convertNullToUndefined(val);
          if (converted !== undefined) {
            result[key] = converted;
          }
        }
        return result;
      }

      const dependencyWithNullVersion = {
        name: "j2ee.jar",
        groupId: "javax.j2ee",
        version: null,
        scope: "compile",
        type: "jar",
      };

      const transformed = convertNullToUndefined(
        dependencyWithNullVersion,
      ) as typeof dependencyWithNullVersion;
      const result = dependencySchema.safeParse(transformed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBeUndefined();
        expect(result.data.name).toBe("j2ee.jar");
      }
    });
  });

  describe("real-world scenarios", () => {
    it("should handle Ant build.xml dependency format", () => {
      const antDependency = {
        name: "j2ee.jar",
        groupId: "javax.j2ee",
        // version not specified in Ant build files
        scope: "compile",
        type: "jar",
      };

      const result = dependencySchema.safeParse(antDependency);
      expect(result.success).toBe(true);
    });

    it("should handle Maven POM dependency format", () => {
      const mavenDependency = {
        name: "spring-core",
        groupId: "org.springframework",
        version: "5.3.9",
        scope: "compile",
        type: "jar",
      };

      const result = dependencySchema.safeParse(mavenDependency);
      expect(result.success).toBe(true);
    });

    it("should handle npm package.json dependency format", () => {
      const npmDependency = {
        name: "lodash",
        version: "4.17.21",
        scope: "compile",
      };

      const result = dependencySchema.safeParse(npmDependency);
      expect(result.success).toBe(true);
    });
  });
});
