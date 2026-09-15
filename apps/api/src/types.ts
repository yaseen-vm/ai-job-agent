export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: Ai;
  VECTORIZE_JOBS: VectorizeIndex;
  VECTORIZE_PROFILES: VectorizeIndex;
  JWT_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  BEDROCK_MODEL_ID: string;
  APIFY_API_TOKEN: string;
  ENVIRONMENT: string;
}
