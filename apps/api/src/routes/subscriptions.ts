import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.ts';
import { ulid } from '../lib/ulid.ts';
import { errValidation, errNotFound, errInternal } from '../lib/errors.ts';
import type { Env } from '../types.ts';

export const subscriptionsRouter = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

subscriptionsRouter.use('*', requireAuth);

// GET /subscriptions/me — returns current user's subscription or 404
subscriptionsRouter.get('/me', async (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  const sub = await c.env.DB
    .prepare(`
      SELECT id, plan, status, started_at, expires_at
      FROM subscriptions
      WHERE user_id = ?
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > ?)
    `)
    .bind(userId, now)
    .first<{ id: string; plan: string; status: string; started_at: number; expires_at: number | null }>();

  if (!sub) return errNotFound(c, 'No active subscription found');

  return c.json({ subscription: sub });
});

// POST /subscriptions — grant or renew a subscription for a user (admin only)
// Body: { userId: string, plan?: 'premium', durationDays?: number }
subscriptionsRouter.post('/', async (c) => {
  // Simple admin guard — only allow from a known admin user ID stored in KV
  const requesterId = c.get('userId');
  const isAdmin = await c.env.KV.get(`admin:${requesterId}`);
  if (!isAdmin) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
  }

  let body: { userId?: string; durationDays?: number } = {};
  try { body = await c.req.json(); } catch { /* empty body */ }
  if (!body.userId) return errValidation(c, 'userId is required');

  const targetUser = await c.env.DB
    .prepare('SELECT id FROM users WHERE id = ?')
    .bind(body.userId)
    .first<{ id: string }>();
  if (!targetUser) return errNotFound(c, 'User not found');

  const durationMs = (body.durationDays ?? 30) * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const expiresAt = now + durationMs;

  try {
    const existing = await c.env.DB
      .prepare('SELECT id FROM subscriptions WHERE user_id = ?')
      .bind(body.userId)
      .first<{ id: string }>();

    if (existing) {
      await c.env.DB
        .prepare(`
          UPDATE subscriptions
          SET status = 'active', expires_at = ?, updated_at = ?
          WHERE user_id = ?
        `)
        .bind(expiresAt, now, body.userId)
        .run();
      return c.json({ status: 'renewed', expiresAt });
    }

    const id = ulid();
    await c.env.DB
      .prepare(`
        INSERT INTO subscriptions (id, user_id, plan, status, started_at, expires_at, created_at, updated_at)
        VALUES (?, ?, 'premium', 'active', ?, ?, ?, ?)
      `)
      .bind(id, body.userId, now, expiresAt, now, now)
      .run();

    return c.json({ status: 'created', id, expiresAt }, 201);
  } catch (e) {
    console.error('subscription create error', e);
    return errInternal(c);
  }
});

// DELETE /subscriptions/me — cancel current user's subscription
subscriptionsRouter.delete('/me', async (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  const sub = await c.env.DB
    .prepare("SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'")
    .bind(userId)
    .first<{ id: string }>();

  if (!sub) return errNotFound(c, 'No active subscription found');

  await c.env.DB
    .prepare("UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ?")
    .bind(now, userId)
    .run();

  return c.json({ status: 'cancelled' });
});
