# API Endpoints Discovery Feature - Implementation Summary

## Overview
This document summarizes the implementation of the **API/Service Endpoint Discovery and Documentation** feature for the Codebase Analyzer Tool. This feature enables the tool to systematically identify and document REST APIs, GraphQL endpoints, SOAP APIs, and other service interfaces that legacy applications expose or consume.

## Feature Value
Understanding an application's API surface is critical for:
- Integration planning during modernization
- Security auditing
- API versioning strategies
- Microservices decomposition

## Implementation Details

### 1. Schema Extensions (`src/schemas/sources.schema.ts`)
- Added `apiEndpointSchema` with fields:
  - `path`: The API endpoint path (e.g., '/api/users/{id}')
  - `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
  - `description`: What the endpoint does
  - `requestBody`: Expected request body structure (optional)
  - `responseBody`: Expected response structure (optional)
  - `authentication`: Authentication mechanism required (optional)
- Extended `sourceSummarySchema` to include `apiEndpoints` field

### 2. Capture Configuration Updates (`src/components/capture/config/capture.config.ts`)
Added API endpoint detection instructions for multiple file types:

#### Java
- JAX-RS annotations (@Path, @GET, @POST, @PUT, @DELETE, @PATCH, @PathParam)
- Spring annotations (@RestController, @Controller, @RequestMapping, @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping)
- Servlet mappings (web.xml or @WebServlet annotations)
- HTTP client calls (RestTemplate, WebClient, HttpClient, OkHttp)
- Feign client declarations (@FeignClient)

#### JavaScript/TypeScript
- Express route definitions (app.get, app.post, router.use)
- Fastify route definitions (fastify.get, fastify.post)
- Koa route definitions (router.get, router.post)
- NestJS decorators (@Get, @Post, @Put, @Delete, @Patch, @Controller)
- HTTP client calls (fetch, axios, request, superagent, got)
- GraphQL schema definitions (type Query, type Mutation, resolvers)
- tRPC procedure definitions (publicProcedure, protectedProcedure)

#### C#
- ASP.NET Core MVC/Web API controller actions ([HttpGet], [HttpPost], [HttpPut], [HttpDelete], [HttpPatch], [Route])
- ASP.NET Core Minimal API endpoints (MapGet, MapPost, MapPut, MapDelete)
- WCF service contracts ([OperationContract], [ServiceContract])
- HTTP client calls (HttpClient, RestSharp, Refit interfaces)
- gRPC service definitions

#### Ruby
- Rails controller actions (get, post, put, delete, patch in routes.rb)
- Sinatra route definitions (get, post, put, delete, patch blocks)
- Grape API endpoints (get, post, put, delete, patch declarations)
- HTTP client calls (Net::HTTP, RestClient, HTTParty, Faraday)
- GraphQL type definitions (GraphQL::ObjectType, field definitions)

### 3. Repository Layer (`src/repositories/source/`)
- **Model** (`sources.model.ts`): Added `ProjectedApiEndpointFields` interface
- **Interface** (`sources.repository.interface.ts`): Added `getProjectApiEndpoints()` method
- **Implementation** (`sources.repository.ts`): Implemented query method that:
  - Filters files with non-empty apiEndpoints arrays
  - Projects namespace, apiEndpoints, and filepath
  - Sorts results by namespace

### 4. Reporting Layer
#### Data Provider (`src/components/reporting/data-providers/database-report-data-provider.ts`)
- Added `getApiEndpoints()` method that:
  - Fetches API endpoint data from repository
  - Transforms data for report display
  - Maps each endpoint to include namespace and filepath context

#### Types (`src/components/reporting/report-gen.types.ts`)
- Added `ApiEndpointInfo` interface
- Extended `ReportData` interface to include `apiEndpoints` field

#### Report Generator (`src/components/reporting/app-report-generator.ts`)
- Added API endpoints data fetching in parallel with other report data
- Created `apiEndpointsTableViewModel` for HTML display
- Integrated API endpoints into both JSON and HTML report outputs

#### Configuration (`src/components/reporting/report-sections.config.ts`)
- Added `apiEndpoints: "api-endpoints.json"` to JSON data files configuration

#### Templates
- **New Partial** (`src/components/reporting/templates/partials/api-endpoints.ejs`):
  - Displays API endpoints count
  - Renders endpoints table using the table view model
  - Shows message when no endpoints are detected
- **Main Template** (`src/components/reporting/templates/main.ejs`):
  - Added API endpoints section include

#### Writer (`src/components/reporting/html-report-writer.ts`)
- Updated `PreparedHtmlReportData` interface to include:
  - `apiEndpoints: ApiEndpointInfo[]`
  - `apiEndpointsTableViewModel: TableViewModel`

### 5. Testing (`tests/repositories/sources-repository.test.ts`)
Added comprehensive unit tests for the new repository method:
- Test for returning API endpoints for a project
- Test for handling empty results
- Test for verifying correct query parameters and sorting

## Files Modified
1. `src/schemas/sources.schema.ts`
2. `src/components/capture/config/capture.config.ts`
3. `src/repositories/source/sources.model.ts`
4. `src/repositories/source/sources.repository.interface.ts`
5. `src/repositories/source/sources.repository.ts`
6. `src/components/reporting/data-providers/database-report-data-provider.ts`
7. `src/components/reporting/report-gen.types.ts`
8. `src/components/reporting/app-report-generator.ts`
9. `src/components/reporting/report-sections.config.ts`
10. `src/components/reporting/html-report-writer.ts`
11. `tests/repositories/sources-repository.test.ts`
12. `tests/components/reporting/html-report-writer.test.ts`

## Files Created
1. `src/components/reporting/templates/partials/api-endpoints.ejs`

## Test Results
- **Build**: ✅ Success
- **Unit Tests**: ✅ All 1667 tests passed (including 3 new tests)
- **Linting**: ✅ No errors

## Usage
Once the codebase is captured and processed:
1. API endpoints will be automatically detected during the capture phase
2. The report generator will include an "API Endpoints" section in the HTML report
3. A separate `api-endpoints.json` file will be generated with all endpoint details
4. The complete report JSON will include the apiEndpoints data

## Output Format
Each API endpoint in the report includes:
- **Namespace**: The fully qualified name of the class/module defining the endpoint
- **Filepath**: The source file containing the endpoint
- **Path**: The URL path pattern (e.g., "/api/users/{id}")
- **Method**: HTTP method (GET, POST, PUT, DELETE, PATCH)
- **Description**: What the endpoint does
- **Request Body**: Expected request structure (if applicable)
- **Response Body**: Expected response structure (if applicable)
- **Authentication**: Authentication requirements (if identifiable)

## Future Enhancements
Potential improvements for future iterations:
- Add request/response schema validation
- Detect API versioning strategies
- Identify deprecated endpoints
- Map endpoints to database operations
- Generate OpenAPI/Swagger specifications
- Analyze endpoint security configurations

