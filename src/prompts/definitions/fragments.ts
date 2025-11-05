/**
 * Common prompt fragments used across all prompt types.
 * These fragments are shared between sources and app-summaries prompts.
 */
export const COMMON_FRAGMENTS = {
  FORCE_JSON_FORMAT: `In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER include thought markers, thinking prefixes, or explanation text before the JSON. Do NOT write patterns like <ctrl94>thought, <thinking>, or command{ before the JSON. Start your response directly with { or [.
CRITICAL: NEVER include code snippets, code examples, or programming language syntax in your response. Do NOT write code patterns like else{ or if{ in your planning or explanation text, as these can interfere with JSON extraction. Only include the JSON object itself, starting directly with { or [.
NEVER include explanatory text, file paths, or any other non-JSON content between JSON properties. Each property must immediately follow the previous property (or comma) without any intervening lines of text. For example, ❌ INCORRECT: "namespace": "...",\nsemantically-correct-legacy-content-analysis-output\n  "purpose": "..." should be ✅ CORRECT: "namespace": "...",\n  "purpose": "..."
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
CRITICAL JSON FORMAT REQUIREMENTS (MUST FOLLOW EXACTLY):
- ALL property names MUST be enclosed in double quotes (e.g., "name": "value", NOT name: "value")
- BOTH opening and closing quotes are REQUIRED for property names (e.g., "name": "value" is correct, NOT name": "value" or "name: "value")
- This applies to ALL properties at ALL nesting levels, including properties that appear after closing braces or brackets (e.g., },\nintegrationPoints: [] is INCORRECT - must be },\n"integrationPoints": [])
- Use ONLY regular ASCII double quotes (") for property names and string values - NEVER use curly quotes (smart quotes like " or ") as they break JSON parsing
- ALL string values MUST be enclosed in double quotes
- Use proper JSON syntax with commas separating properties
- Do not include any unquoted property names or values
- Ensure all brackets, braces, and quotes are properly matched
PROPERTY NAME QUOTING RULES (APPLY TO ALL NESTED LEVELS):
Every property name, at every nesting level, must follow this exact pattern: "propertyName": value
 ✅ CORRECT: {"name": "value", "nested": {"inner": "data"}}
 ❌ INCORRECT: {name: "value", nested: {inner: "data"}}
 ❌ INCORRECT: {name": "value", "nested": {inner": "data"}}
 ❌ INCORRECT: {"name": "value", nested: {"inner": "data"}}
CRITICAL: PROPERTY NAMES AFTER OPENING BRACES - When starting a new object with {, the FIRST property name MUST have quotes. This is especially critical when starting new objects in arrays after closing braces. Common mistakes: ❌ INCORRECT: {name: "value", (missing quotes around "name" - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: {\n      name: "value", (missing quotes after opening brace - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: },\n    {\n      name: "value", (missing quotes after opening brace in array - CRITICAL: this breaks JSON parsing!)  ✅ CORRECT: {"name": "value", (complete with opening and closing quotes)  ✅ CORRECT: {\n      "name": "value", (complete with quotes even after opening brace)  ✅ CORRECT: },\n    {\n      "name": "value", (complete with quotes after opening brace in array)
COMMON MISTAKES TO AVOID:
- Unquoted property names: name: "value" → MUST be "name": "value"
- Missing opening quote: name": "value" → MUST be "name": "value"
- Missing opening quote with typo: extraReferences": → MUST be "externalReferences": (CRITICAL: both the opening quote AND the correct property name are required)
- Missing opening quote with leading underscore: _publicConstants": → MUST be "publicConstants": (CRITICAL: property names should NOT have leading underscores - this is a typo. Remove the underscore and add the opening quote)
- Missing opening quote after long strings: After a long description or string value ending with ", you MUST still include the opening quote for the next property. Example: "description": "very long text...", cyclomaticComplexity": 2 → MUST be "description": "very long text...", "cyclomaticComplexity": 2
- Missing closing quote: "name: "value" → MUST be "name": "value"
- Missing closing quote AND colon: "name "value" → MUST be "name": "value" (CRITICAL: property names must have BOTH closing quote AND colon before the value)
- Stray text before property: e"name": → MUST be "name":
- Stray text before property: word"name": → MUST be "name":
- Incomplete quotes: cyclomaticComplexity": → MUST be "cyclomaticComplexity":
- Property name typos: extraReferences", internReferences", publMethods", _publicConstants" → MUST use correct names: "externalReferences", "internalReferences", "publicMethods", "publicConstants" (NO leading underscores)
CRITICAL: NO STRAY TEXT BEFORE PROPERTY NAMES - This is a common error that breaks JSON parsing. When starting a new property after closing an object or array (}, or ],), ensure you start directly with the opening quote. Common mistakes:
 ❌ INCORRECT: },\ne"publicMethods": [    (stray "e" character before property)
 ❌ INCORRECT: },\nword"propertyName": {   (stray "word" before property)
 ❌ INCORRECT: ],\nf"nextProperty": "value"  (stray "f" before property)
 ✅ CORRECT: },\n"publicMethods": [        (no stray text, starts with quote)
 ✅ CORRECT: },\n"propertyName": {         (no stray text, starts with quote)
 ✅ CORRECT: ],\n"nextProperty": "value"   (no stray text, starts with quote)
CRITICAL: PROPERTY NAMES ON NEWLINES AFTER CLOSING BRACKETS - When a property appears on a new line after closing an array with ], or closing an object with }, you MUST include the opening quote at the start of the new line. This is especially critical after arrays with many quoted strings, as missing quotes will break JSON parsing:
CRITICAL: ARRAY STRING VALUES MUST HAVE OPENING QUOTES - Every string value in an array MUST start with a double quote. When writing array elements, ensure each string value begins with a quote. Common mistakes: ❌ INCORRECT: fineract.infrastructure...", (missing opening quote - should be "org.apache.fineract.infrastructure...",)  ❌ INCORRECT: org.example.Class", (missing opening quote - should be "org.example.Class",)  ✅ CORRECT: "org.apache.fineract.infrastructure.entityaccess.exception.NotOfficeSpecificProductException", (complete with opening quote)
COMPLETE ALL PROPERTY NAMES: Never truncate or abbreviate property names (e.g., use "references" not "eferences", "implementation" not "implemen"). Never truncate property names to single characters (e.g., use "name" not "e", "n", or "m"). CRITICAL: When starting a new object in an array after }, you MUST write the complete property name with BOTH opening and closing quotes. Never write truncated property names like se": "value" (where "name" was truncated to "se") or pu": "value" (where "purpose" was truncated to "pu"). Always write the complete property name: "name": "value" or "purpose": "value"
ENSURE COMPLETE RESPONSES: Always provide complete, valid JSON that can be parsed without errors
AVOID TRUNCATION: If you reach token limits, prioritize completing the JSON structure over adding more detail
ARRAY STRUCTURE REQUIREMENTS: When creating arrays of objects, ensure each object has a proper opening brace { immediately after the comma or opening bracket [. Do NOT omit opening braces when starting new objects in arrays. When starting a new object in an array after closing a previous object with }, you MUST include the opening brace { immediately. Do NOT write stray characters before property names or values. CRITICAL: Even when property names are complete and correct (e.g., "name": "value",), you MUST still include the opening brace { before the property name when starting a new object in an array. Example: ✅ CORRECT: [{"name": "obj1"}, {"name": "obj2"}]  ✅ CORRECT: },\n    {\n      "mechanism": "REST" (complete structure with opening brace)  ✅ CORRECT: },\n    {\n      "name": "methodName", (complete structure with opening brace even when property name is already correct)  ❌ INCORRECT: [{"name": "obj1"}, "name": "obj2"}]  ❌ INCORRECT: },{"name": "obj2"}] (missing opening brace)  ❌ INCORRECT: }, "name": "obj2", (missing opening brace even though property name is correct - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: },obj2", (missing opening brace and property name)  ❌ INCORRECT: },calculateMethod", (missing opening brace and "name": property)  ❌ INCORRECT: },e"mechanism": (stray character "e" before property name AND missing opening brace - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: },c"withdrawal", (stray character "c" before value AND missing opening brace and "name": property - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: },\nse": "value", (truncated property name "se" instead of "name" AND missing opening brace AND missing opening quote - CRITICAL: this breaks JSON parsing! Must be },\n    {\n      "name": "value",)  ❌ INCORRECT: },\npu": "value", (truncated property name "pu" instead of "purpose" AND missing opening brace AND missing opening quote - CRITICAL: this breaks JSON parsing! Must be },\n    {\n      "purpose": "value",)
COMPLETE PROPERTY DEFINITIONS: Every property must include both the property name AND the colon separator. Never write truncated property names followed directly by values without colons. When starting a new object in an array, you MUST include the opening brace { AND the complete property name with quotes and colon before the value. Example: ✅ CORRECT: "name": "value",  ❌ INCORRECT: e"value", or n"value", (where "name" was truncated to "e" or "n")  ❌ INCORRECT: },calculateMethod", (missing { and "name": before the method name)  ❌ INCORRECT: },c"withdrawal", (missing { and "name": before the value - CRITICAL: this pattern breaks JSON parsing!)  ✅ CORRECT: },{\n    "name": "calculateMethod", (complete structure with opening brace and property name)  ✅ CORRECT: },\n    {\n      "name": "withdrawal", (complete structure in array of objects)
NO STRING CONCATENATION IN PROPERTY NAMES: Do NOT use string concatenation operators (+) in property names. If a property name is long, write it as a complete, single quoted string. Example: ✅ CORRECT: "cyclomaticComplexity": 1  ❌ INCORRECT: "cyclomati" + "cComplexity": 1 or "referen" + "ces": []
COMPLETE PROPERTY QUOTING: Every property name must have BOTH opening and closing quotes, AND must be followed by a colon. Do NOT write property names with only a closing quote, and do NOT omit the colon separator. Examples:
  ✅ CORRECT: "linesOfCode": 10  
  ❌ INCORRECT: linesOfCode": 10 (missing opening quote)
  ❌ INCORRECT: "linesOfCode: 10 (missing closing quote)
AVOID BINARY CORRUPTION MARKERS: Never include binary markers, corruption patterns, or placeholder text in your JSON response. Property names must be complete and valid. Examples:
  ❌ INCORRECT: <y_bin_305>OfCode": 10 (binary marker corrupting property name)
  ❌ INCORRECT: so{"name": "value"} (stray text before opening brace)
  ✅ CORRECT: "linesOfCode": 10 (complete property name)
  ✅ CORRECT: {"name": "value"} (proper structure with opening brace)
  ❌ INCORRECT: "linesOfCode "value" (missing closing quote AND colon - this is a critical error that breaks JSON parsing!)
NO PROPERTY NAME TRUNCATION: NEVER truncate or abbreviate property names. Always write the complete property name with both opening and closing quotes. Do NOT write only the tail-end of a property name. Examples: ✅ CORRECT: "publicMethods": [...]  ❌ INCORRECT: alues": [...] (missing opening quote and beginning of "publicMethods" - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: nstants": [...] (missing opening quote and beginning of "publicConstants")  ❌ INCORRECT: egrationPoints": [...] (missing opening quote and beginning of "integrationPoints")  ✅ CORRECT: "publicMethods": [...], "publicConstants": [...], "integrationPoints": [...] (all complete with opening quotes)
NO PROPERTY NAME TYPOS: Use the EXACT property names from the schema. Do NOT create variations or typos. Common mistakes: ✅ CORRECT: "externalReferences": [...]  ❌ INCORRECT: extraReferences": [...] (typo: "extra" instead of "external" AND missing opening quote - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: internReferences": [...] (typo: "intern" instead of "internal" AND missing opening quote)  ❌ INCORRECT: publMethods": [...] (typo: "publ" instead of "public" AND missing opening quote)  ✅ CORRECT: "externalReferences": [...], "internalReferences": [...], "publicMethods": [...] (exact schema property names with opening quotes)
QUOTE ALL STRING VALUES: ALL string values must be enclosed in double quotes. This includes class names, type names, enum values, and any other string literals. Do NOT write unquoted string values after colons. Examples: ✅ CORRECT: "name": "GetChargeCalculation", "type": "String", "returnType": "CommandProcessingResult"  ❌ INCORRECT: "name":GetChargeCalculation", (missing quotes around value - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: "type":String, (unquoted value)  ❌ INCORRECT: "returnType":CommandProcessingResult (unquoted value)  ❌ INCORRECT: "name":ax": "totalCredits", (stray text between colon and value quote - CRITICAL: this breaks JSON parsing!)  ✅ CORRECT: "name": "GetChargeCalculation", "type": "String", "returnType": "CommandProcessingResult" (all values properly quoted)  ✅ CORRECT: "name": "totalCredits", (no stray text between colon and opening quote)
ESCAPE QUOTES IN CODE SNIPPETS: When including code snippets in string values (description, implementation fields), you MUST properly escape all quotes. If you have an escaped quote (backslash-quote) followed by another quote, you must escape the backslash too. The pattern backslash-quote-quote (without escaping the backslash) will break JSON parsing because the second quote is unescaped and ends the string prematurely. Always escape the backslash when you need a literal backslash before a quote in code snippets within string values.
PROPERTY NAME COLON REQUIREMENT: After every property name's closing quote, you MUST include a colon (:) before the value. Never write a property name with a space followed directly by the value's opening quote. The pattern "propertyName "value" is INVALID JSON and will fail to parse. Examples:
 ✅ CORRECT: "name": "command"
 ✅ CORRECT: "description": "This is a description"
 ❌ INCORRECT: "name "command" (space and missing colon between property name and value - breaks JSON parsing!)
 ❌ INCORRECT: "description "This is a description" (same error - breaks JSON parsing!)
USE JSON PROPERTY SEPARATOR: JSON uses a single colon : to separate property names from values, NOT assignment operators like := or =. The property separator must be exactly : with optional whitespace. Example: ✅ CORRECT: "name": "value"  ❌ INCORRECT: "name":= "value" or "name"= "value"
NO PROPERTY NAME TYPOS: Ensure all property names match the exact schema requirements. Do NOT add trailing underscores, double underscores, or other typos to property names. Use the exact property names specified in the schema. Examples: ✅ CORRECT: "type": "String"  ❌ INCORRECT: "type_": "String" (trailing underscore) or "type__": "String" (double underscore). When writing property names, copy them exactly from the schema - do not modify or add characters. This is especially critical for parameter objects in arrays (e.g., in "parameters" arrays within "publicMethods"), where each parameter object must have exactly "name" and "type" properties - never "name_" or "type_". Example: ✅ CORRECT: {"name": "param1", "type": "String"}  ❌ INCORRECT: {"name": "param1", "type_": "String"} or {"name_": "param1", "type": "String"}
ESCAPE QUOTES IN STRING VALUES: If you must include double quotes inside a string value (e.g., HTML attributes like type="hidden", code snippets, or quoted text), you MUST escape them with backslashes. For example: "description": "Creates <input type=\\"hidden\\"> element" NOT "description": "Creates <input type="hidden"> element"
VALID JSON ESCAPE SEQUENCES ONLY: When including backslashes in string values, you MUST use only valid JSON escape sequences. Valid escapes are: \\" (quote), \\\\ (backslash), \\/ (slash), \\b (backspace), \\f (form feed), \\n (newline), \\r (carriage return), \\t (tab), and \\uXXXX (unicode). DO NOT use invalid escapes like \\  (backslash-space), \\x (not valid in JSON), \\1-\\9 (octal not valid), or any other invalid escape sequences. If you need to describe code syntax that uses invalid escapes, either escape the backslash itself (\\\\ ) or avoid using them.
NO STRAY TEXT: Do NOT include any stray words, fragments, characters, or text directly before property names or array elements. Each property name must start with a double quote immediately after the preceding delimiter (comma, closing brace/bracket, or newline). This includes single characters (e.g., "e"), full words (e.g., "tribal"), AND non-ASCII characters or foreign language text (e.g., Bengali "করার", Chinese "文本", Arabic "نص"). Do NOT include unquoted text with colons before property names - this breaks JSON parsing. Examples: ✅ CORRECT: },\n  "property":  ✅ CORRECT: ],\n  "property":  ❌ INCORRECT: },\ne"property": or },\nword"property": or },\ntribal"property": ❌ INCORRECT: ],\ne"property": (stray character after closing bracket and comma - CRITICAL: this breaks JSON parsing!) ❌ INCORRECT: },\nকরার"property": (non-ASCII/Bengali text before property - this breaks JSON parsing!) ❌ INCORRECT: "item1",\nকরার"item2", (non-ASCII text before array element - this breaks JSON parsing!) ❌ INCORRECT: },\nextraText: "property": (stray text with colon before property - this breaks JSON parsing!)
NO STRAY CHARS AFTER VALUES: Do NOT include any stray characters, words, or text directly after string property values. Each string value must end with a double quote immediately before the comma, closing brace/bracket, or newline. This includes underscores (e.g., "_"), single characters (e.g., "e"), or full words. Do NOT add stray text immediately after the quote, after a space, or on a new line after the quote. Examples: ✅ CORRECT: "type": "String",  ❌ INCORRECT: "type": "String"_ (immediate), "type": "String" word (after space), or "type": "String"\nword (on new line)
NO STRAY LINES: Do NOT include any complete lines of text between JSON structures. After a closing bracket (]), closing brace (}), or comma, do NOT insert file paths, comments, explanations, random words, or any other text on separate lines. This applies even if the stray line has leading whitespace or indentation. Each property or structure must follow immediately after the preceding delimiter (with only whitespace/newlines for formatting). Examples: ✅ CORRECT: },\n  "nextProperty": "value"  ✅ CORRECT: ],\n  "nextProperty": "value"  ❌ INCORRECT: },\nsrc/main/java/com/example/MyClass.java\n  "nextProperty": "value"  ❌ INCORRECT: },\nThis is a comment\n  "nextProperty": "value"  ❌ INCORRECT: ],\nprocrastinate\n  "externalReferences": (random word after closing bracket and comma - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: ],\n procrastinate\n  "externalReferences": (random word with leading whitespace after closing bracket and comma - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: ],\nrandom text\n  "property": (any text on separate line between structures - CRITICAL: this breaks JSON parsing!)  ❌ INCORRECT: ],\n  random text\n  "property": (any text with indentation on separate line - CRITICAL: this breaks JSON parsing!)
NO TRUNCATION MARKERS: Do NOT add truncation indicators like ... or (truncated) or any other markers to indicate that your response was cut off. If you reach token limits, simply end the JSON structure properly by closing all open brackets, braces, and strings. Truncation markers break JSON parsing and are not valid JSON syntax. Example: ✅ CORRECT: "item1",\n"item2"\n]  ❌ INCORRECT: "item1",\n...\n] or "item1",\n(truncated)\n]
CRITICAL: All property names at every nesting level MUST have double quotes. Be consistent - if you quote one property, quote ALL properties. VALIDATION CHECK: Before finalizing your response, mentally verify that every property name starts and ends with double quotes. Think: "Did I quote ALL property names at ALL nesting levels?"`,
};

/**
 * Reusable prompt instruction fragments for building complex prompts.
 * These fragments can be composed to create instruction sets for different file types.
 *
 * IMPORTANT: These fragments do NOT include the "* " prefix - that is added during
 * prompt construction to maintain consistency with the existing system.
 */
export const SOURCES_FRAGMENTS = {
  COMMON: {
    PURPOSE: "A detailed definition of its purpose",
    IMPLEMENTATION: "A detailed definition of its implementation",
    DB_IN_DOCUMENTATION:
      "Look for database schemas, queries, or data models mentioned in the documentation",
    DB_IN_FILE: "Look for database operations, queries, or connections in the file",
  },

  CODE_QUALITY: {
    INTRO: "Code Quality Analysis (REQUIRED for all code files and for all public methods)",
    METHOD_METRICS: `For each public method/function you identify, you MUST estimate and provide:
  * cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, case, catch, &&, ||, ?:). A simple method with no branches = 1. Add 1 for each decision point.
  * linesOfCode: Count actual lines of code (exclude blank lines and comments)
  * codeSmells: Identify any of these common code smells present. Allowed labels:`,
    METHOD_SMELLS: `    - 'LONG METHOD' - method has > 50 lines of code
    - 'LONG PARAMETER LIST' - method has > 5 parameters
    - 'COMPLEX CONDITIONAL' - deeply nested if/else or complex boolean expressions
    - 'DUPLICATE CODE' - similar logic repeated in multiple places
    - 'MAGIC NUMBERS' - hardcoded numeric values without explanation
    - 'DEEP NESTING' - more than 3-4 levels of nesting
    - 'DEAD CODE' - unreachable or commented-out code
    - 'OTHER' - some other method-level smell`,
    FILE_METRICS: `For file-level codeQualityMetrics, provide:
  * totalMethods: Count of all methods in the file
  * averageComplexity: Average of all method complexities
  * maxComplexity: Highest complexity score in the file
  * averageMethodLength: Average lines of code per method
  * fileSmells: File-level smells. Allowed labels:
    - 'GOD CLASS' - class has > 20 methods or > 500 lines of code
    - 'TOO MANY METHODS' - class has > 20 public methods
    - 'FEATURE ENVY' - methods heavily use data from other classes
    - 'DATA CLASS' - class only contains fields and getters/setters
    - 'LARGE FILE' - class file exceeds 500 lines of code
    - 'OTHER' - some other file-level smell`,
  },

  DB_INTEGRATION: {
    INTRO: "Database Integration Analysis (REQUIRED for source files that interact with databases)",
    REQUIRED_FIELDS: `For files that interact with a database, you MUST extract and provide ALL of the following fields in the databaseIntegration object. DO NOT omit any field - if you cannot determine a value, use "unknown" or indicate "not identifiable from code":
  * REQUIRED FIELDS:
    - mechanism (REQUIRED): The integration type - see mechanism mapping below (use "NONE" if no database integration)
    - description (REQUIRED): Detailed explanation of how database integration is achieved (use "n/a" if no database integration)
    - codeExample (REQUIRED): A small redacted code snippet showing the database interaction  (use "n/a" if no database integration)
  * STRONGLY RECOMMENDED FIELDS (provide whenever possible, using "n/a" if no database integration):
    - name: Name of the database service or data access component (e.g., "UserRepository", "OrderDAO", "DatabaseConfig")
    - databaseName: Specific database/schema name being accessed (look in connection strings, config files, or annotations)
    - tablesAccessed: Array of table/collection/entity names accessed (from SQL queries, JPA entity names, @Table annotations, repository interfaces)
    - operationType: Array of operation types (EXACT enumeration values only): READ, WRITE, READ_WRITE, DDL, ADMIN, OTHER. Use READ_WRITE instead of separate READ and WRITE entries.
    - queryPatterns: Description of query complexity (e.g., 'simple CRUD', 'complex joins with subqueries', 'aggregations', 'stored procedure calls', 'batch operations')
    - transactionHandling: How transactions are managed (e.g., 'Spring @Transactional', 'manual tx.commit()', 'JPA EntityTransaction', 'auto-commit', 'none', 'unknown')
    - protocol: Database type and version (e.g., 'PostgreSQL 15', 'MySQL 8.0', 'MongoDB 6.0', 'Oracle 19c', 'H2', 'SQL Server 2019')
    - connectionInfo: JDBC URL or connection string - MUST REDACT passwords/secrets (e.g., 'jdbc:postgresql://localhost:5432/mydb', 'mongodb://localhost:27017/appdb')`,
  },

  INTEGRATION_POINTS: {
    INTRO:
      "A list of integration points this file defines or consumes – for each integration include: mechanism type, name, description, and relevant details. Look for:",
  },

  SCHEDULED_JOBS: {
    INTRO:
      "A list of scheduled jobs or batch processes defined in this file – for each job extract:",
    FIELDS: ` * jobName: The name of the job (from filename or job card/comments)
  * trigger: How/when the job is triggered (cron, scheduled, manual, event-driven)
  * purpose: Detailed description of what it does
  * inputResources: Array of inputs (files, datasets, DBs, APIs)
  * outputResources: Array of outputs (files, datasets, DBs, APIs)
  * dependencies: Array of other jobs/scripts/resources it depends on
  * - estimatedDuration: Expected runtime if mentioned`,
  },

  JAVA_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to the classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)",
    EXTERNAL_REFS:
      "A list of the external references to third-party classpath used by this source file, which do not belong to this same application that this class/interface file is part of",
    PUBLIC_METHODS:
      "A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation",
    PUBLIC_CONSTANTS: "A list of public constants (name, value and type) it defines (if any)",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - JAX-RS annotations (@Path, @GET, @POST, @PUT, @DELETE, @PATCH) - include path, method, request/response body
    - Spring annotations (@RestController, @RequestMapping, @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping)
    - Servlet mappings (web.xml or @WebServlet) - include URL patterns
    - HTTP client calls (RestTemplate, WebClient, HttpClient, OkHttp, Feign @FeignClient)
  * SOAP Services (mechanism: 'SOAP'):
    - JAX-WS annotations (@WebService, @WebMethod, @SOAPBinding) - include service name, operation name, SOAP version
    - WSDL references or Apache CXF service definitions
    - SOAPConnectionFactory, SOAPMessage usage
    - SOAP client proxy usage (Service.create, getPort)
   * JMS Messaging (mechanism: 'JMS-QUEUE' or 'JMS-TOPIC'):
    - Queue operations: MessageProducer sending to Queue, QueueSender, @JmsListener with destination type QUEUE
    - Topic operations: TopicPublisher, @JmsListener with destination type TOPIC
    - Include queue/topic name, message type, direction (PRODUCER/CONSUMER/BOTH/BIDIRECTIONAL)
    - ConnectionFactory, Session, MessageProducer/MessageConsumer patterns
  * Kafka (mechanism: 'KAFKA-TOPIC'):
    - KafkaProducer, KafkaConsumer usage - include topic name, message type, direction (PRODUCER/CONSUMER/BOTH/BIDIRECTIONAL)
    - @KafkaListener annotations - include topic names, consumer group
  * RabbitMQ (mechanism: 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'):
    - RabbitTemplate send/receive operations - include queue/exchange name and direction (PRODUCER/CONSUMER/BOTH/BIDIRECTIONAL if inferable)
    - @RabbitListener annotations - include queue names, direction
  * Other Messaging:
    - ActiveMQ: @JmsListener with ActiveMQ-specific config => 'ACTIVEMQ-QUEUE' or 'ACTIVEMQ-TOPIC'
    - AWS SQS/SNS: AmazonSQS client, sendMessage, receiveMessage => 'AWS-SQS' or 'AWS-SNS'
    - Azure Service Bus: ServiceBusClient, QueueClient, TopicClient => 'AZURE-SERVICE-BUS-QUEUE' or 'AZURE-SERVICE-BUS-TOPIC'
  * WebSockets (mechanism: 'WEBSOCKET'):
    - @ServerEndpoint annotations - include endpoint path
    - WebSocketHandler implementations
  * gRPC (mechanism: 'GRPC'):
    - @GrpcService annotations or gRPC stub usage - include service name, methods`,
    DB_MECHANISM_MAPPING: `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:
      - Uses JDBC driver / JDBC API classes => mechanism: 'JDBC'
      - Uses Spring Data repositories (CrudRepository, JpaRepository, MongoRepository, etc.) => mechanism: 'SPRING-DATA'
      - Uses Hibernate API directly (SessionFactory, Session, Criteria API) => mechanism: 'HIBERNATE'
      - Uses standard JPA annotations and EntityManager (without Spring Data) => mechanism: 'JPA'
      - Uses Enterprise Java Beans for persistence (CMP/BMP, @Entity with EJB) => mechanism: 'EJB'
      - Contains inline SQL strings / queries (SELECT / UPDATE / etc.) without ORM => mechanism: 'SQL'
      - Uses raw database driver APIs (DataSource, Connection, etc.) without higher abstraction => mechanism: 'DRIVER'
      - Uses other JPA-based ORMs (TopLink, EclipseLink) not clearly Hibernate => mechanism: 'ORM'
      - Defines DDL / migration style schema changes inline => mechanism: 'DDL'
      - Executes DML specific batch / manipulation blocks distinct from generic SQL => mechanism: 'DML'
      - Invokes stored procedures (CallableStatement, @Procedure, etc.) => mechanism: 'STORED-PROCEDURE'
      - Creates or manages database triggers => mechanism: 'TRIGGER'
      - Creates or invokes database functions => mechanism: 'FUNCTION'
      - Uses Redis client (Jedis, Lettuce) => mechanism: 'REDIS'
      - Uses Elasticsearch client (RestHighLevelClient, ElasticsearchTemplate) => mechanism: 'ELASTICSEARCH'
      - Uses Cassandra CQL (CqlSession, @Query with CQL) => mechanism: 'CASSANDRA-CQL'
      - Uses a 3rd party framework not otherwise categorized => mechanism: 'OTHER'
      - Otherwise, if the code does not use a database => mechanism: 'NONE'
    (note, JMS and JNDI are not related to interacting with a database)`,
  },

  JAVASCRIPT_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other modules used by this source file (by using `require` or `import` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)",
    EXTERNAL_REFS:
      "A list of the external references to other external modules/libraries used by this source file (by using `require` or `import` keywords), which do not belong to this same application that this source file is part of",
    PUBLIC_CONSTANTS:
      "A list of any exported constants or configuration values defined in this file",
    PUBLIC_METHODS: "A list of any exported functions or procedures defined in this file",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - Express route definitions (app.get, app.post, app.put, app.delete, router.use)
    - Fastify route definitions (fastify.get, fastify.post, etc.)
    - Koa route definitions (router.get, router.post, etc.)
    - NestJS decorators (@Get, @Post, @Put, @Delete, @Patch, @Controller)
    - HTTP client calls (fetch, axios, request, superagent, got)
  * GraphQL (mechanism: 'GRAPHQL'):
    - Schema definitions (type Query, type Mutation, resolvers)
    - Apollo Server or GraphQL Yoga setup
    - GraphQL client usage (Apollo Client, urql)
  * tRPC (mechanism: 'TRPC'):
    - Procedure definitions (publicProcedure, protectedProcedure)
    - Router definitions
  * WebSockets (mechanism: 'WEBSOCKET'):
    - Socket.io usage (io.on, socket.emit)
    - ws library (WebSocket server/client)
    - WebSocket API usage
  * Messaging Systems:
    - RabbitMQ (amqplib): Channel.sendToQueue, consume => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - Kafka (kafkajs): producer.send, consumer.subscribe => 'KAFKA-TOPIC'
    - AWS SQS/SNS (aws-sdk): sendMessage, subscribe => 'AWS-SQS' or 'AWS-SNS'
    - Redis Pub/Sub: publish, subscribe => 'REDIS-PUBSUB'
  * gRPC (mechanism: 'GRPC'):
    - @grpc/grpc-js usage, service definitions
  * Server-Sent Events (mechanism: 'SSE'):
    - res.writeHead with text/event-stream`,
    DB_MECHANISM_MAPPING: `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:
      - Uses Mongoose schemas/models (mongoose.model, Schema) => mechanism: 'MONGOOSE'
      - Uses Prisma Client (PrismaClient, prisma.user.findMany) => mechanism: 'PRISMA'
      - Uses TypeORM (Repository, EntityManager, @Entity decorators) => mechanism: 'TYPEORM'
      - Uses Sequelize models (sequelize.define, Model.findAll) => mechanism: 'SEQUELIZE'
      - Uses Knex query builder (knex.select, knex('table')) => mechanism: 'KNEX'
      - Uses Drizzle ORM (drizzle, select, insert) => mechanism: 'DRIZZLE'
      - Uses Redis client (redis.set, redis.get, ioredis) => mechanism: 'REDIS'
      - Uses Elasticsearch client (@elastic/elasticsearch, client.search) => mechanism: 'ELASTICSEARCH'
      - Uses Cassandra driver (cassandra-driver, client.execute with CQL) => mechanism: 'CASSANDRA-CQL'
      - Uses MongoDB driver directly (MongoClient, db.collection) without Mongoose => mechanism: 'MQL'
      - Contains raw SQL strings without ORM => mechanism: 'SQL'
      - Uses generic database driver (pg, mysql2, tedious) without ORM => mechanism: 'DRIVER'
      - Defines DDL / migration scripts => mechanism: 'DDL'
      - Performs data manipulation (bulk operations, seeding) => mechanism: 'DML'
     - Otherwise, if no database interaction => mechanism: 'NONE'`,
  },

  CSHARP_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other application classes - fully qualified type names (only include 'using' directives that clearly belong to this same application's code – exclude BCL / System.* and third-party packages)",
    EXTERNAL_REFS:
      "A list of the external references to 3rd party / NuGet package classes (Fully qualified type names) it depends on (exclude System.* where possible)",
    PUBLIC_CONSTANTS:
      "A list of public constants / readonly static fields (if any) – include name, value (redact secrets), and a short type/role description",
    PUBLIC_METHODS:
      "A list of its public methods (if any) – for each method list: name, purpose (detailed), parameters (name and type), return type, async/sync indicator, and a very detailed implementation description highlighting notable control flow, LINQ queries, awaits, exception handling, and important business logic decisions",
    KIND_OVERRIDE: "Its kind ('class', 'interface', 'record', or 'struct')",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - ASP.NET Core MVC/Web API controller actions with [HttpGet], [HttpPost], [HttpPut], [HttpDelete], [HttpPatch], [Route]
    - ASP.NET Core Minimal API endpoints (MapGet, MapPost, MapPut, MapDelete)
    - HTTP client calls (HttpClient, RestSharp, Refit interfaces)
  * WCF/SOAP Services (mechanism: 'SOAP'):
    - WCF service contracts ([ServiceContract], [OperationContract])
    - SOAP service references, WCF client proxies
    - BasicHttpBinding, WSHttpBinding configurations
  * Messaging Systems:
    - Azure Service Bus (ServiceBusClient, QueueClient for queues, TopicClient for topics) => 'AZURE-SERVICE-BUS-QUEUE' or 'AZURE-SERVICE-BUS-TOPIC'
    - RabbitMQ.Client usage (IModel.BasicPublish, BasicConsume) => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - MSMQ (MessageQueue class) => 'OTHER' (specify MSMQ in description and protocol)
    - AWS SQS/SNS (AWSSDK) => 'AWS-SQS' or 'AWS-SNS'
  * gRPC (mechanism: 'GRPC'):
    - Grpc.Net.Client, Grpc.Core service definitions
   - gRPC client stubs and service implementations`,
    DB_MECHANISM_MAPPING: `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:
      - Uses Entity Framework / EF Core (DbContext, LINQ-to-Entities, DbSet) => mechanism: 'EF-CORE'
      - Uses Dapper extension methods (Query<T>, Execute, QueryAsync) => mechanism: 'DAPPER'
      - Uses other micro ORMs (NPoco, ServiceStack.OrmLite, PetaPoco) => mechanism: 'MICRO-ORM'
      - Uses ADO.NET primitives (SqlConnection, SqlCommand, DataReader) without ORM => mechanism: 'ADO-NET'
      - Executes raw SQL strings or stored procedures via SqlCommand => mechanism: 'SQL'
      - Invokes stored procedures explicitly (CommandType.StoredProcedure) => mechanism: 'STORED-PROCEDURE'
      - Uses database provider drivers directly (NpgsqlConnection, MySqlConnection) without abstraction => mechanism: 'DRIVER'
      - Contains EF Core migrations or explicit DDL (CREATE/ALTER/DROP TABLE) => mechanism: 'DDL'
      - Performs data manipulation operations (bulk INSERT, SqlBulkCopy) => mechanism: 'DML'
      - Creates or invokes database functions => mechanism: 'FUNCTION'
      - Uses Redis client (StackExchange.Redis) => mechanism: 'REDIS'
      - Uses Elasticsearch.Net client => mechanism: 'ELASTICSEARCH'
      - Otherwise when no DB interaction present => mechanism: 'NONE'`,
  },

  PYTHON_SPECIFIC: {
    INTERNAL_REFS:
      "A list of internal references (imports that belong to this same project; exclude Python stdlib & third‑party packages)",
    EXTERNAL_REFS:
      "A list of external references (third‑party libraries imported; exclude stdlib modules like sys, os, json, typing, pathlib, re, math, datetime, logging, asyncio, dataclasses, functools, itertools)",
    PUBLIC_CONSTANTS:
      "A list of public constants (UPPERCASE module-level assignments; include name, redacted value, brief type/role)",
    PUBLIC_METHODS:
      "A list of its public functions/methods – for each include: name, purpose (detailed), parameters (name + type hint or inferred type; if no hint, describe expected type), returnType (type hint or inferred description of returned value shape), implementation (very detailed explanation of logic, branches, important data transformations, exception handling), cyclomaticComplexity (see rules), linesOfCode (exclude blank lines & comments), codeSmells (if any; use EXACT enum labels)",
    KIND_OVERRIDE:
      "Its kind ('class', 'module', 'function', or 'package'; choose the dominant one)",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - Flask @app.route decorators (path, methods)
    - FastAPI endpoint decorators (@app.get/post/put/delete/patch)
    - Django REST Framework views / viewsets (method names, URL pattern if inferable)
    - aiohttp route registrations
    - HTTP client calls (requests/httpx/aiohttp ClientSession)
  * GraphQL (mechanism: 'GRAPHQL'): Graphene / Strawberry schema & resolver definitions
  * gRPC (mechanism: 'GRPC'): grpc.* Servicer classes, stub usage
  * Messaging: Celery tasks (@app.task) => mechanism 'OTHER' (specify Celery); RabbitMQ (pika), Kafka (producer/consumer), Redis Pub/Sub (redis.publish/subscribe), AWS SQS/SNS (boto3)
  * WebSockets (mechanism: 'WEBSOCKET'): FastAPI WebSocket endpoints, Django Channels consumers
  * Server-Sent Events (mechanism: 'SSE'): streaming responses with 'text/event-stream'`,
    DB_MECHANISM_MAPPING: `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:
      - SQLAlchemy ORM (Session, declarative Base) => 'SQLALCHEMY'
      - Django ORM (models.Model, QuerySet) => 'DJANGO-ORM'
      - Raw DB-API / driver (psycopg2, mysqlclient, sqlite3) => 'DRIVER' or 'SQL' (if many inline SQL strings)
      - Async drivers (asyncpg, aiomysql) => 'DRIVER'
      - Inline CREATE/ALTER => also 'DDL'
      - Bulk data scripts => also 'DML'
      - Stored procedure/function invocation (CALL/EXEC) => 'STORED-PROCEDURE' or 'FUNCTION'
      - No database access => 'NONE'`,
    PYTHON_COMPLEXITY_METRICS: `Cyclomatic complexity (Python):
- Start at 1; +1 for each if / elif / for / while / except / finally / with (when it controls resource flow) / comprehension 'for' / ternary / logical operator (and/or) in a condition / match case arm
- +1 for each additional 'if' inside a comprehension
For each public function/method capture: cyclomaticComplexity, linesOfCode, and codeSmells
File-level metrics: totalMethods, averageComplexity, maxComplexity, averageMethodLength, fileSmells (e.g. 'LARGE FILE', 'TOO MANY METHODS', 'GOD CLASS', 'FEATURE ENVY')`,
  },

  RUBY_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other Ruby source files in the same project that this file depends on (only include paths required via require or require_relative that clearly belong to this same application; exclude Ruby standard library and external gem dependencies)",
    EXTERNAL_REFS:
      "A list of the external references to gem / third-party libraries it depends on (as required via require / require_relative) that are NOT part of this application's own code (exclude Ruby standard library modules)",
    PUBLIC_CONSTANTS:
      "A list of public (non-internal) constants it defines (if any) – for each constant include its name, value (redact secrets), and a short type/role description",
    PUBLIC_METHODS:
      "A list of its public methods (if any) – for each method include: name, purpose (in detail), its parameters (with names), what it returns (describe the value; Ruby is dynamically typed so describe the shape / meaning), and a very detailed description of how it is implemented / key logic / important guards or conditionals",
    KIND_OVERRIDE: "Its kind ('class', 'module', or 'enum')",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - Rails controller actions (routes.rb get/post/put/delete/patch, controller action methods)
    - Sinatra route definitions (get, post, put, delete, patch blocks)
    - Grape API endpoints (get, post, put, delete, patch declarations)
    - HTTP client calls (Net::HTTP, RestClient, HTTParty, Faraday)
  * GraphQL (mechanism: 'GRAPHQL'):
    - GraphQL type definitions (GraphQL::ObjectType, field definitions)
    - GraphQL mutations and queries
  * SOAP (mechanism: 'SOAP'):
    - Savon SOAP client usage
    - SOAP service definitions
  * Messaging Systems:
    - RabbitMQ (bunny gem): channel.queue, publish => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - Redis Pub/Sub: redis.publish, subscribe => 'REDIS-PUBSUB'
    - AWS SQS/SNS (aws-sdk) => 'AWS-SQS' or 'AWS-SNS'
  * WebSockets (mechanism: 'WEBSOCKET'):
    - Action Cable channels
    - WebSocket-Rails usage`,
    DB_MECHANISM_MAPPING: `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:
      - Uses ActiveRecord (models, migrations, associations, where/find methods) => mechanism: 'ACTIVE-RECORD'
      - Uses Sequel ORM (DB[:table], dataset operations) => mechanism: 'SEQUEL'
      - Uses other Ruby ORM / micro ORM (ROM.rb, DataMapper) => mechanism: 'ORM' (or 'MICRO-ORM' if lightweight)
      - Uses Redis client (redis-rb, redis.set/get) => mechanism: 'REDIS'
      - Executes raw SQL strings (SELECT / INSERT / etc.) => mechanism: 'SQL'
      - Invokes stored procedures (via connection.exec with CALL) => mechanism: 'STORED-PROCEDURE'
      - Uses database driver / adapter directly (PG gem, mysql2 gem) without ORM => mechanism: 'DRIVER'
      - Defines migration DSL (create_table, add_column, change_table) => mechanism: 'DDL'
      - Performs data manipulation (bulk insert helpers, seeding, data-only scripts) => mechanism: 'DML'
      - Creates or manages triggers (via execute or DSL) => mechanism: 'TRIGGER'
      - Creates or invokes functions / stored routines => mechanism: 'FUNCTION'
      - Otherwise, if no database interaction is evident => mechanism: 'NONE'`,
  },

  SQL_SPECIFIC: {
    TABLE_LIST:
      "A list of the tables (if any) it defines - for each table, include the names of the table's fields, if known",
    STORED_PROCEDURE_LIST:
      "A list of the stored procedure (if any) it defines - for each stored procedure, include the stored procedure's name, its purpose, the number of lines of code in the stored procedure, and a complexity score or how complex the stored procedure's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score",
    TRIGGER_LIST:
      "A list of the triggers (if any) it defines - for each trigger, include the trigger's name, its purpose, the number of lines of code in the trigger, and a complexity score or how complex the trigger's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score",
    DB_INTEGRATION_ANALYSIS: `Database Integration Analysis (REQUIRED) - Extract ALL possible database details:
IMPORTANT: databaseIntegration must be a SINGLE OBJECT (not an array). If multiple integration mechanisms exist in the file (e.g., both STORED-PROCEDURE and DDL), combine them into one object:
  - mechanism: Use the primary mechanism (or combine related mechanisms in the description)
  - description: Include details about ALL integration mechanisms present
  - codeExample: Include examples from all relevant mechanisms
  - tablesAccessed: Merge all tables accessed across all mechanisms
  - operationType: Merge all operation types across mechanisms

REQUIRED: mechanism (must be 'NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER'), description (detailed explanation covering all mechanisms if multiple exist), codeExample (max 6 lines, can include examples from multiple mechanisms)
STRONGLY RECOMMENDED (extract whenever possible): databaseName (specific database/schema name if mentioned), tablesAccessed (array of table names from queries or DDL), operationType (array: ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'CREATE TABLE statements', 'INSERT/UPDATE operations', 'complex joins', 'stored procedures'), transactionHandling (e.g., 'explicit BEGIN/COMMIT', 'auto-commit', 'none'), protocol (database type and version if identifiable, e.g., 'PostgreSQL 14', 'MySQL 8.0', 'SQL Server 2019', 'Oracle 19c'), connectionInfo ('not applicable for SQL files' or specific connection details if present)`,
  },

  XML_SPECIFIC: {
    UI_FRAMEWORK_DETECTION: `UI Frameworks Detection (REQUIRED for web application config files)
If this XML file is a web application configuration file, you MUST analyze and identify the UI framework:
  * Struts Framework Detection:
    - Look for <servlet-class> containing "org.apache.struts.action.ActionServlet" or "StrutsPrepareAndExecuteFilter"
    - Check for <servlet-name> with "action" or "struts"
    - Look for DOCTYPE or root element referencing struts-config
    - Extract version from DTD/XSD if available (e.g., "struts-config_1_3.dtd" => version "1.3")
    - If detected, provide: { name: "Struts", version: "X.X" (if found), configFile: <current file path> }
  * JSF (JavaServer Faces) Framework Detection:
    - Look for <servlet-class> containing "javax.faces.webapp.FacesServlet" or "jakarta.faces.webapp.FacesServlet"
    - Check for root element <faces-config> in faces-config.xml
    - Extract version from namespace (e.g., "http://xmlns.jcp.org/xml/ns/javaee" with version="2.2")
    - If detected, provide: { name: "JSF", version: "X.X" (if found), configFile: <current file path> }
  *Spring MVC Framework Detection:
    - Look for <servlet-class> containing "org.springframework.web.servlet.DispatcherServlet"
    - Check for root element containing "http://www.springframework.org/schema/mvc"
    - Look for annotations like @Controller, @RequestMapping in servlet definitions
    - If detected, provide: { name: "Spring MVC", version: <if identifiable>, configFile: <current file path> }
If a UI framework is detected, populate the uiFramework field. Otherwise, omit the field entirely from the JSON response.`,
  },

  JSP_SPECIFIC: {
    DATA_INPUT_FIELDS:
      "A list of data input fields it contains (if any). For each field, provide its name (or an approximate name), its type (e.g., 'text', 'hidden', 'password'), and a detailed description of its purpose",
    JSP_METRICS_ANALYSIS: `JSP Metrics Analysis (REQUIRED for all JSP files)
You MUST analyze and provide the following JSP metrics in the jspMetrics object:
  * scriptletCount (REQUIRED): Count the exact number of Java scriptlets (<% ... %>) in this file
  * expressionCount (REQUIRED): Count the exact number of expressions (<%= ... %>) in this file
  * declarationCount (REQUIRED): Count the exact number of declarations (<%! ... %>) in this file
  * customTags (REQUIRED if any exist): For each <%@ taglib ... %> directive, extract:
    - prefix: The tag library prefix from the taglib directive
    - uri: The URI of the tag library from the taglib directive
   Examples:
    - <%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %> => { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }
    - <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %> => { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" }
    - <%@ taglib prefix="custom" uri="/WEB-INF/custom.tld" %> => { prefix: "custom", uri: "/WEB-INF/custom.tld" }
   Note: Do NOT count directive tags (<%@ ... %>) or action tags (<jsp:... />) as scriptlets. Only count code blocks with <% %>, <%= %>, and <%! %>.`,
  },

  SHELL_SCRIPT_SPECIFIC: {
    CRON_EXPRESSIONS:
      "Look for cron expressions in comments like '# Cron: 0 2 * * *' or systemd timer references",
    DATABASE_OPS: "Identify database operations (mysql, psql, mongo commands)",
    EXTERNAL_API_CALLS: "Note any external API calls (curl, wget)",
  },

  BATCH_SCRIPT_SPECIFIC: {
    TASK_SCHEDULER: "Look for Windows Task Scheduler references (schtasks, AT commands)",
    DATABASE_OPS: "Identify database operations (sqlcmd, osql, BCP)",
    NETWORK_OPS: "Note network operations (NET USE, COPY to UNC paths)",
    SERVICE_OPS: "Identify service operations (NET START, SC commands)",
  },

  JCL_SPECIFIC: {
    EXEC_STATEMENTS: "Extract all EXEC statements to identify programs/procedures called",
    DD_STATEMENTS: "Identify DD statements for file I/O",
    COND_PARAMETERS: "Note COND parameters that indicate job dependencies",
    SORT_UTILITIES: "Look for SORT, IEBGENER, or custom program calls",
  },

  DEPENDENCY_EXTRACTION: {
    MAVEN: `A comprehensive list of dependencies declared in this POM file - for each dependency extract:
  * name (artifactId)
  * groupId
  * version (resolve properties if possible, e.g., \${spring.version})
  * scope (compile, test, runtime, provided, import, system)
  * type (jar, war, pom, etc.)
  Note: Extract dependencies from both <dependencies> and <dependencyManagement> sections`,
    GRADLE: `A comprehensive list of dependencies declared - for each dependency extract:
  * name (artifact name after the colon, e.g., for 'org.springframework:spring-core:5.3.9' the name is 'spring-core')
  * groupId (group before the colon, e.g., 'org.springframework')
  * version (version number, or 'latest' if using dynamic versions)
  * scope (implementation, api, testImplementation, runtimeOnly, etc. - map these to standard Maven scopes)
  Handle both Groovy DSL and Kotlin DSL syntax`,
    ANT: `A comprehensive list of dependencies declared - for each dependency extract:
  * name (jar file name or artifact name)
  * groupId (organization or project name if specified)
  * version (extract from jar filename if versioned, e.g., 'commons-lang3-3.12.0.jar' -> version: '3.12.0')
  * scope (compile, test, runtime based on classpath definitions)
  Look for dependencies in <classpath>, <path>, <pathelement>, and <ivy:dependency> elements`,
    NPM: `A comprehensive list of dependencies - for each dependency extract:
  * name (package name)
  * version (semver version, remove ^ and ~ prefixes)
  * scope (dependencies = 'compile', devDependencies = 'test', peerDependencies = 'provided')
  Extract from both dependencies and devDependencies sections`,
    DOTNET: `A comprehensive list of PackageReference dependencies - for each dependency extract:
  * name (package name from Include attribute)
  * version (Version attribute value)
  * scope (compile for regular, test if in test project based on SDK type)
  Look for <PackageReference> elements in modern SDK-style projects`,
    NUGET: `A comprehensive list of package dependencies - for each package extract:
  * name (id attribute)
  * version (version attribute)
  * scope (compile, or test if targetFramework suggests test package)
  Parse all <package> elements in the configuration`,
    RUBY_BUNDLER: `A comprehensive list of gem dependencies - for each gem extract:
  * name (gem name)
  * version (specified version or version from Gemfile.lock, remove ~> and >= prefixes)
  * scope (default is 'compile', :development = 'test', :test = 'test')
  * groupId (use 'rubygems' as a standard groupId)
  Parse gem declarations including version constraints`,
    PYTHON_PIP: `A comprehensive list of package dependencies - for each package extract:
  * name (package name before == or >= or ~=)
  * version (version specifier, remove operators like ==, >=, ~=)
  * scope (default is 'compile', dev dependencies in Pipfile have scope 'test')
  * groupId (use 'pypi' as standard groupId)
  Handle various version specifiers: ==, >=, <=, ~=, and ranges`,
    PYTHON_SETUP: `A comprehensive list of dependencies from install_requires - for each package extract:
  * name (package name)
  * version (version from string, remove operators)
  * scope ('compile' for install_requires, 'test' for tests_require or extras_require['test'])
  * groupId (use 'pypi' as standard groupId)`,
    PYTHON_POETRY: `A comprehensive list of dependencies from [tool.poetry.dependencies] - for each dependency extract:
  * name (dependency key name)
  * version (version constraint, remove ^ and ~ prefixes)
  * scope ('compile' for dependencies, 'test' for dev-dependencies)
  * groupId (use 'pypi' as standard groupId)`,
  },
} as const;

/**
 * Composable instruction sets for common patterns across file types
 */
export const CODE_QUALITY_INSTRUCTIONS = [
  SOURCES_FRAGMENTS.CODE_QUALITY.INTRO,
  SOURCES_FRAGMENTS.CODE_QUALITY.METHOD_METRICS,
  SOURCES_FRAGMENTS.CODE_QUALITY.METHOD_SMELLS,
  SOURCES_FRAGMENTS.CODE_QUALITY.FILE_METRICS,
] as const;

export const DB_INTEGRATION_INSTRUCTIONS = [
  SOURCES_FRAGMENTS.DB_INTEGRATION.INTRO,
  SOURCES_FRAGMENTS.DB_INTEGRATION.REQUIRED_FIELDS,
] as const;

export const INTEGRATION_POINTS_INSTRUCTIONS = [
  SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
] as const;

export const SCHEDULED_JOBS_INSTRUCTIONS = [
  SOURCES_FRAGMENTS.SCHEDULED_JOBS.INTRO,
  SOURCES_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
] as const;

/**
 * Common instruction sets for coding languages with class/interface structures
 * (Java, C#, etc.). Includes name, kind, namespace extraction.
 */
export const CLASS_LANGUAGE_BASE_INSTRUCTIONS = [
  "The name of the main public class/interface of the file",
  "Its kind ('class' or 'interface')",
  "Its namespace (classpath)",
] as const;

/**
 * Common instruction sets for coding languages with module structures
 * (Python, Ruby, etc.). Includes name, kind, namespace extraction.
 */
export const MODULE_LANGUAGE_BASE_INSTRUCTIONS = [
  "The name of the primary public entity of the file (class, module, or main function)",
  "Its kind ('class', 'module', or enum; choose the dominant one)",
  "Its namespace (fully qualified module path)",
] as const;

/**
 * Common instruction fragments used across multiple app summary templates
 * These are composed into instruction arrays for consistency
 */
export const APP_SUMMARY_FRAGMENTS = {
  DETAILED_DESCRIPTION: "a detailed description of the application's purpose and implementation",
  CONCISE_LIST: "a concise list",
  COMPREHENSIVE_LIST: "a comprehensive list",
  COMPREHENSIVE_ANALYSIS: "a comprehensive analysis",
  AGGREGATED_METRICS:
    "aggregated code quality metrics including complexity analysis, code smell detection, and maintainability indicators to help prioritize refactoring efforts",
  DEPENDENCY_MATRIX:
    "a dependency matrix showing coupling relationships between modules to identify highly coupled components (candidates for single services) and loosely coupled components (candidates for easy separation)",
} as const;
