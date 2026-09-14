import { Hono } from 'hono';
import { errNotFound, errValidation } from '../lib/errors.ts';
import { requireAuth, type AuthVariables } from '../middleware/auth.ts';
import type { Env } from '../types.ts';

type Variables = AuthVariables;

export const jobsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();
jobsRouter.use('*', requireAuth);

jobsRouter.get('/', async (c) => {
  const q = c.req.query('q') ?? '';
  const remote = c.req.query('remote');
  const employmentType = c.req.query('employment_type');
  const location = c.req.query('location');
  const minSalary = c.req.query('min_salary');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);
  const semantic = c.req.query('semantic') === 'true';

  const conditions: string[] = ['j.is_active = 1'];
  const bindings: unknown[] = [];

  if (q) {
    conditions.push('(j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)');
    bindings.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (remote) { conditions.push('j.remote = ?'); bindings.push(remote); }
  if (employmentType) { conditions.push('j.employment_type = ?'); bindings.push(employmentType); }
  if (location) { conditions.push('j.location LIKE ?'); bindings.push(`%${location}%`); }
  if (minSalary) { conditions.push('j.max_salary >= ?'); bindings.push(parseInt(minSalary, 10)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let jobIds: string[] = [];

  if (semantic && q) {
    try {
      const embedding = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [q] });
      const vector = (embedding as { data: number[][] }).data[0];
      const results = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [q] });
      void results;
      // Vectorize query — use namespace binding directly
      const vectorResults = await (c.env as unknown as { VECTORIZE: VectorizeIndex }).VECTORIZE?.query(vector, {
        topK: 50,
        returnMetadata: 'all',
      });
      if (vectorResults?.matches) {
        jobIds = vectorResults.matches
          .map((m: VectorizeMatch) => (m.metadata as { job_id?: string })?.job_id)
          .filter(Boolean) as string[];
      }
    } catch {
      // fall through to keyword search
    }
  }

  let rows: unknown[];
  let total: number;

  if (jobIds.length > 0) {
    const placeholders = jobIds.map(() => '?').join(',');
    const countResult = await c.env.DB
      .prepare(`SELECT COUNT(*) as count FROM jobs j ${where} AND j.id IN (${placeholders})`)
      .bind(...bindings, ...jobIds)
      .first<{ count: number }>();
    total = countResult?.count ?? 0;

    rows = await c.env.DB
      .prepare(`SELECT * FROM jobs j ${where} AND j.id IN (${placeholders}) ORDER BY j.posted_at DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, ...jobIds, limit, offset)
      .all()
      .then(r => r.results);
  } else {
    const countResult = await c.env.DB
      .prepare(`SELECT COUNT(*) as count FROM jobs j ${where}`)
      .bind(...bindings)
      .first<{ count: number }>();
    total = countResult?.count ?? 0;

    rows = await c.env.DB
      .prepare(`SELECT * FROM jobs j ${where} ORDER BY j.posted_at DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, limit, offset)
      .all()
      .then(r => r.results);
  }

  return c.json({
    jobs: (rows as Record<string, unknown>[]).map(deserializeJob),
    total,
    limit,
    offset,
  });
});

jobsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB
    .prepare('SELECT * FROM jobs WHERE id = ?')
    .bind(id)
    .first<Record<string, unknown>>();

  if (!row) return errNotFound(c, 'Job not found');
  return c.json(deserializeJob(row));
});

jobsRouter.get('/:id/match', async (c) => {
  const userId = c.get('userId');
  const jobId = c.req.param('id');

  const match = await c.env.DB
    .prepare('SELECT * FROM match_scores WHERE user_id = ? AND job_id = ?')
    .bind(userId, jobId)
    .first<Record<string, unknown>>();

  if (!match) return errNotFound(c, 'Match score not found — trigger via POST /agents/match');

  return c.json({
    ...match,
    missing_skills: parseJson(match.missing_skills as string, []),
    concerns: parseJson(match.concerns as string, []),
  });
});

function deserializeJob(row: Record<string, unknown>) {
  return {
    ...row,
    is_active: row.is_active === 1,
    required_skills: parseJson(row.required_skills as string, []),
    preferred_skills: parseJson(row.preferred_skills as string, []),
  };
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}
