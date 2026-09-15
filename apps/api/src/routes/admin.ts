import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.ts';
import { errForbidden, errNotFound, errInternal } from '../lib/errors.ts';
import { ulid } from '../lib/ulid.ts';
import type { Env } from '../types.ts';

export const adminRouter = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

adminRouter.use('*', requireAuth);

// Admin guard — checks KV for admin:{userId} key
adminRouter.use('*', async (c, next) => {
  const userId = c.get('userId');
  const isAdmin = await c.env.KV.get(`admin:${userId}`);
  if (!isAdmin) return errForbidden(c, 'Admin access required');
  await next();
});

// GET /admin/users?search=email — list all users with their subscription status
adminRouter.get('/users', async (c) => {
  const search = c.req.query('search')?.trim() ?? '';

  const rows = await c.env.DB.prepare(`
    SELECT
      u.id, u.email, u.created_at,
      s.status AS sub_status,
      s.plan   AS sub_plan,
      s.expires_at AS sub_expires_at
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    ${search ? "WHERE u.email LIKE ?" : ''}
    ORDER BY u.created_at DESC
    LIMIT 100
  `).bind(...(search ? [`%${search}%`] : [])).all<{
    id: string;
    email: string;
    created_at: number;
    sub_status: string | null;
    sub_plan: string | null;
    sub_expires_at: number | null;
  }>();

  return c.json({ users: rows.results ?? [] });
});

// GET /admin/subscriptions/:userId — get a specific user's subscription
adminRouter.get('/subscriptions/:userId', async (c) => {
  const { userId } = c.req.param();
  const now = Date.now();

  const sub = await c.env.DB.prepare(`
    SELECT id, plan, status, started_at, expires_at
    FROM subscriptions
    WHERE user_id = ?
  `).bind(userId).first<{
    id: string; plan: string; status: string; started_at: number; expires_at: number | null;
  }>();

  // Treat expired subs as inactive
  if (sub && sub.expires_at && sub.expires_at < now && sub.status === 'active') {
    await c.env.DB.prepare("UPDATE subscriptions SET status='expired', updated_at=? WHERE user_id=?")
      .bind(now, userId).run();
    sub.status = 'expired';
  }

  return c.json({ subscription: sub ?? null });
});

// POST /admin/subscriptions — grant or renew subscription
// Body: { userId, durationDays? }
adminRouter.post('/subscriptions', async (c) => {
  const body = await c.req.json<{ userId?: string; durationDays?: number }>().catch(() => ({})) as { userId?: string; durationDays?: number };
  if (!body.userId) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'userId is required' } }, 400);

  const target = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?')
    .bind(body.userId).first<{ id: string }>();
  if (!target) return errNotFound(c, 'User not found');

  const durationMs = (body.durationDays ?? 30) * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const expiresAt = now + durationMs;

  try {
    const existing = await c.env.DB.prepare('SELECT id FROM subscriptions WHERE user_id = ?')
      .bind(body.userId).first<{ id: string }>();

    if (existing) {
      await c.env.DB.prepare(`
        UPDATE subscriptions SET status='active', expires_at=?, updated_at=? WHERE user_id=?
      `).bind(expiresAt, now, body.userId).run();
      return c.json({ status: 'renewed', expiresAt });
    }

    const id = ulid();
    await c.env.DB.prepare(`
      INSERT INTO subscriptions (id, user_id, plan, status, started_at, expires_at, created_at, updated_at)
      VALUES (?, ?, 'premium', 'active', ?, ?, ?, ?)
    `).bind(id, body.userId, now, expiresAt, now, now).run();

    return c.json({ status: 'created', id, expiresAt }, 201);
  } catch (e) {
    console.error('subscription grant error', e);
    return errInternal(c);
  }
});

// DELETE /admin/subscriptions/:userId — revoke subscription
adminRouter.delete('/subscriptions/:userId', async (c) => {
  const { userId } = c.req.param();
  const now = Date.now();

  const sub = await c.env.DB.prepare("SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'")
    .bind(userId).first<{ id: string }>();
  if (!sub) return errNotFound(c, 'No active subscription for this user');

  await c.env.DB.prepare("UPDATE subscriptions SET status='cancelled', updated_at=? WHERE user_id=?")
    .bind(now, userId).run();

  return c.json({ status: 'cancelled' });
});
