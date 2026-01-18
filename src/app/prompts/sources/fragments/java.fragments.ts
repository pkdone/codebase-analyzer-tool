import { createDbMechanismInstructions } from "../source-instruction-utils";
import type { LanguageSpecificFragments } from "../sources.fragments";
import { MECHANISM_DESCRIPTIONS } from "./common.fragments";

/**
 * Java-specific instruction fragments.
 * @satisfies {LanguageSpecificFragments}
 */
export const JAVA_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = {
  INTERNAL_REFS:
    "A list of the internal references to the classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)",
  EXTERNAL_REFS:
    "A list of the external references to third-party classpath used by this source file, which do not belong to this same application that this class/interface file is part of",
  PUBLIC_METHODS:
    "A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation",
  PUBLIC_CONSTANTS: "A list of public constants (name, value and type) it defines (if any)",
  INTEGRATION_INSTRUCTIONS: `  * REST APIs ${MECHANISM_DESCRIPTIONS.REST}:
    - JAX-RS annotations (@Path, @GET, @POST, @PUT, @DELETE, @PATCH) - include path, method, request/response body
    - Spring annotations (@RestController, @RequestMapping, @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping)
    - Servlet mappings (web.xml or @WebServlet) - include URL patterns
    - HTTP client calls (RestTemplate, WebClient, HttpClient, OkHttp, Feign @FeignClient)
  * SOAP Services ${MECHANISM_DESCRIPTIONS.SOAP}:
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
  * WebSockets ${MECHANISM_DESCRIPTIONS.WEBSOCKET}:
    - @ServerEndpoint annotations - include endpoint path
    - WebSocketHandler implementations
  * gRPC ${MECHANISM_DESCRIPTIONS.GRPC}:
    - @GrpcService annotations or gRPC stub usage - include service name, methods`,
  DB_MECHANISM_MAPPING: createDbMechanismInstructions(
    [
      "      - Uses JDBC driver / JDBC API classes => mechanism: 'JDBC'",
      "      - Uses Spring Data repositories (CrudRepository, JpaRepository, MongoRepository, etc.) => mechanism: 'SPRING-DATA'",
      "      - Uses Hibernate API directly (SessionFactory, Session, Criteria API) => mechanism: 'HIBERNATE'",
      "      - Uses standard JPA annotations and EntityManager (without Spring Data) => mechanism: 'JPA'",
      "      - Uses Enterprise Java Beans for persistence (CMP/BMP, @Entity with EJB) => mechanism: 'EJB'",
      "      - Contains inline SQL strings / queries (SELECT / UPDATE / etc.) without ORM => mechanism: 'SQL'",
      "      - Uses raw database driver APIs (DataSource, Connection, etc.) without higher abstraction => mechanism: 'DRIVER'",
      "      - Uses other JPA-based ORMs (TopLink, EclipseLink) not clearly Hibernate => mechanism: 'ORM'",
      "      - Defines DDL / migration style schema changes inline => mechanism: 'DDL'",
      "      - Executes DML specific batch / manipulation blocks distinct from generic SQL => mechanism: 'DML'",
      "      - Invokes stored procedures (CallableStatement, @Procedure, etc.) => mechanism: 'STORED-PROCEDURE'",
      "      - Creates or manages database triggers => mechanism: 'TRIGGER'",
      "      - Creates or invokes database functions => mechanism: 'FUNCTION'",
      "      - Uses Redis client (Jedis, Lettuce) => mechanism: 'REDIS'",
      "      - Uses Elasticsearch client (RestHighLevelClient, ElasticsearchTemplate) => mechanism: 'ELASTICSEARCH'",
      "      - Uses Cassandra CQL (CqlSession, @Query with CQL) => mechanism: 'CASSANDRA-CQL'",
      "      - Uses a 3rd party framework not otherwise categorized => mechanism: 'OTHER'",
    ],
    "    (note, JMS and JNDI are not related to interacting with a database)",
  ),
};
