import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth.ts';
import { profileRouter } from './routes/profile.ts';
import { jobsRouter } from './routes/jobs.ts';
import { savedJobsRouter } from './routes/saved-jobs.ts';
import { applicationsRouter } from './routes/applications.ts';
import { agentsRouter } from './routes/agents.ts';
import type { Env } from './types.ts';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:5173', 'https://ai-job-agent.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.route('/auth', authRouter);
app.route('/profile', profileRouter);
app.route('/jobs', jobsRouter);
app.route('/saved-jobs', savedJobsRouter);
app.route('/applications', applicationsRouter);
app.route('/agents', agentsRouter);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
});

export default app;
