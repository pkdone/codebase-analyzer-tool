/**
 * Tests for the base integration schema extension behavior.
 * Verifies that both databaseIntegrationSchema and integrationEndpointSchema
 * properly extend the shared baseIntegrationSchema with their specific fields.
 */

import { describe, it, expect } from "@jest/globals";
import {
  databaseIntegrationSchema,
  integrationEndpointSchema,
} from "../../../src/app/schemas/source-file.schema";

describe("baseIntegrationSchema extension", () => {
  describe("databaseIntegrationSchema", () => {
    it("should have base schema fields: name, description, protocol, connectionInfo", () => {
      const validData = {
        mechanism: "JDBC",
        name: "UserDatabase",
        description: "Database for user data",
        protocol: "PostgreSQL 15",
        connectionInfo: "jdbc:postgresql://localhost:5432/users",
        codeExample: "n/a",
      };

      const result = databaseIntegrationSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe("UserDatabase");
        expect(result.data.description).toBe("Database for user data");
        expect(result.data.protocol).toBe("PostgreSQL 15");
        expect(result.data.connectionInfo).toBe("jdbc:postgresql://localhost:5432/users");
      }
    });

    it("should have database-specific fields", () => {
      const validData = {
        mechanism: "HIBERNATE",
        description: "ORM-based data access",
        databaseName: "app_database",
        tablesAccessed: ["users", "orders", "products"],
        operationType: ["READ", "WRITE"],
        queryPatterns: "JPQL queries",
        transactionHandling: "Spring @Transactional",
        codeExample: "entityManager.find(User.class, id)",
      };

      const result = databaseIntegrationSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.databaseName).toBe("app_database");
        expect(result.data.tablesAccessed).toEqual(["users", "orders", "products"]);
        expect(result.data.queryPatterns).toBe("JPQL queries");
        expect(result.data.transactionHandling).toBe("Spring @Transactional");
        expect(result.data.codeExample).toBe("entityManager.find(User.class, id)");
      }
    });

    it("should require mechanism, description, and codeExample", () => {
      const invalidData = {
        name: "TestDB",
      };

      const result = databaseIntegrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should allow optional name field", () => {
      const validData = {
        mechanism: "JDBC",
        description: "Database access",
        codeExample: "n/a",
        // name is intentionally omitted
      };

      const result = databaseIntegrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("integrationEndpointSchema", () => {
    it("should have base schema fields: name, description, protocol, connectionInfo", () => {
      const validData = {
        mechanism: "REST",
        name: "UserAPI",
        description: "REST API for user management",
        protocol: "HTTP/1.1",
        connectionInfo: "https://api.example.com",
      };

      const result = integrationEndpointSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe("UserAPI");
        expect(result.data.description).toBe("REST API for user management");
        expect(result.data.protocol).toBe("HTTP/1.1");
        expect(result.data.connectionInfo).toBe("https://api.example.com");
      }
    });

    it("should have endpoint-specific fields", () => {
      const validData = {
        mechanism: "REST",
        name: "GetUser",
        description: "Retrieves user by ID",
        path: "/api/users/{id}",
        method: "GET",
        requestBody: "None",
        responseBody: "{ id, name, email }",
        authentication: "JWT Bearer token",
      };

      const result = integrationEndpointSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.path).toBe("/api/users/{id}");
        expect(result.data.method).toBe("GET");
        expect(result.data.responseBody).toBe("{ id, name, email }");
        expect(result.data.authentication).toBe("JWT Bearer token");
      }
    });

    it("should have messaging-specific fields", () => {
      const validData = {
        mechanism: "KAFKA-TOPIC",
        name: "OrderEvents",
        description: "Publishes order events",
        queueOrTopicName: "orders-topic",
        messageType: "OrderCreatedEvent",
        direction: "PRODUCER",
      };

      const result = integrationEndpointSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.queueOrTopicName).toBe("orders-topic");
        expect(result.data.messageType).toBe("OrderCreatedEvent");
        expect(result.data.direction).toBe("PRODUCER");
      }
    });

    it("should require mechanism field", () => {
      const invalidData = {
        name: "TestEndpoint",
        description: "Test",
      };

      const result = integrationEndpointSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should use default values for name and description when not provided", () => {
      const minimalData = {
        mechanism: "REST",
      };

      const result = integrationEndpointSchema.safeParse(minimalData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe("");
        expect(result.data.description).toBe("");
      }
    });
  });

  describe("schema consistency", () => {
    it("both schemas should accept protocol field with string value", () => {
      const dbData = {
        mechanism: "JDBC",
        description: "test",
        protocol: "PostgreSQL 15",
        codeExample: "n/a",
      };

      const endpointData = {
        mechanism: "REST",
        protocol: "HTTP/2",
      };

      const dbResult = databaseIntegrationSchema.safeParse(dbData);
      const endpointResult = integrationEndpointSchema.safeParse(endpointData);

      expect(dbResult.success).toBe(true);
      expect(endpointResult.success).toBe(true);

      if (dbResult.success && endpointResult.success) {
        expect(dbResult.data.protocol).toBe("PostgreSQL 15");
        expect(endpointResult.data.protocol).toBe("HTTP/2");
      }
    });

    it("both schemas should accept connectionInfo field with string value", () => {
      const dbData = {
        mechanism: "JDBC",
        description: "test",
        connectionInfo: "jdbc:mysql://localhost:3306/db",
        codeExample: "n/a",
      };

      const endpointData = {
        mechanism: "SOAP",
        connectionInfo: "https://example.com/service?wsdl",
      };

      const dbResult = databaseIntegrationSchema.safeParse(dbData);
      const endpointResult = integrationEndpointSchema.safeParse(endpointData);

      expect(dbResult.success).toBe(true);
      expect(endpointResult.success).toBe(true);

      if (dbResult.success && endpointResult.success) {
        expect(dbResult.data.connectionInfo).toBe("jdbc:mysql://localhost:3306/db");
        expect(endpointResult.data.connectionInfo).toBe("https://example.com/service?wsdl");
      }
    });

    it("both schemas should pass through unknown properties", () => {
      const dbData = {
        mechanism: "JDBC",
        description: "test",
        codeExample: "n/a",
        unknownField: "should pass through",
      };

      const endpointData = {
        mechanism: "REST",
        customProperty: { nested: "value" },
      };

      const dbResult = databaseIntegrationSchema.safeParse(dbData);
      const endpointResult = integrationEndpointSchema.safeParse(endpointData);

      expect(dbResult.success).toBe(true);
      expect(endpointResult.success).toBe(true);

      if (dbResult.success && endpointResult.success) {
        expect((dbResult.data as Record<string, unknown>).unknownField).toBe("should pass through");
        expect((endpointResult.data as Record<string, unknown>).customProperty).toEqual({
          nested: "value",
        });
      }
    });
  });
});
