/**
 * HTTP protocol configuration constants.
 * Contains reusable HTTP status codes, headers, and CORS settings.
 */
export const httpConfig = {
  // HTTP Protocol
  HTTP_PROTOCOL: "http://",

  // HTTP Headers
  CONTENT_TYPE_HEADER: "Content-Type",

  // HTTP Methods
  HTTP_METHOD_OPTIONS: "OPTIONS",
  HTTP_METHOD_POST: "POST",

  // HTTP Status Codes
  HTTP_STATUS_OK: 200,
  HTTP_STATUS_BAD_REQUEST: 400,
  HTTP_STATUS_TOO_MANY_REQUESTS: 429,
  HTTP_STATUS_NOT_FOUND: 404,
  HTTP_STATUS_INTERNAL_ERROR: 500,

  // CORS Configuration
  CORS_ALLOW_ORIGIN: "Access-Control-Allow-Origin",
  CORS_ALLOW_ALL: "*",
  CORS_ALLOW_HEADERS: "Access-Control-Allow-Headers",
  CORS_EXPOSE_HEADERS: "Access-Control-Expose-Headers",
  CORS_ALLOW_METHODS: "Access-Control-Allow-Methods",
} as const;
