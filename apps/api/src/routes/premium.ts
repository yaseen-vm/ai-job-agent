import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.ts';
import { errForbidden, errInternal } from '../lib/errors.ts';
import type { Env } from '../types.ts';

export const premiumRouter = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

premiumRouter.use('*', requireAuth);

// POST /premium/search — manually trigger an Apify search for the current user
// Queues the run by setting a KV flag; the apify worker's next dispatch picks it up
premiumRouter.post('/search', async (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  // Check active subscription
  const sub = await c.env.DB.prepare(`
    SELECT id FROM subscriptions
    WHERE user_id = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
  `).bind(userId, now).first<{ id: string }>();

  if (!sub) return errForbidden(c, 'Premium subscription required');

  try {
    // Set a manual trigger flag in KV — the apify worker checks this on next dispatch
    await c.env.KV.put(
      `apify:manual:${userId}`,
      JSON.stringify({ requestedAt: now }),
      { expirationTtl: 8 * 60 * 60 }, // 8 hour TTL
    );

    return c.json({
      status: 'queued',
      message: 'Your personalized job search has been queued. New jobs will appear within 2 hours.',
    });
  } catch (e) {
    console.error('premium search trigger error', e);
    return errInternal(c);
  }
});

// GET /premium/status — returns subscription + whether a manual search is pending
premiumRouter.get('/status', async (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  const sub = await c.env.DB.prepare(`
    SELECT id, plan, status, started_at, expires_at
    FROM subscriptions
    WHERE user_id = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
  `).bind(userId, now).first<{
    id: string; plan: string; status: string; started_at: number; expires_at: number | null;
  }>();

  const pending = sub ? await c.env.KV.get(`apify:manual:${userId}`) : null;

  return c.json({
    subscription: sub ?? null,
    isPremium: !!sub,
    searchPending: !!pending,
  });
});
