# AI Job Agent — Data Model

All relational data lives in **Cloudflare D1** (SQLite). Binary/document storage uses **Cloudflare R2**. Vector embeddings live in **Cloudflare Vectorize**.

---

## D1 Tables

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `email` | TEXT UNIQUE NOT NULL | |
| `password_hash` | TEXT NOT NULL | bcrypt hash |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

---

### `profiles`
One row per user. Structured data extracted from resume plus user-edited fields.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `user_id` | TEXT NOT NULL FK → users | UNIQUE |
| `full_name` | TEXT | |
| `headline` | TEXT | e.g. "Senior Backend Engineer" |
| `summary` | TEXT | |
| `skills` | TEXT | JSON array of strings |
| `years_experience` | INTEGER | |
| `preferred_roles` | TEXT | JSON array of strings |
| `preferred_locations` | TEXT | JSON array of strings |
| `remote_preference` | TEXT | `remote` \| `hybrid` \| `onsite` \| `any` |
| `min_salary` | INTEGER | Annual, local currency |
| `employment_types` | TEXT | JSON array: `full_time`, `contract`, `part_time` |
| `resume_r2_key` | TEXT | R2 object key for the uploaded resume file |
| `resume_extracted_at` | INTEGER | Unix ms of last AI extraction |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

---

### `jobs`
Canonical normalized job listing.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `source_name` | TEXT NOT NULL | e.g. `adzuna`, `apify_indeed`, `remotive`, `user` |
| `source_job_id` | TEXT | Provider's own job ID |
| `source_url` | TEXT NOT NULL | Original listing URL |
| `title` | TEXT NOT NULL | |
| `company` | TEXT NOT NULL | |
| `location` | TEXT | |
| `remote` | TEXT | `remote` \| `hybrid` \| `onsite` |
| `employment_type` | TEXT | `full_time` \| `contract` \| `part_time` |
| `description` | TEXT | Full normalized description |
| `required_skills` | TEXT | JSON array |
| `preferred_skills` | TEXT | JSON array |
| `min_salary` | INTEGER | |
| `max_salary` | INTEGER | |
| `salary_currency` | TEXT | ISO 4217 |
| `posted_at` | INTEGER | Unix ms |
| `expires_at` | INTEGER | Unix ms, nullable |
| `is_active` | INTEGER NOT NULL DEFAULT 1 | 0/1 boolean |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

Index: `(source_name, source_job_id)` UNIQUE — used for deduplication.

---

### `saved_jobs`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `user_id` | TEXT NOT NULL FK → users | |
| `job_id` | TEXT NOT NULL FK → jobs | |
| `saved_at` | INTEGER NOT NULL | Unix ms |

Index: `(user_id, job_id)` UNIQUE.

---

### `match_scores`
Cached AI-generated match results per user-job pair.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `user_id` | TEXT NOT NULL FK → users | |
| `job_id` | TEXT NOT NULL FK → jobs | |
| `score` | REAL NOT NULL | 0.0–1.0 |
| `explanation` | TEXT | Bedrock-generated summary |
| `missing_skills` | TEXT | JSON array |
| `concerns` | TEXT | JSON array |
| `generated_at` | INTEGER NOT NULL | Unix ms |

Index: `(user_id, job_id)` UNIQUE.

---

### `applications`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `user_id` | TEXT NOT NULL FK → users | |
| `job_id` | TEXT NOT NULL FK → jobs | |
| `status` | TEXT NOT NULL | See statuses below |
| `source` | TEXT | How the user found / applied |
| `notes` | TEXT | Free-form user notes |
| `applied_at` | INTEGER | Unix ms, set when status → applied |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

**Statuses:** `saved` · `preparing` · `applied` · `interviewing` · `offer` · `rejected` · `withdrawn`

Index: `(user_id, job_id)` UNIQUE.

---

### `application_events`
Immutable timeline of application state changes and notes.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `application_id` | TEXT NOT NULL FK → applications | |
| `event_type` | TEXT NOT NULL | `status_change`, `note`, `reminder` |
| `payload` | TEXT | JSON — status transition, note text, etc. |
| `occurred_at` | INTEGER NOT NULL | Unix ms |

---

### `subscriptions`
One row per user (UNIQUE on `user_id`). Created when an admin grants premium access.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `user_id` | TEXT NOT NULL UNIQUE FK → users | |
| `plan` | TEXT NOT NULL | `'premium'` only |
| `status` | TEXT NOT NULL | `active` \| `cancelled` \| `expired` |
| `started_at` | INTEGER NOT NULL | Unix ms |
| `expires_at` | INTEGER | Unix ms, nullable (no expiry = indefinite) |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

Indexes: `(user_id)`, `(status, expires_at)`.

---

### `agent_runs`
Audit trail for every AI agent invocation.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `user_id` | TEXT FK → users | nullable for system-triggered runs |
| `agent_type` | TEXT NOT NULL | `extraction`, `matching`, `ranking`, `draft`, `discovery` |
| `status` | TEXT NOT NULL | `pending` \| `running` \| `completed` \| `failed` |
| `input` | TEXT | JSON |
| `output` | TEXT | JSON |
| `tool_calls` | TEXT | JSON array of `{tool, input, output}` |
| `model` | TEXT | e.g. `anthropic.claude-opus-4-5` |
| `error` | TEXT | nullable |
| `started_at` | INTEGER NOT NULL | Unix ms |
| `completed_at` | INTEGER | Unix ms |

---

## R2 Objects

| Key pattern | Content |
|---|---|
| `resumes/{user_id}/{ulid}.{ext}` | Original uploaded resume file |
| `exports/{user_id}/{ulid}.pdf` | Generated application documents |

All R2 objects are private. Served only through signed or authenticated API Worker endpoints.

---

## Vectorize Indexes

| Index | Dimensions | Model | Content |
|---|---|---|---|
| `job-embeddings` | 768 | `@cf/baai/bge-base-en-v1.5` | Job title + description embedding |
| `profile-embeddings` | 768 | `@cf/baai/bge-base-en-v1.5` | Candidate profile summary embedding |

Metadata stored alongside each vector: `job_id` or `user_id` for lookup after nearest-neighbour search.
