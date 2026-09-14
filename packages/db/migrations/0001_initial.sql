-- Users
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name            TEXT,
  headline             TEXT,
  summary              TEXT,
  skills               TEXT NOT NULL DEFAULT '[]',
  years_experience     INTEGER,
  preferred_roles      TEXT NOT NULL DEFAULT '[]',
  preferred_locations  TEXT NOT NULL DEFAULT '[]',
  remote_preference    TEXT CHECK(remote_preference IN ('remote','hybrid','onsite','any')),
  min_salary           INTEGER,
  employment_types     TEXT NOT NULL DEFAULT '[]',
  resume_r2_key        TEXT,
  resume_extracted_at  INTEGER,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id               TEXT PRIMARY KEY,
  source_name      TEXT NOT NULL,
  source_job_id    TEXT,
  source_url       TEXT NOT NULL,
  title            TEXT NOT NULL,
  company          TEXT NOT NULL,
  location         TEXT,
  remote           TEXT CHECK(remote IN ('remote','hybrid','onsite')),
  employment_type  TEXT CHECK(employment_type IN ('full_time','contract','part_time')),
  description      TEXT,
  required_skills  TEXT NOT NULL DEFAULT '[]',
  preferred_skills TEXT NOT NULL DEFAULT '[]',
  min_salary       INTEGER,
  max_salary       INTEGER,
  salary_currency  TEXT,
  posted_at        INTEGER,
  expires_at       INTEGER,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_name, source_job_id)
  WHERE source_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

-- Saved Jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id   TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON saved_jobs(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);

-- Match Scores
CREATE TABLE IF NOT EXISTS match_scores (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id       TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  score        REAL NOT NULL,
  explanation  TEXT,
  missing_skills TEXT NOT NULL DEFAULT '[]',
  concerns     TEXT NOT NULL DEFAULT '[]',
  generated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_scores_user_job ON match_scores(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_user ON match_scores(user_id, score DESC);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK(status IN ('saved','preparing','applied','interviewing','offer','rejected','withdrawn')),
  source     TEXT,
  notes      TEXT,
  applied_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_user_job ON applications(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

-- Application Events
CREATE TABLE IF NOT EXISTS application_events (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL CHECK(event_type IN ('status_change','note','reminder')),
  payload        TEXT,
  occurred_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_events_app ON application_events(application_id, occurred_at);

-- Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  agent_type   TEXT NOT NULL CHECK(agent_type IN ('extraction','matching','ranking','draft','discovery')),
  status       TEXT NOT NULL CHECK(status IN ('pending','running','completed','failed')) DEFAULT 'pending',
  input        TEXT,
  output       TEXT,
  tool_calls   TEXT NOT NULL DEFAULT '[]',
  model        TEXT,
  error        TEXT,
  started_at   INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
