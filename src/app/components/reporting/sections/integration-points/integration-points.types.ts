// Interface representing integration point information (APIs, queues, topics, SOAP, etc.)
export interface IntegrationPointInfo extends Record<string, unknown> {
  readonly namespace: string;
  readonly filepath: string;
  readonly mechanism: string;
  readonly name: string;
  readonly description: string;
  readonly path?: string;
  readonly method?: string;
  readonly queueOrTopicName?: string;
  readonly messageType?: string;
  readonly direction?: string;
  readonly requestBody?: string;
  readonly responseBody?: string;
  readonly authentication?: string;
  readonly protocol?: string;
  readonly connectionInfo?: string;
}
