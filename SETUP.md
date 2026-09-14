# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare account (free tier)
- AWS account with Bedrock access (Claude Opus)
- Wrangler CLI: `npm i -g wrangler`

## 1. Install dependencies

```bash
pnpm install
```

## 2. Create Cloudflare resources

### D1 database
```bash
wrangler d1 create ai-job-agent-db
# Copy the database_id into apps/api/wrangler.toml, apps/ingestion/wrangler.toml, apps/agent/wrangler.toml
```

### Run migrations
```bash
pnpm db:migrate:local   # local dev
pnpm db:migrate:remote  # production
```

### KV namespace
```bash
wrangler kv:namespace create ai-job-agent-kv
# Copy the id into apps/api/wrangler.toml
```

### R2 bucket
```bash
wrangler r2 bucket create ai-job-agent-files
```

### Queues
```bash
wrangler queues create ai-job-agent-ingestion
wrangler queues create ai-job-agent-agent
```

### Vectorize indexes
```bash
wrangler vectorize create job-embeddings --dimensions=768 --metric=cosine
wrangler vectorize create profile-embeddings --dimensions=768 --metric=cosine
```

Add Vectorize bindings to `apps/api/wrangler.toml`, `apps/ingestion/wrangler.toml`, `apps/agent/wrangler.toml`:
```toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "job-embeddings"
```

## 3. Set secrets

For each of `apps/api`, `apps/ingestion`, `apps/agent`:
```bash
cd apps/api
wrangler secret put JWT_SECRET          # random secret string
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
```

## 4. Run locally

```bash
# Terminal 1: API
pnpm dev:api

# Terminal 2: Frontend
pnpm dev:web
```

## 5. Deploy

Push to `main` — GitHub Actions handles deployment automatically.

Secrets required in GitHub:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_API_URL` (your deployed API URL)

## 6. Trigger initial job ingestion

After deploying:
```bash
wrangler queues send ai-job-agent-ingestion --message '{"type":"discovery","source_name":"remotive"}'
```
