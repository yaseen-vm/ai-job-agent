export interface IngestionEnv {
  DB: D1Database;
  AI: Ai;
  VECTORIZE_JOBS: VectorizeIndex;
  ENVIRONMENT: string;
}
