# AI Job Agent — Technical Stack

## Architecture

Cloud-native, API-first, event-driven architecture running entirely on the Cloudflare free tier. Frontend and backend are separately deployable. AI capabilities are implemented as bounded agents that use explicit tools rather than unrestricted application access.

## Frontend

- **React + TypeScript + Vite** — single-page application; outputs pure static files with no SSR runtime.
- **Tailwind CSS** — UI styling.
- **Cloudflare Pages** — frontend deployment and global delivery; serves the Vite `dist/` output directly with no adapter required.
  - Free tier: 500 builds/month, 1 concurrent build, 20,000 files/project, 100 projects/account.

## Backend

- **TypeScript + Hono** — backend language and web framework, running natively on the Cloudflare Workers V8 runtime.
  - Hono is purpose-built for Cloudflare Workers: typed routing, middleware, and first-class binding helpers for D1, KV, R2, and Queues.
  - Native V8 execution — no WASM layer, no bundle size issues, minimal cold-start overhead.
  - Shared TypeScript types between frontend and backend via a monorepo workspace.
- **REST API** — primary client-facing API contract, served from a Hono Worker.
- **Background processing** — asynchronous agent workflows run via `waitUntil` inside the API Worker; scheduled ingestion runs in separate cron-triggered Workers (Ingestion Worker, Apify Worker).

## Cloudflare Services (Free Tier)

| Service | Role | Free Tier Limit |
|---|---|---|
| **Workers** | API handlers, background consumers, agent execution | 100,000 requests/day, 10 ms CPU/invocation |
| **Pages** | Frontend hosting (React + Vite static SPA) | 500 builds/month, 20,000 files/project |
| **D1** | Primary relational database (SQLite-compatible) | 5 GB storage, 5 M rows read/day, 100,000 rows written/day |
| **KV** | Cache, configuration, short-lived lookup state | 100,000 reads/day, 1,000 writes/day, 1 GB storage |
| **R2** | Resume and document object storage | 10 GB storage/month, free egress, 1 M Class A ops/month, 10 M Class B ops/month |
| **Queues** | Async job and event processing | 10,000 operations/day, 24-hour message retention |
| **Workers AI** | LLM inference, embeddings, model execution | 10,000 Neurons/day |
| **Vectorize** | Vector embeddings for semantic job-candidate matching | Included in Workers free plan |
| **Workers Logs** | Structured logging and observability | 200,000 events/day, 3-day retention |

**External services used:** Amazon Bedrock (Claude Opus) for primary LLM inference — the only non-Cloudflare dependency. All other services are Cloudflare free tier.

**Services not used:** Containers (paid only), Hyperdrive (paid only), PostgreSQL (requires external hosting).

## Data Layer

- **D1** — sole relational database. SQLite-compatible; handles all structured application data (jobs, profiles, applications, audit trail).
- **KV** — cache and configuration only; not a substitute for D1.
- **R2** — resumes, exported documents, and other binary/object storage.
- **Vectorize** — vector index for semantic similarity between candidate profiles and job descriptions.

## AI / Agent Layer

- **Amazon Bedrock — Claude Opus** — primary LLM for complex reasoning: job extraction, candidate-job fit analysis, application content drafting, and agent orchestration.
  - Accessed from Workers via the Bedrock REST API (`bedrock-runtime.{region}.amazonaws.com`).
  - Requests signed with AWS Signature V4 using `aws4fetch` (lightweight, Worker-compatible signing library).
  - AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) stored as Cloudflare Workers Secrets — never in source control or client code.
  - Using Bedrock bypasses the Workers AI 10,000 Neurons/day limit for LLM calls.
- **Workers AI** — lightweight inference only: generating embeddings and fast classification tasks where Bedrock would be over-engineered.
  - Free tier: 10,000 Neurons/day (reserved for embeddings; LLM calls go to Bedrock).
- **Vectorize** — stores and queries embeddings for semantic job-candidate matching and RAG retrieval.
- **AI agents** — bounded agents for job discovery, extraction, matching, research, and application preparation. Each agent operates through explicit, permissioned tools.
- **RAG** — retrieval-augmented generation grounded in candidate data and job information stored in D1/Vectorize.
- **Tool calling** — agents interact with explicit tools (D1 reads, R2 uploads, Queue pushes, Bedrock calls) rather than directly accessing infrastructure.
- **MCP** — standardized tool/context integration for agent capabilities where appropriate.
- Model integration is provider-agnostic: Bedrock is the default provider; the integration layer allows swapping models without rewriting business logic.

## Job Data Sources

- **Adzuna API** (`source_name: 'adzuna'`) — free tier; aggregates 50+ job boards; used for standard ingestion via `POST /admin/ingest` and the daily Ingestion Worker cron.
- **Apify `borderline~indeed-scraper`** (`source_name: 'apify_indeed'`) — premium feature; dispatched by the Apify Worker at 01:00 UTC (and on-demand via `POST /premium/search`); results collected at 03:00 UTC.
- **Remotive API** (`source_name: 'remotive'`) — free remote-job feed; used by the standalone Ingestion Worker.
- User-provided job URLs or sources (future).
- Provider-specific adapters so one source failure does not break the complete ingestion pipeline.

## Authentication & Authorization

- OAuth/OIDC-compatible authentication handled in Workers (JWT validation at the edge).
- Short-lived access tokens; no server-side session storage beyond KV.
- Server-side authorization on every protected resource.

## Infrastructure & Delivery

- **Wrangler** — local development, deployment, and environment management for all Workers, D1, KV, R2, and Vectorize resources.
- **GitHub Actions** — CI/CD pipeline for testing, building, and deploying all four apps to Cloudflare (typecheck on every push; deploy on `main`).
- Separate environments for development and production (Wrangler environments).

## Observability

- Structured JSON logging via Workers Logs (200,000 events/day, 3-day retention on free tier).
- Metrics tracked in D1 or Analytics Engine for ingestion throughput, queue depth, agent execution, model Neuron usage, and failures.
- Agent runs recorded in D1 with inputs, outputs, tool calls, and status for auditability.
- Error tracking via Workers Logs and alerting through GitHub Actions or a free webhook integration.

## Engineering Principles

- API-first and contract-driven development.
- Stateless Workers wherever possible; state lives in D1, KV, R2, or Durable Objects.
- Idempotent ingestion and background jobs.
- Event-driven processing for expensive or asynchronous work.
- Explicit agent permissions and human approval for consequential actions.
- Provider adapters instead of hard-coding external job sources.
- Secrets stored in Cloudflare Workers Secrets (via Wrangler), never in source control.
- Test business logic independently from Workers AI and external job-source adapters.
- Design for free-tier limits from day one: minimize D1 row reads, batch AI calls, stay within Queue daily ops.
