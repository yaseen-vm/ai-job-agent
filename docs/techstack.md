# AI Job Agent — Technical Stack

## Architecture

Cloud-native, API-first, event-driven architecture with a separately deployable frontend and backend. AI capabilities are implemented as bounded agents that use explicit tools rather than unrestricted application access.

## Frontend

- **Next.js / React** — web application and user experience.
- **TypeScript** — frontend type safety.
- **Tailwind CSS** — UI styling.
- **Cloudflare Pages** — frontend deployment and global delivery.
  - Free tier: 500 builds/month, 20,000 files per project, 100 projects per account.

## Backend

- **Go** — primary backend language for APIs, ingestion workers, orchestration, and high-concurrency workloads.
- **REST API** — primary client-facing API contract.
- **Go HTTP stack** — standard library and lightweight, idiomatic Go packages where practical.
- **Cloudflare Workers** — Go API and edge workloads compiled to WASM or via the Workers runtime.
  - Free tier: 100,000 requests/day, 10 ms CPU time per invocation.
  - Note: Cloudflare Containers (traditional runtime for Go services) requires the Workers Paid plan and is not available on the free tier. On the free tier, Go backend logic must be implemented as Workers (WASM) or hosted on an external platform.
- **Background workers** — asynchronous processing for job ingestion, normalization, matching, and agent workflows via Cloudflare Queues.

## Cloud Platform

### Cloudflare

- **Cloudflare Workers** — edge/API workloads.
  - Free tier: 100,000 requests/day, 10 ms CPU per invocation.
- **Cloudflare Pages** — frontend hosting.
  - Free tier: 500 builds/month, 1 concurrent build, 20,000 files/project.
- **Cloudflare R2** — object storage for resumes and other large files.
  - Free tier: 10 GB storage/month, 1 M Class A operations/month, 10 M Class B operations/month, free egress.
- **Cloudflare KV** — low-latency key-value data: caches, feature/configuration data, short-lived lookup state.
  - Free tier: 100,000 reads/day, 1,000 writes/day, 1,000 deletes/day, 1 GB storage.
- **Cloudflare D1** — relational application data (SQLite-compatible).
  - Free tier: 5 GB storage, 5 M rows read/day, 100,000 rows written/day.
- **Cloudflare Queues** — asynchronous jobs and event-driven processing.
  - Free tier: 10,000 operations/day, 24-hour message retention.
  - Note: 24-hour retention on the free tier is a hard constraint; jobs that are not consumed within 24 hours are dropped. The paid plan extends retention to 4–14 days.
- **Cloudflare AI / Workers AI** — model inference where supported and appropriate.
  - Free tier: 10,000 Neurons/day. Several premium models (Moonshot, Deepseek, Zai-org GLM) require a paid plan.
- **Cloudflare Containers** — **Workers Paid plan required; not available on the free tier.** Containerized workloads (e.g., standalone Go services) must be deferred to a paid tier or hosted externally until then.

## Data Layer

- **Cloudflare D1** — primary relational database for the free-tier MVP. SQLite-compatible; suitable for prototyping and early production.
  - Free tier: 5 GB storage, 5 M rows read/day, 100,000 rows written/day.
- **PostgreSQL** — preferred primary relational database at scale when richer querying, transactions, and portability are required. Requires external hosting (e.g., Supabase free tier, Neon free tier) since Cloudflare does not provide managed PostgreSQL. Cloudflare Hyperdrive can proxy connections but requires the Workers Paid plan for production use.
- **Cloudflare KV** — cache/configuration/fast key-value state, not a replacement for the primary relational database.
  - Free tier: 100,000 reads/day, 1,000 writes/day, 1 GB storage.
- **Cloudflare R2** — resumes, documents, exports, and other object/blob storage.
  - Free tier: 10 GB/month, free egress.

**Free-tier DB recommendation:** Use D1 for the MVP. Migrate to PostgreSQL (via Hyperdrive or direct connection from a paid Worker/Container) when query complexity or scale outgrows D1's free limits.

## AI / Agent Layer

- **LLM providers** — model-agnostic integration layer so models can be changed without rewriting business logic.
- **Workers AI** — on-device inference at the edge for embeddings and lightweight models.
  - Free tier: 10,000 Neurons/day. Budget carefully: complex LLM calls consume Neurons quickly.
- **AI agents** — bounded agents for discovery, extraction, matching, research, and application preparation.
- **RAG** — retrieval-augmented generation for grounding responses in candidate data, job information, and approved knowledge sources.
- **Cloudflare Vectorize** — semantic matching between candidate profiles and job descriptions.
  - Free tier: included in Workers free plan (check current docs for exact limits; Vectorize limits may change).
- **MCP** — standardized tool/context integration for agent capabilities where appropriate.
- **Tool calling** — agents interact with explicit, permissioned tools rather than directly accessing infrastructure.

## Job Data Sources

- Official job APIs and feeds where available.
- Permitted web crawling/scraping where legally and technically appropriate.
- User-provided job URLs or sources.
- Provider-specific adapters so one source failure does not break the complete ingestion pipeline.

## Authentication & Authorization

- OAuth/OIDC-compatible authentication provider.
- Short-lived access tokens/session credentials.
- Server-side authorization for every protected resource.
- Role and resource-level authorization where required.

## Infrastructure & Delivery

- **Docker** — reproducible container builds for Go services and workers (used locally and for paid-tier deployments).
- **GitHub Actions** — CI/CD.
- **Infrastructure as Code** — Terraform or Pulumi with the Cloudflare provider for reproducible environment provisioning.
- Separate environments for development, staging, and production.

## Observability

- Structured JSON logging.
- Metrics for API latency, ingestion throughput, queue depth, agent execution, model usage, and failures.
- **Workers Logs** — free tier: 200,000 events/day, 3-day retention.
- Distributed tracing for multi-service and agent workflows.
- Error tracking and alerting.

## Free Tier Summary

| Service | Free Limit |
|---|---|
| Workers | 100,000 requests/day, 10 ms CPU/invocation |
| Pages | 500 builds/month, 20,000 files/project |
| R2 | 10 GB storage/month, free egress |
| KV | 100,000 reads/day, 1,000 writes/day, 1 GB storage |
| D1 | 5 GB storage, 5 M rows read/day, 100,000 rows written/day |
| Queues | 10,000 operations/day, 24-hour message retention |
| Workers AI | 10,000 Neurons/day |
| Workers Logs | 200,000 events/day, 3-day retention |
| Containers | **Not available — Workers Paid plan required** |

## Engineering Principles

- API-first and contract-driven development.
- Stateless services wherever possible.
- Idempotent ingestion and background jobs.
- Event-driven processing for expensive or asynchronous work.
- Explicit agent permissions and human approval for consequential actions.
- Provider adapters instead of hard-coding external job sources.
- Secrets stored in managed secret systems, never in source control.
- Test business logic independently from external providers and LLMs.
