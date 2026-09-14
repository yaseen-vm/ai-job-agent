import { Hono } from 'hono';
import { ulid } from '../lib/ulid.ts';
import { errNotFound, errValidation, errForbidden } from '../lib/errors.ts';
import { requireAuth, type AuthVariables } from '../middleware/auth.ts';
import type { Env } from '../types.ts';
import type { ApplicationStatus } from '@ai-job-agent/types';

const VALID_STATUSES: ApplicationStatus[] = [
  'saved', 'preparing', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn',
];

export const applicationsRouter = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
applicationsRouter.use('*', requireAuth);

applicationsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  let query = `
    SELECT a.*, j.title, j.company, j.location
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.user_id = ?
  `;
  const bindings: unknown[] = [userId];

  if (status) {
    query += ' AND a.status = ?';
    bindings.push(status);
  }
  query += ' ORDER BY a.updated_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const rows = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ applications: rows.results });
});

applicationsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    job_id?: string;
    status?: string;
    source?: string;
    notes?: string;
  }>();

  if (!body.job_id) return errValidation(c, 'job_id is required');
  const status = (body.status ?? 'saved') as ApplicationStatus;
  if (!VALID_STATUSES.includes(status)) return errValidation(c, `invalid status: ${status}`);

  const job = await c.env.DB
    .prepare('SELECT id FROM jobs WHERE id = ?')
    .bind(body.job_id)
    .first<{ id: string }>();
  if (!job) return errNotFound(c, 'Job not found');

  const existing = await c.env.DB
    .prepare('SELECT id FROM applications WHERE user_id = ? AND job_id = ?')
    .bind(userId, body.job_id)
    .first<{ id: string }>();
  if (existing) return errValidation(c, 'Application already exists for this job');

  const id = ulid();
  const now = Date.now();
  const appliedAt = status === 'applied' ? now : null;

  await c.env.DB
    .prepare(`
      INSERT INTO applications (id, user_id, job_id, status, source, notes, applied_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(id, userId, body.job_id, status, body.source ?? null, body.notes ?? null, appliedAt, now, now)
    .run();

  await recordEvent(c.env.DB, id, 'status_change', { from: null, to: status }, now);

  const row = await c.env.DB
    .prepare('SELECT * FROM applications WHERE id = ?')
    .bind(id)
    .first();
  return c.json(row, 201);
});

applicationsRouter.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json<{ status?: string; notes?: string }>();

  const app = await c.env.DB
    .prepare('SELECT * FROM applications WHERE id = ?')
    .bind(id)
    .first<{ user_id: string; status: string }>();
  if (!app) return errNotFound(c, 'Application not found');
  if (app.user_id !== userId) return errForbidden(c);

  const updates: string[] = [];
  const values: unknown[] = [];
  const now = Date.now();
  const prevStatus = app.status;

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as ApplicationStatus)) {
      return errValidation(c, `invalid status: ${body.status}`);
    }
    updates.push('status = ?');
    values.push(body.status);
    if (body.status === 'applied') { updates.push('applied_at = ?'); values.push(now); }
  }
  if (body.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes); }
  if (updates.length === 0) return errValidation(c, 'No valid fields to update');

  updates.push('updated_at = ?');
  values.push(now, id);

  await c.env.DB
    .prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  if (body.status && body.status !== prevStatus) {
    await recordEvent(c.env.DB, id, 'status_change', { from: prevStatus, to: body.status }, now);
  }
  if (body.notes !== undefined) {
    await recordEvent(c.env.DB, id, 'note', { text: body.notes }, now);
  }

  return c.json(await c.env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first());
});

applicationsRouter.get('/:id/timeline', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const app = await c.env.DB
    .prepare('SELECT user_id FROM applications WHERE id = ?')
    .bind(id)
    .first<{ user_id: string }>();
  if (!app) return errNotFound(c, 'Application not found');
  if (app.user_id !== userId) return errForbidden(c);

  const events = await c.env.DB
    .prepare('SELECT * FROM application_events WHERE application_id = ? ORDER BY occurred_at ASC')
    .bind(id)
    .all();

  return c.json({
    events: events.results.map((e: Record<string, unknown>) => ({
      ...e,
      payload: parseJson(e.payload as string, null),
    })),
  });
});

applicationsRouter.post('/:id/events', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json<{ event_type?: string; payload?: unknown }>();

  const app = await c.env.DB
    .prepare('SELECT user_id FROM applications WHERE id = ?')
    .bind(id)
    .first<{ user_id: string }>();
  if (!app) return errNotFound(c, 'Application not found');
  if (app.user_id !== userId) return errForbidden(c);

  if (!['note', 'reminder'].includes(body.event_type ?? '')) {
    return errValidation(c, 'event_type must be note or reminder');
  }

  const eventId = ulid();
  const now = Date.now();
  await c.env.DB
    .prepare('INSERT INTO application_events (id, application_id, event_type, payload, occurred_at) VALUES (?, ?, ?, ?, ?)')
    .bind(eventId, id, body.event_type, JSON.stringify(body.payload ?? null), now)
    .run();

  return c.json({ id: eventId, application_id: id, event_type: body.event_type, payload: body.payload, occurred_at: now }, 201);
});

async function recordEvent(db: D1Database, applicationId: string, eventType: string, payload: unknown, occurredAt: number) {
  await db
    .prepare('INSERT INTO application_events (id, application_id, event_type, payload, occurred_at) VALUES (?, ?, ?, ?, ?)')
    .bind(ulid(), applicationId, eventType, JSON.stringify(payload), occurredAt)
    .run();
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}
