# AI Job Agent — Technical Stack

## Architecture

Cloud-native, API-first, event-driven architecture running entirely on the Cloudflare free tier. Frontend and backend are separately deployable. AI capabilities are implemented as bounded agents that use explicit tools rather than unrestricted application access.

## Frontend

- **React + TypeScript + Vite** — single-page application; outputs pure static files with no SSR runtime.
- **Tailwind CSS** — UI styling.
- **Cloudflare Pages** — frontend deployment and global delivery; serves the Vite `dist/` output directly with no adapter required.
  - Free tier: 500 builds/month, 1 concurrent build, 20,000 files/project, 100 projects/account.

## Backend

- **Go** — primary backend language, compiled to WebAssembly and deployed as Cloudflare Workers.
  - No Containers; all Go backend logic runs inside the Workers runtime via WASM.
- **REST API** — primary client-facing API contract, served from Workers.
- **Background processing** — asynchronous ingestion, normalization, matching, and agent workflows via Cloudflare Queues and Worker consumers.

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

**Services not used:** Containers (paid only), Hyperdrive (paid only), PostgreSQL (requires external hosting — not Cloudflare).

## Data Layer

- **D1** — sole relational database. SQLite-compatible; handles all structured application data (jobs, profiles, applications, audit trail).
- **KV** — cache and configuration only; not a substitute for D1.
- **R2** — resumes, exported documents, and other binary/object storage.
- **Vectorize** — vector index for semantic similarity between candidate profiles and job descriptions.

## AI / Agent Layer

- **Workers AI** — model inference at the edge: LLM calls, embeddings, and classification.
  - Free tier: 10,000 Neurons/day. All AI workflows must cache results in D1/KV and avoid redundant calls.
- **Vectorize** — stores and queries embeddings for RAG and semantic matching.
- **AI agents** — bounded agents for job discovery, extraction, matching, research, and application preparation. Each agent operates through explicit, permissioned tools.
- **RAG** — retrieval-augmented generation grounded in candidate data and job information stored in D1/Vectorize.
- **Tool calling** — agents interact with explicit tools (D1 reads, R2 uploads, Queue pushes) rather than directly accessing infrastructure.
- **MCP** — standardized tool/context integration for agent capabilities where appropriate.
- Model integration is provider-agnostic so the underlying model can be swapped without rewriting business logic.

## Job Data Sources

- Official job APIs and feeds where available.
- Permitted web crawling/scraping from Workers where legally and technically appropriate.
- User-provided job URLs or sources.
- Provider-specific adapters so one source failure does not break the complete ingestion pipeline.

## Authentication & Authorization

- OAuth/OIDC-compatible authentication handled in Workers (JWT validation at the edge).
- Short-lived access tokens; no server-side session storage beyond KV.
- Server-side authorization on every protected resource.

## Infrastructure & Delivery

- **Wrangler** — local development, deployment, and environment management for all Workers, D1, KV, R2, and Queues resources.
- **GitHub Actions** — CI/CD pipeline for testing, building, and deploying to Cloudflare.
- **Terraform / Pulumi with Cloudflare provider** — declarative provisioning of all Cloudflare resources.
- Separate environments for development, staging, and production (Wrangler environments).

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
