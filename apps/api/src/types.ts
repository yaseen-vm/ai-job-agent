export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  QUEUE_INGESTION: Queue;
  QUEUE_AGENT: Queue;
  AI: Ai;
  JWT_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  ENVIRONMENT: string;
}
