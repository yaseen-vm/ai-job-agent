import { Hono } from 'hono';
import { ulid } from '../lib/ulid.ts';
import { errNotFound, errValidation, errInternal } from '../lib/errors.ts';
import { requireAuth, type AuthVariables } from '../middleware/auth.ts';
import type { Env } from '../types.ts';

type Variables = AuthVariables;

export const profileRouter = new Hono<{ Bindings: Env; Variables: Variables }>();
profileRouter.use('*', requireAuth);

profileRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const row = await c.env.DB
    .prepare('SELECT * FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<Record<string, unknown>>();

  if (!row) return errNotFound(c, 'Profile not found');
  return c.json(deserializeProfile(row));
});

profileRouter.patch('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<Record<string, unknown>>();

  const allowed = [
    'full_name', 'headline', 'summary', 'skills', 'years_experience',
    'preferred_roles', 'preferred_locations', 'remote_preference',
    'min_salary', 'employment_types',
  ] as const;

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = ?`);
      const val = body[key];
      values.push(Array.isArray(val) ? JSON.stringify(val) : val);
    }
  }

  if (updates.length === 0) return errValidation(c, 'No valid fields to update');

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(userId);

  const existing = await c.env.DB
    .prepare('SELECT id FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ id: string }>();

  if (!existing) {
    const id = ulid();
    const now = Date.now();
    await c.env.DB
      .prepare('INSERT INTO profiles (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .bind(id, userId, now, now)
      .run();
  }

  await c.env.DB
    .prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`)
    .bind(...values)
    .run();

  const row = await c.env.DB
    .prepare('SELECT * FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<Record<string, unknown>>();

  return c.json(deserializeProfile(row!));
});

profileRouter.post('/resume', async (c) => {
  const userId = c.get('userId');
  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) return errValidation(c, 'file is required');
  if (file.size > 10 * 1024 * 1024) return errValidation(c, 'file must be under 10 MB');

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'docx'].includes(ext ?? '')) return errValidation(c, 'only PDF and DOCX are supported');

  const r2Key = `resumes/${userId}/${ulid()}.${ext}`;
  await c.env.R2.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const now = Date.now();
  await c.env.DB
    .prepare('UPDATE profiles SET resume_r2_key = ?, updated_at = ? WHERE user_id = ?')
    .bind(r2Key, now, userId)
    .run();

  const agentRunId = ulid();
  await c.env.DB
    .prepare(
      'INSERT INTO agent_runs (id, user_id, agent_type, status, input, tool_calls, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(agentRunId, userId, 'extraction', 'pending', JSON.stringify({ resume_r2_key: r2Key }), '[]', now)
    .run();

  await c.env.QUEUE_AGENT.send({
    type: 'extraction',
    user_id: userId,
    resume_r2_key: r2Key,
    agent_run_id: agentRunId,
  });

  return c.json({ agent_run_id: agentRunId, resume_r2_key: r2Key }, 202);
});

profileRouter.get('/resume', async (c) => {
  const userId = c.get('userId');
  const row = await c.env.DB
    .prepare('SELECT resume_r2_key FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ resume_r2_key: string | null }>();

  if (!row?.resume_r2_key) return errNotFound(c, 'No resume uploaded');

  const obj = await c.env.R2.get(row.resume_r2_key);
  if (!obj) return errNotFound(c, 'Resume file not found');

  // Return the file directly — Workers R2 doesn't support pre-signed URLs on free tier
  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="resume.${row.resume_r2_key.split('.').pop()}"`);
  return new Response(obj.body, { headers });
});

function deserializeProfile(row: Record<string, unknown>) {
  return {
    ...row,
    skills: parseJson(row.skills as string, []),
    preferred_roles: parseJson(row.preferred_roles as string, []),
    preferred_locations: parseJson(row.preferred_locations as string, []),
    employment_types: parseJson(row.employment_types as string, []),
  };
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}
