# AI Job Agent — API Specification

Base URL: `https://api.ai-job-agent.workers.dev`

All endpoints require `Authorization: Bearer <jwt>` unless marked **public**. All request and response bodies are JSON. Timestamps are Unix milliseconds.

---

## Auth

### `POST /auth/register` — public
Register a new user.

**Request**
```json
{ "email": "user@example.com", "password": "..." }
```
**Response `201`**
```json
{ "token": "<jwt>", "user": { "id": "...", "email": "..." } }
```

### `POST /auth/login` — public
**Request**
```json
{ "email": "user@example.com", "password": "..." }
```
**Response `200`**
```json
{ "token": "<jwt>", "user": { "id": "...", "email": "..." } }
```

---

## Profile

### `GET /profile`
Return the current user's profile.

**Response `200`**
```json
{
  "id": "...",
  "full_name": "Jane Doe",
  "headline": "Senior Backend Engineer",
  "skills": ["Go", "TypeScript", "Postgres"],
  "years_experience": 6,
  "preferred_roles": ["Backend Engineer", "Platform Engineer"],
  "preferred_locations": ["London", "Remote"],
  "remote_preference": "remote",
  "min_salary": 90000,
  "employment_types": ["full_time"],
  "resume_r2_key": "resumes/usr_01.../abc.pdf",
  "updated_at": 1720000000000
}
```

### `PATCH /profile`
Update profile fields. Partial update — only send changed fields.

**Request** — any subset of profile fields.

**Response `200`** — updated profile object.

### `POST /profile/resume`
Upload a resume file. Triggers AI extraction agent via Queue.

**Request** — `multipart/form-data`, field `file` (PDF or DOCX, max 10 MB).

**Response `202`**
```json
{ "agent_run_id": "...", "resume_r2_key": "resumes/..." }
```

### `GET /profile/resume`
Return a short-lived pre-signed URL to download the stored resume.

**Response `200`**
```json
{ "url": "https://...", "expires_at": 1720003600000 }
```

---

## Jobs

### `GET /jobs`
Search and filter job listings.

**Query params**
| Param | Type | Description |
|---|---|---|
| `q` | string | Keyword search |
| `remote` | `remote\|hybrid\|onsite` | |
| `employment_type` | `full_time\|contract\|part_time` | |
| `location` | string | |
| `min_salary` | integer | |
| `semantic` | `true\|false` | Include Vectorize semantic results (default `false`) |
| `limit` | integer | Default 20, max 100 |
| `offset` | integer | Pagination |

**Response `200`**
```json
{
  "jobs": [ { "id": "...", "title": "...", "company": "...", ... } ],
  "total": 142,
  "limit": 20,
  "offset": 0
}
```

### `GET /jobs/:id`
Return a single job listing.

### `GET /jobs/:id/match`
Return the cached match score and explanation for the current user against this job. Returns `404` if not yet computed; trigger via `POST /agents/match`.

**Response `200`**
```json
{
  "score": 0.87,
  "explanation": "Strong match on TypeScript and distributed systems...",
  "missing_skills": ["Kubernetes"],
  "concerns": [],
  "generated_at": 1720000000000
}
```

---

## Saved Jobs

### `GET /saved-jobs`
List the current user's saved jobs (with job details).

### `POST /saved-jobs`
**Request** `{ "job_id": "..." }`
**Response `201`** `{ "id": "...", "job_id": "...", "saved_at": ... }`

### `DELETE /saved-jobs/:id`
Remove a saved job.

---

## Applications

### `GET /applications`
List all applications for the current user.

**Query params:** `status` (filter by status), `limit`, `offset`.

### `POST /applications`
Create a new application record.

**Request**
```json
{ "job_id": "...", "status": "saved", "source": "linkedin", "notes": "..." }
```
**Response `201`** — application object.

### `PATCH /applications/:id`
Update status or notes.

**Request** — any of `{ "status": "applied", "notes": "..." }`.

**Response `200`** — updated application object.

### `GET /applications/:id/timeline`
Return all events for this application in chronological order.

**Response `200`**
```json
{
  "events": [
    { "id": "...", "event_type": "status_change", "payload": { "from": "saved", "to": "applied" }, "occurred_at": ... }
  ]
}
```

### `POST /applications/:id/events`
Add a note or manual event.

**Request** `{ "event_type": "note", "payload": { "text": "..." } }`

---

## Agents

### `POST /agents/match`
Queue a match-score computation for a specific job against the current user's profile.

**Request** `{ "job_id": "..." }`
**Response `202`** `{ "agent_run_id": "..." }`

### `POST /agents/rank`
Queue a ranking run across all saved jobs for the current user.

**Response `202`** `{ "agent_run_id": "..." }`

### `POST /agents/draft`
Queue an application content draft for a job.

**Request** `{ "job_id": "...", "type": "cover_letter" | "summary" }`
**Response `202`** `{ "agent_run_id": "..." }`

### `GET /agents/runs/:id`
Poll the status and result of an agent run.

**Response `200`**
```json
{
  "id": "...",
  "agent_type": "matching",
  "status": "completed",
  "output": { ... },
  "started_at": ...,
  "completed_at": ...
}
```

---

## Error Format

All errors return a consistent body:
```json
{ "error": { "code": "NOT_FOUND", "message": "Job not found" } }
```

Common codes: `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `RATE_LIMITED` · `INTERNAL_ERROR`
