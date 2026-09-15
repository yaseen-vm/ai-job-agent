import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.ts';
import { errForbidden, errNotFound, errInternal } from '../lib/errors.ts';
import { ulid } from '../lib/ulid.ts';
import type { Env } from '../types.ts';

const APIFY_BASE = 'https://api.apify.com/v2';
const ACTOR_ID = 'borderline~indeed-scraper';

export const premiumRouter = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

premiumRouter.use('*', requireAuth);

// GET /premium/status
premiumRouter.get('/status', async (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  const sub = await c.env.DB.prepare(`
    SELECT id, plan, status, started_at, expires_at
    FROM subscriptions WHERE user_id = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
  `).bind(userId, now).first<{
    id: string; plan: string; status: string; started_at: number; expires_at: number | null;
  }>();

  return c.json({ subscription: sub ?? null, isPremium: !!sub, searchPending: false });
});

// POST /premium/search — start an Apify run immediately, return runId for polling
premiumRouter.post('/search', async (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  const sub = await c.env.DB.prepare(`
    SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
  `).bind(userId, now).first<{ id: string }>();
  if (!sub) return errForbidden(c, 'Premium subscription required');

  // Get profile search terms
  const profile = await c.env.DB.prepare('SELECT preferred_roles, skills FROM profiles WHERE user_id = ?')
    .bind(userId).first<{ preferred_roles: string; skills: string }>();

  let terms: string[] = [];
  try { terms = JSON.parse(profile?.preferred_roles ?? '[]'); } catch { /* empty */ }
  if (terms.length === 0) terms = ['software engineer'];
  terms = terms.slice(0, 2); // max 2 searches per trigger

  // Start Apify actor runs
  const runIds: string[] = [];
  for (const term of terms) {
    try {
      const res = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${c.env.APIFY_API_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: term, country: 'us', maxItems: 25, saveOnlyUniqueItems: true }),
      });
      if (!res.ok) { console.error(`Apify start failed for "${term}": ${res.status}`); continue; }
      const data = await res.json<{ data: { id: string } }>();
      runIds.push(data.data.id);

      // Store run metadata in KV for the poll endpoint
      await c.env.KV.put(
        `apify:instant:${data.data.id}`,
        JSON.stringify({ userId, searchTerm: term, status: 'running', startedAt: now }),
        { expirationTtl: 3600 },
      );
    } catch (err) {
      console.error(`Apify start error for "${term}":`, err);
    }
  }

  if (runIds.length === 0) return errInternal(c, 'Failed to start Apify search');

  // Collect results in background — don't block the HTTP response
  c.executionCtx.waitUntil(collectRuns(c.env, runIds, userId));

  return c.json({ runIds, terms, status: 'running' });
});

// GET /premium/search/poll — check status of running searches
// Query: runIds=id1,id2
premiumRouter.get('/search/poll', async (c) => {
  const userId = c.get('userId');
  const runIdsParam = c.req.query('runIds') ?? '';
  const runIds = runIdsParam.split(',').map(s => s.trim()).filter(Boolean);

  if (runIds.length === 0) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'runIds required' } }, 400);

  const results = await Promise.all(runIds.map(async (runId) => {
    const raw = await c.env.KV.get(`apify:instant:${runId}`);
    if (!raw) return { runId, status: 'unknown' };
    const meta = JSON.parse(raw) as { userId: string; searchTerm: string; status: string; count?: number; error?: string };
    if (meta.userId !== userId) return { runId, status: 'unknown' };
    return { runId, searchTerm: meta.searchTerm, status: meta.status, count: meta.count ?? 0 };
  }));

  const allDone = results.every(r => r.status === 'completed' || r.status === 'failed' || r.status === 'unknown');
  const totalNew = results.reduce((sum, r) => sum + (r.count ?? 0), 0);

  return c.json({ results, allDone, totalNew });
});

// ─── Background collection ───────────────────────────────────────────────────

async function collectRuns(env: Env, runIds: string[], userId: string): Promise<void> {
  // Poll each run until completed (max ~8 min total)
  const MAX_POLLS = 48;
  const POLL_INTERVAL_MS = 10_000;

  const pending = new Set(runIds);

  for (let i = 0; i < MAX_POLLS && pending.size > 0; i++) {
    await sleep(POLL_INTERVAL_MS);

    for (const runId of [...pending]) {
      try {
        const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${env.APIFY_API_TOKEN}`);
        if (!res.ok) continue;
        const data = await res.json<{ data: { id: string; status: string; defaultDatasetId: string } }>();
        const run = data.data;

        if (run.status === 'RUNNING' || run.status === 'READY') continue;

        pending.delete(runId);

        if (run.status !== 'SUCCEEDED') {
          await updateKV(env, runId, { status: 'failed' });
          continue;
        }

        // Fetch dataset and insert jobs
        const items = await fetchDataset(env.APIFY_API_TOKEN, run.defaultDatasetId);
        const count = await insertJobs(env, items);

        await updateKV(env, runId, { status: 'completed', count });
        console.log(`Instant search run ${runId}: inserted ${count} new jobs`);
      } catch (err) {
        console.error(`Poll error for run ${runId}:`, err);
      }
    }
  }

  // Mark any still-pending runs as failed (timeout)
  for (const runId of pending) {
    await updateKV(env, runId, { status: 'failed' });
  }
}

async function updateKV(env: Env, runId: string, patch: Record<string, unknown>): Promise<void> {
  const raw = await env.KV.get(`apify:instant:${runId}`);
  if (!raw) return;
  const meta = JSON.parse(raw) as Record<string, unknown>;
  await env.KV.put(`apify:instant:${runId}`, JSON.stringify({ ...meta, ...patch }), { expirationTtl: 3600 });
}

async function fetchDataset(token: string, datasetId: string): Promise<IndeedJob[]> {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&format=json&clean=true`);
  if (!res.ok) return [];
  return res.json<IndeedJob[]>();
}

interface IndeedJob {
  id?: string; jobKey?: string; positionName: string; company: string;
  location: string; salary?: string; jobType?: string; description?: string;
  url: string; postedAt?: string; remoteType?: string;
}

async function insertJobs(env: Env, items: IndeedJob[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    try {
      const jobId = item.jobKey ?? item.id ?? item.url;
      const existing = await env.DB.prepare('SELECT id FROM jobs WHERE source_name = ? AND source_job_id = ?')
        .bind('apify_indeed', jobId).first<{ id: string }>();
      if (existing) continue;

      const isRemote = /remote/i.test((item.location ?? '') + ' ' + (item.remoteType ?? ''));
      const isHybrid = /hybrid/i.test((item.location ?? '') + ' ' + (item.remoteType ?? ''));
      const id = ulid();
      const now = Date.now();

      await env.DB.prepare(`
        INSERT INTO jobs (id,source_name,source_job_id,source_url,title,company,location,remote,
          employment_type,description,required_skills,preferred_skills,
          min_salary,max_salary,salary_currency,posted_at,is_active,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)
      `).bind(
        id, 'apify_indeed', jobId, item.url,
        item.positionName, item.company, item.location ?? null,
        isRemote ? 'remote' : isHybrid ? 'hybrid' : 'onsite',
        mapJobType(item.jobType), item.description ?? '',
        '[]', '[]', null, null, null,
        item.postedAt ? new Date(item.postedAt).getTime() || null : null,
        now, now,
      ).run();

      try {
        const text = `${item.positionName} at ${item.company}. ${item.description?.slice(0, 500) ?? ''}`;
        const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
        await env.VECTORIZE_JOBS.upsert([{ id, values: (emb as { data: number[][] }).data[0], metadata: { job_id: id } }]);
      } catch { /* embedding errors don't block */ }

      count++;
    } catch (err) {
      console.error('insertJobs error:', err);
    }
  }
  return count;
}

function mapJobType(t?: string): 'full_time' | 'contract' | 'part_time' | null {
  if (!t) return null;
  const s = t.toLowerCase();
  if (s.includes('full')) return 'full_time';
  if (s.includes('part')) return 'part_time';
  if (s.includes('contract') || s.includes('temp')) return 'contract';
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
