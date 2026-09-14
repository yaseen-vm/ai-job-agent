import { Hono } from 'hono';
import { ulid } from '../lib/ulid.ts';
import { errNotFound, errValidation, errForbidden } from '../lib/errors.ts';
import { requireAuth, type AuthVariables } from '../middleware/auth.ts';
import type { Env } from '../types.ts';

export const savedJobsRouter = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
savedJobsRouter.use('*', requireAuth);

savedJobsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = await c.env.DB
    .prepare(`
      SELECT sj.id, sj.job_id, sj.saved_at,
             j.title, j.company, j.location, j.remote, j.employment_type,
             j.min_salary, j.max_salary, j.salary_currency,
             ms.score, ms.explanation
      FROM saved_jobs sj
      JOIN jobs j ON j.id = sj.job_id
      LEFT JOIN match_scores ms ON ms.job_id = sj.job_id AND ms.user_id = ?
      WHERE sj.user_id = ?
      ORDER BY sj.saved_at DESC
    `)
    .bind(userId, userId)
    .all();

  return c.json({ saved_jobs: rows.results });
});

savedJobsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ job_id?: string }>();
  const jobId = body.job_id;

  if (!jobId) return errValidation(c, 'job_id is required');

  const job = await c.env.DB
    .prepare('SELECT id FROM jobs WHERE id = ?')
    .bind(jobId)
    .first<{ id: string }>();
  if (!job) return errNotFound(c, 'Job not found');

  const existing = await c.env.DB
    .prepare('SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?')
    .bind(userId, jobId)
    .first<{ id: string }>();
  if (existing) return c.json({ id: existing.id, job_id: jobId, saved_at: Date.now() }, 200);

  const id = ulid();
  const savedAt = Date.now();
  await c.env.DB
    .prepare('INSERT INTO saved_jobs (id, user_id, job_id, saved_at) VALUES (?, ?, ?, ?)')
    .bind(id, userId, jobId, savedAt)
    .run();

  return c.json({ id, job_id: jobId, saved_at: savedAt }, 201);
});

savedJobsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const row = await c.env.DB
    .prepare('SELECT user_id FROM saved_jobs WHERE id = ?')
    .bind(id)
    .first<{ user_id: string }>();

  if (!row) return errNotFound(c, 'Saved job not found');
  if (row.user_id !== userId) return errForbidden(c);

  await c.env.DB.prepare('DELETE FROM saved_jobs WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});
