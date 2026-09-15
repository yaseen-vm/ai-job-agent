CREATE TABLE IF NOT EXISTS tailored_resumes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')),
  resume_data TEXT,
  apply_fields TEXT,
  error       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tailored_resumes_user_job ON tailored_resumes(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_user ON tailored_resumes(user_id, created_at DESC);
