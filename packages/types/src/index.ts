// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: number;
  updated_at: number;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export type RemotePreference = 'remote' | 'hybrid' | 'onsite' | 'any';
export type EmploymentType = 'full_time' | 'contract' | 'part_time';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
  years_experience: number | null;
  preferred_roles: string[];
  preferred_locations: string[];
  remote_preference: RemotePreference | null;
  min_salary: number | null;
  employment_types: EmploymentType[];
  resume_r2_key: string | null;
  resume_extracted_at: number | null;
  created_at: number;
  updated_at: number;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type RemoteType = 'remote' | 'hybrid' | 'onsite';

export interface Job {
  id: string;
  source_name: string;
  source_job_id: string | null;
  source_url: string;
  title: string;
  company: string;
  location: string | null;
  remote: RemoteType | null;
  employment_type: EmploymentType | null;
  description: string | null;
  required_skills: string[];
  preferred_skills: string[];
  min_salary: number | null;
  max_salary: number | null;
  salary_currency: string | null;
  posted_at: number | null;
  expires_at: number | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ─── Saved Jobs ───────────────────────────────────────────────────────────────

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  saved_at: number;
}

// ─── Match Scores ─────────────────────────────────────────────────────────────

export interface MatchScore {
  id: string;
  user_id: string;
  job_id: string;
  score: number;
  explanation: string | null;
  missing_skills: string[];
  concerns: string[];
  generated_at: number;
}

// ─── Applications ─────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'saved'
  | 'preparing'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  source: string | null;
  notes: string | null;
  applied_at: number | null;
  created_at: number;
  updated_at: number;
}

export type ApplicationEventType = 'status_change' | 'note' | 'reminder';

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: ApplicationEventType;
  payload: unknown;
  occurred_at: number;
}

// ─── Agent Runs ───────────────────────────────────────────────────────────────

export type AgentType = 'extraction' | 'matching' | 'ranking' | 'draft' | 'discovery';
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentRun {
  id: string;
  user_id: string | null;
  agent_type: AgentType;
  status: AgentStatus;
  input: unknown;
  output: unknown;
  tool_calls: AgentToolCall[];
  model: string | null;
  error: string | null;
  started_at: number;
  completed_at: number | null;
}

export interface AgentToolCall {
  tool: string;
  input: unknown;
  output: unknown;
}

// ─── Queue Messages ───────────────────────────────────────────────────────────

export interface ExtractionMessage {
  type: 'extraction';
  user_id: string;
  resume_r2_key: string;
  agent_run_id: string;
}

export interface MatchingMessage {
  type: 'matching';
  user_id: string;
  job_id: string;
  agent_run_id: string;
}

export interface RankingMessage {
  type: 'ranking';
  user_id: string;
  agent_run_id: string;
}

export interface DraftMessage {
  type: 'draft';
  user_id: string;
  job_id: string;
  draft_type: 'cover_letter' | 'summary';
  agent_run_id: string;
}

export interface DiscoveryMessage {
  type: 'discovery';
  source_name: string;
}

export type AgentMessage =
  | ExtractionMessage
  | MatchingMessage
  | RankingMessage
  | DraftMessage;

export type IngestionMessage = DiscoveryMessage | { type: 'extraction'; source_name: string; raw_job: unknown };

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  jobs?: T[];
  total: number;
  limit: number;
  offset: number;
}
