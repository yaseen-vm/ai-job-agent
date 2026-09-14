import { Hono } from 'hono';
import { ulid } from '../lib/ulid.ts';
import { hashPassword, verifyPassword } from '../lib/crypto.ts';
import { signToken } from '../lib/jwt.ts';
import { errValidation, errInternal } from '../lib/errors.ts';
import type { Env } from '../types.ts';

export const authRouter = new Hono<{ Bindings: Env }>();

authRouter.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) return errValidation(c, 'email and password are required');
  if (password.length < 8) return errValidation(c, 'password must be at least 8 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errValidation(c, 'invalid email');

  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();

  if (existing) return errValidation(c, 'email already registered');

  const id = ulid();
  const now = Date.now();
  const passwordHash = await hashPassword(password);

  try {
    await c.env.DB
      .prepare('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, email, passwordHash, now, now)
      .run();

    const token = await signToken(id, c.env.JWT_SECRET);
    return c.json({ token, user: { id, email } }, 201);
  } catch (e) {
    console.error('register error', e);
    return errInternal(c);
  }
});

authRouter.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) return errValidation(c, 'email and password are required');

  const user = await c.env.DB
    .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string }>();

  if (!user) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, 401);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, 401);

  const token = await signToken(user.id, c.env.JWT_SECRET);
  return c.json({ token, user: { id: user.id, email: user.email } });
});
