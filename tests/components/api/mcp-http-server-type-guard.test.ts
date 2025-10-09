import "reflect-metadata";

/**
 * Tests for the JSON-RPC body type guard in the MCP HTTP server.
 * This validates the type-safe approach to checking for JSON-RPC id fields.
 */

/**
 * Type guard to check if an unknown value is a JSON-RPC body with an id field.
 * This is extracted from the mcp-http-server for testing purposes.
 */
function isJsonRpcBody(body: unknown): body is { id: string | number | null } {
  return typeof body === "object" && body !== null && !Array.isArray(body) && "id" in body;
}

describe("MCP HTTP Server - isJsonRpcBody type guard", () => {
  describe("valid JSON-RPC bodies", () => {
    it("should return true for object with string id", () => {
      const body = { id: "request-123", method: "initialize" };
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should return true for object with numeric id", () => {
      const body = { id: 42, method: "tools/list" };
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should return true for object with null id", () => {
      const body = { id: null, method: "notification" };
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should return true for object with id and additional properties", () => {
      const body = {
        jsonrpc: "2.0",
        id: "req-456",
        method: "tools/call",
        params: { name: "test" },
      };
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should return true for object with id of zero", () => {
      const body = { id: 0, method: "test" };
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should return true for object with empty string id", () => {
      const body = { id: "", method: "test" };
      expect(isJsonRpcBody(body)).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should return false for null", () => {
      expect(isJsonRpcBody(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isJsonRpcBody(undefined)).toBe(false);
    });

    it("should return false for primitive string", () => {
      expect(isJsonRpcBody("test string")).toBe(false);
    });

    it("should return false for primitive number", () => {
      expect(isJsonRpcBody(123)).toBe(false);
    });

    it("should return false for primitive boolean", () => {
      expect(isJsonRpcBody(true)).toBe(false);
    });

    it("should return false for array", () => {
      expect(isJsonRpcBody([1, 2, 3])).toBe(false);
    });

    it("should return false for array with id property", () => {
      const arr = [1, 2, 3];
      (arr as any).id = "test";
      expect(isJsonRpcBody(arr)).toBe(false);
    });

    it("should return false for object without id property", () => {
      const body = { method: "test", params: {} };
      expect(isJsonRpcBody(body)).toBe(false);
    });

    it("should return false for empty object", () => {
      expect(isJsonRpcBody({})).toBe(false);
    });

    it("should return false for function", () => {
      const fn = () => ({ id: "test" });
      expect(isJsonRpcBody(fn)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle objects with id as undefined", () => {
      const body = { id: undefined, method: "test" };
      // id exists as a property but is undefined - type guard should return true
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should handle objects with id as boolean", () => {
      const body = { id: false, method: "test" };
      // id exists but is boolean - type guard returns true (property exists)
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should handle objects with id as object", () => {
      const body = { id: { nested: "value" }, method: "test" };
      // id exists but is object - type guard returns true (property exists)
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should handle objects with id as array", () => {
      const body = { id: [1, 2, 3], method: "test" };
      // id exists but is array - type guard returns true (property exists)
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should handle objects created with Object.create(null)", () => {
      const body = Object.create(null);
      body.id = "test";
      body.method = "test";
      // Should work with objects without prototype
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should handle frozen objects", () => {
      const body = Object.freeze({ id: "frozen-id", method: "test" });
      expect(isJsonRpcBody(body)).toBe(true);
    });

    it("should handle sealed objects", () => {
      const body = Object.seal({ id: "sealed-id", method: "test" });
      expect(isJsonRpcBody(body)).toBe(true);
    });
  });

  describe("type narrowing behavior", () => {
    it("should narrow type correctly for valid bodies", () => {
      const body: unknown = { id: "test-123", method: "initialize" };

      if (isJsonRpcBody(body)) {
        // Type should be narrowed to { id: string | number | null }
        expect(typeof body.id).toBe("string");
        // TypeScript should allow access to id property
        const id: string | number | null = body.id;
        expect(id).toBe("test-123");
      }
    });

    it("should allow conditional id extraction", () => {
      const body: unknown = { id: 42, method: "test" };
      let requestId: string | number | null = null;

      if (isJsonRpcBody(body) && (typeof body.id === "string" || typeof body.id === "number")) {
        requestId = body.id;
      }

      expect(requestId).toBe(42);
    });

    it("should handle null id gracefully", () => {
      const body: unknown = { id: null, method: "notification" };
      let requestId: string | number | null = null;

      if (isJsonRpcBody(body) && (typeof body.id === "string" || typeof body.id === "number")) {
        requestId = body.id;
      }

      // Should remain null since body.id is null (not string or number)
      expect(requestId).toBeNull();
    });

    it("should not extract invalid id types", () => {
      const body: unknown = { id: { nested: "value" }, method: "test" };
      let requestId: string | number | null = null;

      if (isJsonRpcBody(body) && (typeof body.id === "string" || typeof body.id === "number")) {
        requestId = body.id;
      }

      // Should remain null since body.id is an object
      expect(requestId).toBeNull();
    });
  });

  describe("comparison with type assertion approach", () => {
    it("demonstrates type safety advantage over casting", () => {
      const body: unknown = { method: "test" }; // No id property

      // Type guard approach - safe
      if (isJsonRpcBody(body)) {
        // This block won't execute because body doesn't have id
        expect(true).toBe(false); // Should not reach here
      } else {
        expect(true).toBe(true); // Should reach here
      }

      // Type assertion approach would be unsafe:
      // const unsafeBody = body as { id: string | number | null };
      // unsafeBody.id would be undefined at runtime
    });

    it("ensures property existence check before access", () => {
      const validBody: unknown = { id: "valid-123", method: "test" };
      const invalidBody: unknown = { method: "test" };

      // Valid body
      expect(isJsonRpcBody(validBody)).toBe(true);
      if (isJsonRpcBody(validBody)) {
        expect("id" in validBody).toBe(true);
      }

      // Invalid body
      expect(isJsonRpcBody(invalidBody)).toBe(false);
      if (!isJsonRpcBody(invalidBody)) {
        // For unknown types, we need to check if it's an object first
        expect(typeof invalidBody === "object" && invalidBody !== null && "id" in invalidBody).toBe(
          false,
        );
      }
    });
  });
});
