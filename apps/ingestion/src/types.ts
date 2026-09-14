export interface IngestionEnv {
  DB: D1Database;
  AI: Ai;
  QUEUE_INGESTION: Queue;
  ENVIRONMENT: string;
}
