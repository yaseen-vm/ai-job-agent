import { Hono } from 'hono';
import { ulid } from '../lib/ulid.ts';
import { errNotFound, errValidation } from '../lib/errors.ts';
import { requireAuth, type AuthVariables } from '../middleware/auth.ts';
import { runMatchingAgent } from '../agents/matching.ts';
import { runRankingAgent } from '../agents/ranking.ts';
import { runDraftAgent } from '../agents/draft.ts';
import type { Env } from '../types.ts';

export const agentsRouter = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
agentsRouter.use('*', requireAuth);

agentsRouter.post('/match', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ job_id?: string }>();
  if (!body.job_id) return errValidation(c, 'job_id is required');

  const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id=?').bind(body.job_id).first<{ id: string }>();
  if (!job) return errNotFound(c, 'Job not found');

  const profile = await c.env.DB.prepare('SELECT id FROM profiles WHERE user_id=?').bind(userId).first<{ id: string }>();
  if (!profile) return errValidation(c, 'Profile not found — complete your profile first');

  const agentRunId = ulid();
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO agent_runs (id,user_id,agent_type,status,input,tool_calls,started_at) VALUES (?,?,?,?,?,?,?)')
    .bind(agentRunId, userId, 'matching', 'pending', JSON.stringify({ job_id: body.job_id }), '[]', now).run();

  c.executionCtx.waitUntil(
    runMatchingAgent(c.env, agentRunId, userId, body.job_id).catch(async (err) => {
      console.error('matching agent error', err);
      await c.env.DB.prepare(`UPDATE agent_runs SET status='failed',error=?,completed_at=? WHERE id=?`)
        .bind(String(err), Date.now(), agentRunId).run();
    })
  );

  return c.json({ agent_run_id: agentRunId }, 202);
});

agentsRouter.post('/rank', async (c) => {
  const userId = c.get('userId');
  const profile = await c.env.DB.prepare('SELECT id FROM profiles WHERE user_id=?').bind(userId).first<{ id: string }>();
  if (!profile) return errValidation(c, 'Profile not found — complete your profile first');

  const agentRunId = ulid();
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO agent_runs (id,user_id,agent_type,status,input,tool_calls,started_at) VALUES (?,?,?,?,?,?,?)')
    .bind(agentRunId, userId, 'ranking', 'pending', '{}', '[]', now).run();

  c.executionCtx.waitUntil(
    runRankingAgent(c.env, agentRunId, userId).catch(async (err) => {
      console.error('ranking agent error', err);
      await c.env.DB.prepare(`UPDATE agent_runs SET status='failed',error=?,completed_at=? WHERE id=?`)
        .bind(String(err), Date.now(), agentRunId).run();
    })
  );

  return c.json({ agent_run_id: agentRunId }, 202);
});

agentsRouter.post('/draft', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ job_id?: string; type?: string }>();

  if (!body.job_id) return errValidation(c, 'job_id is required');
  if (!['cover_letter', 'summary'].includes(body.type ?? '')) return errValidation(c, 'type must be cover_letter or summary');

  const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id=?').bind(body.job_id).first<{ id: string }>();
  if (!job) return errNotFound(c, 'Job not found');

  const agentRunId = ulid();
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO agent_runs (id,user_id,agent_type,status,input,tool_calls,started_at) VALUES (?,?,?,?,?,?,?)')
    .bind(agentRunId, userId, 'draft', 'pending', JSON.stringify({ job_id: body.job_id, draft_type: body.type }), '[]', now).run();

  c.executionCtx.waitUntil(
    runDraftAgent(c.env, agentRunId, userId, body.job_id, body.type as 'cover_letter' | 'summary').catch(async (err) => {
      console.error('draft agent error', err);
      await c.env.DB.prepare(`UPDATE agent_runs SET status='failed',error=?,completed_at=? WHERE id=?`)
        .bind(String(err), Date.now(), agentRunId).run();
    })
  );

  return c.json({ agent_run_id: agentRunId }, 202);
});

agentsRouter.get('/runs/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const run = await c.env.DB.prepare('SELECT * FROM agent_runs WHERE id=? AND user_id=?').bind(id, userId).first<Record<string, unknown>>();
  if (!run) return errNotFound(c, 'Agent run not found');

  return c.json({
    ...run,
    input: jp(run.input as string, null),
    output: jp(run.output as string, null),
    tool_calls: jp(run.tool_calls as string, []),
  });
});

function jp<T>(v: string | null | undefined, fb: T): T {
  if (!v) return fb;
  try { return JSON.parse(v) as T; } catch { return fb; }
}
