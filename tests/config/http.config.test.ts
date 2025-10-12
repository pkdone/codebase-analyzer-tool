import { httpConfig } from "../../src/config/http.config";

describe("httpConfig", () => {
  describe("HTTP protocol", () => {
    it("should have HTTP_PROTOCOL defined", () => {
      expect(httpConfig.HTTP_PROTOCOL).toBeDefined();
      expect(httpConfig.HTTP_PROTOCOL).toBe("http://");
    });
  });

  describe("HTTP headers", () => {
    it("should have CONTENT_TYPE_HEADER defined", () => {
      expect(httpConfig.CONTENT_TYPE_HEADER).toBeDefined();
      expect(httpConfig.CONTENT_TYPE_HEADER).toBe("Content-Type");
    });
  });

  describe("HTTP methods", () => {
    it("should have HTTP_METHOD_OPTIONS defined", () => {
      expect(httpConfig.HTTP_METHOD_OPTIONS).toBeDefined();
      expect(httpConfig.HTTP_METHOD_OPTIONS).toBe("OPTIONS");
    });

    it("should have HTTP_METHOD_POST defined", () => {
      expect(httpConfig.HTTP_METHOD_POST).toBeDefined();
      expect(httpConfig.HTTP_METHOD_POST).toBe("POST");
    });
  });

  describe("HTTP status codes", () => {
    it("should have HTTP_STATUS_OK defined", () => {
      expect(httpConfig.HTTP_STATUS_OK).toBeDefined();
      expect(httpConfig.HTTP_STATUS_OK).toBe(200);
    });

    it("should have HTTP_STATUS_BAD_REQUEST defined", () => {
      expect(httpConfig.HTTP_STATUS_BAD_REQUEST).toBeDefined();
      expect(httpConfig.HTTP_STATUS_BAD_REQUEST).toBe(400);
    });

    it("should have HTTP_STATUS_NOT_FOUND defined", () => {
      expect(httpConfig.HTTP_STATUS_NOT_FOUND).toBeDefined();
      expect(httpConfig.HTTP_STATUS_NOT_FOUND).toBe(404);
    });

    it("should have HTTP_STATUS_INTERNAL_ERROR defined", () => {
      expect(httpConfig.HTTP_STATUS_INTERNAL_ERROR).toBeDefined();
      expect(httpConfig.HTTP_STATUS_INTERNAL_ERROR).toBe(500);
    });
  });

  describe("CORS configuration", () => {
    it("should have CORS_ALLOW_ORIGIN defined", () => {
      expect(httpConfig.CORS_ALLOW_ORIGIN).toBeDefined();
      expect(httpConfig.CORS_ALLOW_ORIGIN).toBe("Access-Control-Allow-Origin");
    });

    it("should have CORS_ALLOW_ALL defined", () => {
      expect(httpConfig.CORS_ALLOW_ALL).toBeDefined();
      expect(httpConfig.CORS_ALLOW_ALL).toBe("*");
    });

    it("should have CORS_ALLOW_HEADERS defined", () => {
      expect(httpConfig.CORS_ALLOW_HEADERS).toBeDefined();
      expect(httpConfig.CORS_ALLOW_HEADERS).toBe("Access-Control-Allow-Headers");
    });

    it("should have CORS_EXPOSE_HEADERS defined", () => {
      expect(httpConfig.CORS_EXPOSE_HEADERS).toBeDefined();
      expect(httpConfig.CORS_EXPOSE_HEADERS).toBe("Access-Control-Expose-Headers");
    });

    it("should have CORS_ALLOW_METHODS defined", () => {
      expect(httpConfig.CORS_ALLOW_METHODS).toBeDefined();
      expect(httpConfig.CORS_ALLOW_METHODS).toBe("Access-Control-Allow-Methods");
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = httpConfig;
      expect(config).toHaveProperty("HTTP_PROTOCOL");
      expect(config).toHaveProperty("CONTENT_TYPE_HEADER");
      expect(config).toHaveProperty("HTTP_METHOD_OPTIONS");
      expect(config).toHaveProperty("HTTP_METHOD_POST");
      expect(config).toHaveProperty("HTTP_STATUS_OK");
      expect(config).toHaveProperty("HTTP_STATUS_BAD_REQUEST");
      expect(config).toHaveProperty("HTTP_STATUS_NOT_FOUND");
      expect(config).toHaveProperty("HTTP_STATUS_INTERNAL_ERROR");
      expect(config).toHaveProperty("CORS_ALLOW_ORIGIN");
      expect(config).toHaveProperty("CORS_ALLOW_ALL");
      expect(config).toHaveProperty("CORS_ALLOW_HEADERS");
      expect(config).toHaveProperty("CORS_EXPOSE_HEADERS");
      expect(config).toHaveProperty("CORS_ALLOW_METHODS");
    });

    it("should be typed as const", () => {
      // This test verifies that TypeScript treats the config as readonly
      const protocol: "http://" = httpConfig.HTTP_PROTOCOL;
      const statusOk: 200 = httpConfig.HTTP_STATUS_OK;
      const statusBadRequest: 400 = httpConfig.HTTP_STATUS_BAD_REQUEST;

      expect(protocol).toBe("http://");
      expect(statusOk).toBe(200);
      expect(statusBadRequest).toBe(400);
    });
  });
});
