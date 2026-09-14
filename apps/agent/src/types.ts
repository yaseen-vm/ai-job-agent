export interface AgentEnv {
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  BEDROCK_MODEL_ID: string;
  ENVIRONMENT: string;
}
