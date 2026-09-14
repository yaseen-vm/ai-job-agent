# AI Job Agent — Roadmap

## Phase 1 — MVP (Cloudflare Free Tier)

Goal: a working end-to-end system a single user can use to discover, evaluate, and track job applications.

### Deliverables

- [ ] **Project setup** — monorepo, Wrangler environments (dev/staging/prod), GitHub Actions CI, Terraform for Cloudflare resources
- [ ] **Auth** — JWT-based register/login in the API Worker
- [ ] **Profile** — resume upload (R2), AI extraction via Bedrock Claude Opus, structured profile stored in D1
- [ ] **Job ingestion** — at least one provider adapter (e.g., a public job API), ingestion Worker, normalization, D1 deduplication, Vectorize embeddings
- [ ] **Job search** — keyword + filter search against D1; optional semantic search via Vectorize
- [ ] **Job matching** — per-job fit score and explanation via Bedrock, cached in D1
- [ ] **Saved jobs** — save/unsave jobs, list saved jobs with match scores
- [ ] **Application tracking** — create and update application records and status timeline in D1
- [ ] **Agent audit trail** — every agent run recorded in D1 `agent_runs`
- [ ] **Frontend SPA** — React + Vite: auth, profile editor, job search, job detail + match, saved jobs, application tracker
- [ ] **Agent draft** — cover letter / summary generation via Bedrock (user reviews before using)

### Constraints
- Everything on Cloudflare free tier except Bedrock (pay-per-use).
- Queues: stay below 10,000 ops/day; all jobs complete within 24 h.
- Workers AI: reserved for embeddings only; LLM calls go to Bedrock.
- D1 reads: index all hot query paths; avoid N+1.

---

## Phase 2 — Growth

Goal: expand job sources, improve match quality, and make the agent more proactive.

- [ ] Additional job provider adapters (2–3 more sources)
- [ ] Ranking agent — bulk-score saved jobs and surface top picks on a dashboard
- [ ] Personalized job discovery — scheduled recurring searches based on profile preferences
- [ ] Notifications — in-app alerts for new high-score matches and application events
- [ ] Application analytics — charts for pipeline stage distribution, response rates, time-in-stage
- [ ] Improved prompt quality — few-shot examples, structured output schemas for all Bedrock calls
- [ ] Upgrade to Workers Paid plan — unlock longer Queue retention (14 days), higher compute limits

---

## Phase 3 — Scale & Automation

Goal: advanced automation with human-in-the-loop controls and richer intelligence.

- [ ] Human-in-the-loop application submission — agent prepares application, user reviews and approves, agent submits
- [ ] Interview preparation agent — generate likely questions and talking points per job
- [ ] Advanced recommendation model — fine-tuned scoring beyond embedding similarity
- [ ] Multi-user support — team/agency mode for recruiters managing multiple candidates
- [ ] Cloudflare Containers — migrate long-running or compute-heavy workloads off the 10 ms CPU limit
- [ ] Hyperdrive + PostgreSQL — migrate from D1 to PostgreSQL for richer query support at scale
- [ ] Export and integrations — export application history, integrate with calendar for interview tracking
