import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../lib/jwt.ts';
import type { Env } from '../types.ts';

export type AuthVariables = { userId: string };

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, 401);
    }
    const token = header.slice(7);
    const userId = await verifyToken(token, c.env.JWT_SECRET);
    if (!userId) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }
    c.set('userId', userId);
    await next();
  }
);
