import { ulid } from './lib/ulid.ts';
import { startActorRun, getRunStatus, getDatasetItems } from './lib/apify.ts';
import type { ApifyEnv, PendingRun, NormalizedJob } from './types.ts';

// KV key prefix for pending Apify runs
const KV_PREFIX = 'apify:pending:';
// TTL for pending run entries — 8 hours (Apify runs rarely take longer)
const RUN_TTL_SECONDS = 8 * 60 * 60;

export default {
  async scheduled(controller: ScheduledController, env: ApifyEnv): Promise<void> {
    const hour = new Date(controller.scheduledTime).getUTCHours();
    if (hour === 1) {
      await dispatch(env);
    } else if (hour === 3) {
      await collect(env);
    }
  },
} satisfies ExportedHandler<ApifyEnv>;

// ─── Dispatch (01:00 UTC) ────────────────────────────────────────────────────
// For each active subscriber, start an Apify actor run based on their profile
// search terms and store the run ID in KV for the collect phase to pick up.

async function dispatch(env: ApifyEnv): Promise<void> {
  // Include manually-triggered users (via POST /premium/search) alongside scheduled subscribers
  const manualList = await env.KV.list({ prefix: 'apify:manual:' });
  const manualUserIds = new Set(manualList.keys.map(k => k.name.slice('apify:manual:'.length)));

  const subscribers = await getActiveSubscribers(env);

  // Merge: scheduled subscribers + manual trigger users (deduped)
  const extraIds = [...manualUserIds].filter(id => !subscribers.find(s => s.id === id));
  if (extraIds.length > 0) {
    const placeholders = extraIds.map(() => '?').join(',');
    const extra = await env.DB.prepare(`
      SELECT u.id, p.preferred_roles, p.skills
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id IN (${placeholders}) AND s.status = 'active'
    `).bind(...extraIds).all<SubscriberRow>();
    subscribers.push(...(extra.results ?? []));
  }

  console.log(`Apify dispatch: ${subscribers.length} users (${manualUserIds.size} manual triggers)`);

  // Clear manual trigger flags
  for (const key of manualList.keys) {
    await env.KV.delete(key.name);
  }

  for (const user of subscribers) {
    const terms = buildSearchTerms(user);
    for (const term of terms) {
      try {
        const runId = await startActorRun(env.APIFY_API_TOKEN, {
          query: term,
          country: 'us',
          maxItems: 50,
          saveOnlyUniqueItems: true,
        });

        const pending: PendingRun = {
          userId: user.id,
          searchTerm: term,
          dispatchedAt: Date.now(),
        };
        await env.KV.put(
          `${KV_PREFIX}${runId}`,
          JSON.stringify(pending),
          { expirationTtl: RUN_TTL_SECONDS },
        );
        console.log(`Dispatched Apify run ${runId} for user ${user.id} — "${term}"`);
      } catch (err) {
        console.error(`Apify dispatch failed for user ${user.id} term "${term}":`, err);
      }
    }
  }
}

// ─── Collect (03:00 UTC) ─────────────────────────────────────────────────────
// Poll all pending KV run IDs. For completed runs, fetch dataset items and
// insert new jobs into D1. Incomplete runs stay in KV until TTL expires.

async function collect(env: ApifyEnv): Promise<void> {
  const list = await env.KV.list({ prefix: KV_PREFIX });
  console.log(`Apify collect: ${list.keys.length} pending runs`);

  for (const { name } of list.keys) {
    const raw = await env.KV.get(name);
    if (!raw) continue;

    let pending: PendingRun;
    try { pending = JSON.parse(raw); } catch { continue; }

    const runId = name.slice(KV_PREFIX.length);

    try {
      const run = await getRunStatus(env.APIFY_API_TOKEN, runId);

      if (run.status === 'RUNNING' || run.status === 'READY') {
        // Still in progress — leave in KV, collect phase will pick it up next cycle
        continue;
      }

      // Remove from KV regardless of outcome
      await env.KV.delete(name);

      if (run.status !== 'SUCCEEDED') {
        console.error(`Apify run ${runId} ended with status ${run.status}`);
        continue;
      }

      const items = await getDatasetItems(env.APIFY_API_TOKEN, run.defaultDatasetId);
      let inserted = 0;

      for (const item of items) {
        try {
          const job = normalizeIndeedJob(item);
          const existing = await env.DB
            .prepare('SELECT id FROM jobs WHERE source_name = ? AND source_job_id = ?')
            .bind(job.source_name, job.source_job_id)
            .first<{ id: string }>();
          if (existing) continue;

          const id = ulid();
          const now = Date.now();

          await env.DB.prepare(`
            INSERT INTO jobs (
              id, source_name, source_job_id, source_url, title, company,
              location, remote, employment_type, description,
              required_skills, preferred_skills,
              min_salary, max_salary, salary_currency,
              posted_at, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          `).bind(
            id, job.source_name, job.source_job_id, job.source_url,
            job.title, job.company, job.location, job.remote, job.employment_type,
            job.description,
            JSON.stringify(job.required_skills), JSON.stringify(job.preferred_skills),
            job.min_salary, job.max_salary, job.salary_currency,
            job.posted_at, now, now,
          ).run();

          try {
            const text = `${job.title} at ${job.company}. ${job.description?.slice(0, 500) ?? ''}`;
            const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
            await env.VECTORIZE_JOBS.upsert([{
              id,
              values: (emb as { data: number[][] }).data[0],
              metadata: { job_id: id },
            }]);
          } catch (embedErr) {
            console.error('Embedding error for job', id, embedErr);
          }

          inserted++;
        } catch (err) {
          console.error('Error inserting Apify job:', err);
        }
      }

      console.log(`Apify run ${runId} (user ${pending.userId}): ${inserted}/${items.length} new jobs`);
    } catch (err) {
      console.error(`Error collecting Apify run ${runId}:`, err);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface SubscriberRow {
  id: string;
  preferred_roles: string;
  skills: string;
}

async function getActiveSubscribers(env: ApifyEnv): Promise<SubscriberRow[]> {
  const now = Date.now();
  const rows = await env.DB.prepare(`
    SELECT u.id, p.preferred_roles, p.skills
    FROM users u
    JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > ?)
  `).bind(now).all<SubscriberRow>();
  return rows.results ?? [];
}

function buildSearchTerms(user: SubscriberRow): string[] {
  let roles: string[] = [];
  try { roles = JSON.parse(user.preferred_roles ?? '[]'); } catch { /* empty */ }

  if (roles.length > 0) {
    // Cap at 3 terms to avoid too many Apify runs per user
    return roles.slice(0, 3);
  }

  // Fallback: generic terms
  return ['software engineer'];
}

function normalizeIndeedJob(raw: import('./lib/apify.ts').IndeedJob): NormalizedJob {
  const jobId = raw.jobKey ?? raw.id ?? raw.url;
  const isRemote = /remote/i.test(
    (raw.location ?? '') + ' ' + (raw.remoteType ?? '') + ' ' + (raw.jobType ?? ''),
  );
  const isHybrid = /hybrid/i.test((raw.location ?? '') + ' ' + (raw.remoteType ?? ''));

  return {
    source_name: 'apify_indeed',
    source_job_id: jobId,
    source_url: raw.url,
    title: raw.positionName,
    company: raw.company,
    location: raw.location ?? null,
    remote: isRemote ? 'remote' : isHybrid ? 'hybrid' : 'onsite',
    employment_type: mapJobType(raw.jobType),
    description: raw.description ?? '',
    required_skills: [],
    preferred_skills: [],
    min_salary: null,
    max_salary: null,
    salary_currency: null,
    posted_at: raw.postedAt ? new Date(raw.postedAt).getTime() || null : null,
  };
}

function mapJobType(t?: string): 'full_time' | 'contract' | 'part_time' | null {
  if (!t) return null;
  const s = t.toLowerCase();
  if (s.includes('full')) return 'full_time';
  if (s.includes('part')) return 'part_time';
  if (s.includes('contract') || s.includes('temp')) return 'contract';
  return null;
}
