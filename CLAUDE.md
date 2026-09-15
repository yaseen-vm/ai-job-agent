# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Job Agent is an AI-native job discovery and application-assistance platform. The Phase 1 MVP is built and deploying via CI.

See `docs/` for requirements, architecture, data model, API spec, agent spec, and roadmap.

## Monorepo Structure

pnpm workspace with four apps and two shared packages:

- `apps/api` — Hono API on Cloudflare Workers (main backend; all routes, agents, and ingestion logic)
- `apps/ingestion` — standalone Cloudflare Worker with a daily cron trigger for job ingestion
- `apps/agent` — Cloudflare Worker housing the Bedrock-backed AI agents (extraction, matching, ranking, draft)
- `apps/web` — React + Vite SPA (React Router v6, Zustand, Tailwind) deployed to Cloudflare Pages
- `packages/types` — shared TypeScript types consumed by all apps
- `packages/db` — D1 migrations only (`migrations/0001_initial.sql`)

## Commands

```bash
# Root (runs across all workspaces)
pnpm typecheck        # tsc --noEmit everywhere
pnpm test             # vitest run (currently only apps/api has tests)
pnpm build            # build all apps

# Per-app dev
pnpm dev:api          # wrangler dev --local on apps/api
pnpm dev:web          # vite dev on apps/web

# Database
pnpm db:migrate:local   # wrangler d1 migrations apply ai-job-agent-db --local
pnpm db:migrate:remote  # wrangler d1 migrations apply ai-job-agent-db --remote

# Deploy individual apps (from repo root)
pnpm --filter @ai-job-agent/api deploy
pnpm --filter @ai-job-agent/ingestion deploy
pnpm --filter @ai-job-agent/agent deploy

# Run a single test file
pnpm --filter @ai-job-agent/api exec vitest run src/path/to/test.ts
```

## Architecture

**Request path (API):** HTTP → Hono CORS middleware → route handler → D1/KV/R2/Vectorize. Auth is JWT (HS256, 7-day expiry) verified in `apps/api/src/middleware/auth.ts`; `userId` is set on Hono context variables.

**AI agents** run inside `waitUntil` so they don't block the HTTP response. The route creates an `agent_runs` row with `status='pending'`, fires the agent async, then returns `202` with the run ID. Clients poll `GET /agents/runs/:id`. Each agent calls `createBedrockClient` (in `apps/api/src/lib/bedrock.ts`) which wraps `aws4fetch` for SigV4-signed Bedrock requests.

**Ingestion** is triggered by `POST /admin/ingest` (inline in `apps/api/src/index.ts`) or daily cron in `apps/ingestion`. It fetches from Remotive/other adapters, deduplicates by `(source_name, source_job_id)`, inserts into D1, then upserts a Vectorize embedding using Workers AI `@cf/baai/bge-base-en-v1.5`. Embedding errors are swallowed so they don't block ingestion.

**Frontend state:** Zustand store in `apps/web/src/stores/auth.ts` persists JWT and user object in `localStorage`. All authenticated pages are behind a `RequireAuth` wrapper in `App.tsx`.

## Key Patterns

- All IDs are ULIDs (each app has a local `ulid.ts` wrapper due to Workers module constraints).
- JSON arrays/objects in D1 are stored as serialized strings (skills, tool_calls, etc.). Parse with the local `jp()` helper before use.
- Error responses always follow `{ error: { code, message } }` — use the helpers in `apps/api/src/lib/errors.ts`.
- Job content passed to Bedrock is wrapped in XML tags (`<candidate>`, `<job>`) and system prompts warn the model that content is untrusted — preserve this pattern to guard against prompt injection.
- The `Env` interface in `apps/api/src/types.ts` is the single source of truth for Worker bindings; update it whenever `wrangler.toml` bindings change.

## Secrets & Local Dev

API secrets are injected via `wrangler secret put`. For local dev, copy values into `apps/api/.dev.vars` and `apps/agent/.dev.vars` (these are gitignored). Required secrets: `JWT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Web needs `VITE_API_URL` (see `apps/web/.env.example`).

## CI/CD

`.github/workflows/ci.yml` runs typecheck on every push/PR, then deploys all four apps on `main` push. Deployments need `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `VITE_API_URL` in GitHub secrets.

## Architectural Constraints

- Agents run inside `waitUntil` — never `await` them in the request handler.
- Job ingestion must be idempotent; always check `(source_name, source_job_id)` before inserting.
- LLM provider is swappable — keep Bedrock usage isolated to `createBedrockClient`; agents must not call `aws4fetch` directly.
- External job source adapters must be isolated — one source failure must not abort the whole ingestion loop.
- Application submission requires explicit user action; no silent external writes.
