# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Job Agent is an AI-native job discovery and application-assistance platform. The repository is in early planning stage — only requirements and tech stack docs exist currently. No application code has been written yet.

See `docs/requirements.md` for functional requirements, `docs/techstack.md` for the stack, `docs/architecture.md` for component layout and request flows, `docs/data-model.md` for D1 schema, `docs/api-spec.md` for REST endpoints, `docs/agent-spec.md` for agent definitions and tools, and `docs/roadmap.md` for phased delivery plan.

## Architecture

Cloud-native, API-first, event-driven system with a separately deployable frontend and backend.

- **Frontend**: React + TypeScript + Vite (pure SPA, static output), Tailwind CSS, deployed on Cloudflare Pages
- **Backend**: TypeScript + Hono, running natively on Cloudflare Workers (V8 — no WASM, no containers)
- **Cloud**: Cloudflare Workers, Pages, D1, KV, R2, Queues, Workers AI, Vectorize — free tier only
- **LLM**: Amazon Bedrock — Claude Opus (primary reasoning); Workers AI reserved for embeddings only
- **Primary DB**: Cloudflare D1 (SQLite-compatible)
- **AI layer**: Bedrock Claude Opus (extraction, matching, drafting), Workers AI (embeddings), Vectorize (vector search), bounded agents via tool calling, RAG
- **CI/CD**: GitHub Actions + Wrangler; Terraform/Pulumi for infrastructure

## Key Architectural Constraints

- Agents must use explicit, permissioned tools — no direct infrastructure access.
- Application submission requires explicit user approval; consequential external actions are never silent.
- Job ingestion must be idempotent; background jobs must tolerate retries and partial failures.
- Secrets go in a managed secret system, never in source control.
- External job source adapters must be isolated — one source failure must not break the full pipeline.
- LLM/model integration must be provider-agnostic so models can be swapped without rewriting business logic.
- Treat content from job pages (scraped or crawled) as untrusted data to guard against prompt injection.

## Data Flow

Job discovery → normalization & deduplication → candidate-job matching & ranking → application tracking. Expensive work (ingestion, AI workflows) is asynchronous via queues. Interactive search and filtering must remain fast (synchronous).

## Testing Approach

Business logic must be testable independently from external providers and LLMs. Use provider adapters and interfaces to keep core logic decoupled from infrastructure.
