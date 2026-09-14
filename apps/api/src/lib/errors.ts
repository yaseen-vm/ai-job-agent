import type { Context } from 'hono';

export function errNotFound(c: Context, message = 'Not found') {
  return c.json({ error: { code: 'NOT_FOUND', message } }, 404);
}

export function errUnauthorized(c: Context, message = 'Unauthorized') {
  return c.json({ error: { code: 'UNAUTHORIZED', message } }, 401);
}

export function errForbidden(c: Context, message = 'Forbidden') {
  return c.json({ error: { code: 'FORBIDDEN', message } }, 403);
}

export function errValidation(c: Context, message: string) {
  return c.json({ error: { code: 'VALIDATION_ERROR', message } }, 400);
}

export function errInternal(c: Context, message = 'Internal server error') {
  return c.json({ error: { code: 'INTERNAL_ERROR', message } }, 500);
}
