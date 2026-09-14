# AI Job Agent — Requirements

## 1. Product Overview

AI Job Agent is an AI-native job discovery and application-assistance platform that helps candidates discover relevant jobs, evaluate fit, organize opportunities, and assist with application workflows while keeping the candidate in control of final submissions.

## 2. Goals

- Discover relevant jobs from multiple sources.
- Normalize and deduplicate job listings.
- Match jobs against a candidate profile and preferences.
- Explain why a job is a good or poor fit.
- Track applications and application status.
- Use AI agents for research, ranking, extraction, and workflow assistance.
- Keep sensitive candidate data secure and minimize unnecessary storage.
- Provide an auditable record of agent actions and decisions.

## 3. Core Functional Requirements

### Job Discovery
- Support multiple job sources through APIs, feeds, permitted crawling, or user-provided sources.
- Search by role, skills, location, remote preference, experience, salary, employment type, and keywords.
- Store source URL, source name, job ID when available, timestamps, and listing metadata.
- Detect duplicate and substantially identical listings.

### Candidate Profile
- Store structured profile information such as skills, experience, education, preferred roles, locations, and work preferences.
- Support resume ingestion and structured extraction.
- Allow users to review and edit extracted profile information.

### Job Matching
- Calculate a transparent relevance/fit score.
- Consider required skills, preferred skills, experience, location, compensation, and user preferences.
- Surface missing requirements and potential concerns.
- Provide concise explanations for recommendations.

### AI Agent Workflow
- Research and discover jobs.
- Extract and normalize job information.
- Evaluate candidate-job fit.
- Rank opportunities.
- Generate application preparation suggestions.
- Draft application content when requested.
- Require explicit user approval before consequential external actions such as submitting an application.

### Application Tracking
- Track saved, preparing, applied, interviewing, offer, rejected, withdrawn, and other configurable states.
- Record application dates, source, notes, and relevant links.
- Provide a timeline of important application events.

### Notifications
- Notify users about high-quality matches and important application events.
- Avoid noisy or duplicate notifications.

## 4. Non-Functional Requirements

### Security
- Encrypt data in transit and at rest where supported.
- Apply least-privilege access to services and credentials.
- Never expose API keys or secrets to clients.
- Protect resumes and other personal data from unauthorized access.

### Privacy
- Collect only data required for product functionality.
- Provide clear data retention and deletion behavior.
- Do not share candidate information with third parties without appropriate user authorization.

### Reliability
- Job ingestion must be idempotent.
- Agent workflows must tolerate retries and partial failures.
- External provider failures must not corrupt application state.
- On the Cloudflare free tier, Queues messages expire after 24 hours; ingestion and agent workflows must be designed to complete or checkpoint within that window.

### Observability
- Structured logs.
- Metrics for ingestion, matching, agent execution, failures, and latency.
- Traceable agent runs with inputs, outputs, tool calls, and status where appropriate.
- On the free tier, Workers Logs retention is 3 days; export or forward important events before they expire.

### Performance
- Fast interactive search and filtering.
- Asynchronous processing for expensive ingestion and AI workflows.
- Horizontally scalable stateless application services.
- Workers AI is limited to 10,000 Neurons/day on the free tier; AI-heavy workflows (resume extraction, bulk job matching) must batch carefully and avoid redundant model calls.

## 5. Agent Safety and Control

- Agents must operate within explicitly defined tools and permissions.
- External side effects require explicit authorization.
- Application submission must never happen silently.
- Agent actions should be observable and auditable.
- Prompt-injected or malicious job-page content must be treated as untrusted data.

## 6. MVP Scope

1. User profile and resume ingestion.
2. Job discovery from an initial set of sources.
3. Job normalization and deduplication.
4. Candidate-job matching and ranking.
5. Saved jobs.
6. Application tracking.
7. AI-assisted job analysis and application preparation.
8. Basic agent execution and audit trail.

### MVP Free-Tier Constraints

The MVP targets the Cloudflare free tier. The following constraints apply and must be respected in design and implementation:

| Service | Free Limit | Impact |
|---|---|---|
| Workers | 100,000 requests/day, 10 ms CPU/invocation | API handlers must be fast; offload heavy work to background queues |
| D1 | 5 GB storage, 5 M rows read/day, 100,000 rows written/day | Design schemas to minimize row reads; avoid N+1 queries |
| KV | 100,000 reads/day, 1,000 writes/day, 1 GB storage | Use KV for caching and config only; do not use as primary store |
| R2 | 10 GB storage/month, free egress | Resume and document storage is within free limits at MVP scale |
| Queues | 10,000 operations/day, 24-hour message retention | Queue volume must stay below 10,000/day; jobs must complete within 24 hours |
| Workers AI | 10,000 Neurons/day | Limit AI calls per user action; cache AI results where possible |
| Containers | Not available on free tier | Go services must run as Workers (WASM) or on an external free-tier platform |

**PostgreSQL:** Not provided by Cloudflare. If required beyond D1 capabilities, use an external provider with a free tier (e.g., Neon, Supabase). Direct connections from Workers require the Workers Paid plan (via Hyperdrive) or a TCP proxy.

## 7. Future Scope

- Additional job providers.
- Personalized job-search agents.
- Automated recurring searches.
- Interview preparation.
- Application analytics.
- Advanced recommendation models.
- Human-in-the-loop application automation with explicit approvals.
- Upgrade to Workers Paid plan to unlock Containers, longer Queue retention, and higher AI/compute quotas.
