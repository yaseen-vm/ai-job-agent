# AI Job Agent — Technical Stack

## Architecture

Cloud-native, API-first, event-driven architecture with a separately deployable frontend and backend. AI capabilities are implemented as bounded agents that use explicit tools rather than unrestricted application access.

## Frontend

- **Next.js / React** — web application and user experience.
- **TypeScript** — frontend type safety.
- **Tailwind CSS** — UI styling.
- **Cloudflare Pages** — frontend deployment and global delivery.

## Backend

- **Go** — primary backend language for APIs, ingestion workers, orchestration, and high-concurrency workloads.
- **REST API** — primary client-facing API contract.
- **Go HTTP stack** — standard library and lightweight, idiomatic Go packages where practical.
- **Background workers** — asynchronous processing for job ingestion, normalization, matching, and agent workflows.

## Cloud Platform

### Cloudflare

- **Cloudflare Workers** — edge/API workloads where appropriate.
- **Cloudflare Pages** — frontend hosting.
- **Cloudflare R2** — object storage for resumes and other large files.
- **Cloudflare KV** — low-latency key-value data such as caches, feature/configuration data, and short-lived lookup state; not the primary relational datastore.
- **Cloudflare D1** — relational application data where Cloudflare-native SQL storage is appropriate.
- **Cloudflare Queues** — asynchronous jobs and event-driven processing.
- **Cloudflare Containers** — containerized workloads that require a traditional runtime; useful for Go services or workloads that do not fit the Worker execution model.
- **Cloudflare AI / Workers AI** — model inference where supported and appropriate.

## Data Layer

- **PostgreSQL** — preferred primary relational database when the system requires richer relational querying, transactions, and portability.
- **Cloudflare D1** — Cloudflare-native relational option for suitable workloads.
- **Cloudflare KV** — cache/configuration/fast key-value state, not a replacement for the primary relational database.
- **Cloudflare R2** — resumes, documents, exports, and other object/blob storage.

The final production choice between PostgreSQL and D1 should be made based on scale, query complexity, operational requirements, and Cloudflare deployment constraints.

## AI / Agent Layer

- **LLM providers** — model-agnostic integration layer so models can be changed without rewriting business logic.
- **AI agents** — bounded agents for discovery, extraction, matching, research, and application preparation.
- **RAG** — retrieval-augmented generation for grounding responses in candidate data, job information, and approved knowledge sources.
- **Embeddings / vector search** — semantic matching between candidate profiles and job descriptions where beneficial.
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

- **Docker** — reproducible container builds for Go services and workers.
- **GitHub Actions** — CI/CD.
- **Infrastructure as Code** — Terraform or an equivalent declarative provisioning system.
- Separate environments for development, staging, and production.

## Observability

- Structured JSON logging.
- Metrics for API latency, ingestion throughput, queue depth, agent execution, model usage, and failures.
- Distributed tracing for multi-service and agent workflows.
- Error tracking and alerting.

## Engineering Principles

- API-first and contract-driven development.
- Stateless services wherever possible.
- Idempotent ingestion and background jobs.
- Event-driven processing for expensive or asynchronous work.
- Explicit agent permissions and human approval for consequential actions.
- Provider adapters instead of hard-coding external job sources.
- Secrets stored in managed secret systems, never in source control.
- Test business logic independently from external providers and LLMs.
