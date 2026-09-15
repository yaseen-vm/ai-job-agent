export interface ApifyEnv {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
  VECTORIZE_JOBS: VectorizeIndex;
  APIFY_API_TOKEN: string;
  ENVIRONMENT: string;
}

export interface PendingRun {
  userId: string;
  searchTerm: string;
  dispatchedAt: number;
}

export interface NormalizedJob {
  source_name: string;
  source_job_id: string;
  source_url: string;
  title: string;
  company: string;
  location: string | null;
  remote: 'remote' | 'hybrid' | 'onsite';
  employment_type: 'full_time' | 'contract' | 'part_time' | null;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  min_salary: number | null;
  max_salary: number | null;
  salary_currency: string | null;
  posted_at: number | null;
}
