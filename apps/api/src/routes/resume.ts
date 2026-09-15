import { Hono } from 'hono';
import { ulid } from '../lib/ulid.ts';
import { errNotFound, errValidation } from '../lib/errors.ts';
import { requireAuth, type AuthVariables } from '../middleware/auth.ts';
import { runResumeTailorAgent } from '../agents/resume-tailor.ts';
import type { Env } from '../types.ts';

type Variables = AuthVariables;

export const resumeRouter = new Hono<{ Bindings: Env; Variables: Variables }>();
resumeRouter.use('*', requireAuth);

resumeRouter.post('/tailor', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ job_id?: string }>();
  if (!body.job_id) return errValidation(c, 'job_id is required');

  const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id=?').bind(body.job_id).first<{ id: string }>();
  if (!job) return errNotFound(c, 'Job not found');

  const profile = await c.env.DB.prepare('SELECT resume_r2_key FROM profiles WHERE user_id=?').bind(userId).first<{ resume_r2_key: string | null }>();
  if (!profile?.resume_r2_key) return errValidation(c, 'Upload your resume first before tailoring');

  const now = Date.now();
  const existing = await c.env.DB.prepare('SELECT id, status FROM tailored_resumes WHERE user_id=? AND job_id=?')
    .bind(userId, body.job_id).first<{ id: string; status: string }>();

  if (existing && (existing.status === 'completed' || existing.status === 'running' || existing.status === 'pending')) {
    return c.json({ id: existing.id, status: existing.status });
  }

  const id = existing?.id ?? ulid();
  if (existing) {
    await c.env.DB.prepare(`UPDATE tailored_resumes SET status='pending', resume_data=NULL, apply_fields=NULL, error=NULL, updated_at=? WHERE id=?`)
      .bind(now, id).run();
  } else {
    await c.env.DB.prepare('INSERT INTO tailored_resumes (id,user_id,job_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .bind(id, userId, body.job_id, 'pending', now, now).run();
  }

  c.executionCtx.waitUntil(
    runResumeTailorAgent(c.env, id, userId, body.job_id).catch(async (err) => {
      console.error('resume-tailor agent error', err);
      await c.env.DB.prepare(`UPDATE tailored_resumes SET status='failed', error=?, updated_at=? WHERE id=?`)
        .bind(String(err), Date.now(), id).run();
    })
  );

  return c.json({ id, status: 'pending' }, 202);
});

resumeRouter.get('/tailored/:jobId', async (c) => {
  const userId = c.get('userId');
  const jobId = c.req.param('jobId');

  const row = await c.env.DB.prepare('SELECT * FROM tailored_resumes WHERE user_id=? AND job_id=?')
    .bind(userId, jobId).first<Record<string, unknown>>();

  if (!row) return errNotFound(c, 'No tailored resume for this job');

  return c.json({
    ...row,
    resume_data: parseJson(row.resume_data as string | null, null),
    apply_fields: parseJson(row.apply_fields as string | null, null),
  });
});

resumeRouter.delete('/tailored/:jobId', async (c) => {
  const userId = c.get('userId');
  const jobId = c.req.param('jobId');
  await c.env.DB.prepare('DELETE FROM tailored_resumes WHERE user_id=? AND job_id=?').bind(userId, jobId).run();
  return c.json({ ok: true });
});

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}
