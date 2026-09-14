import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth.ts';
import { profileRouter } from './routes/profile.ts';
import { jobsRouter } from './routes/jobs.ts';
import { savedJobsRouter } from './routes/saved-jobs.ts';
import { applicationsRouter } from './routes/applications.ts';
import { agentsRouter } from './routes/agents.ts';
import { fetchRemotiveJobs, normalizeRemotiveJob } from './lib/remotive.ts';
import { ulid } from './lib/ulid.ts';
import type { Env } from './types.ts';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (origin === 'http://localhost:5173') return origin;
    if (origin === 'https://ai-job-agent.pages.dev') return origin;
    if (origin.endsWith('.ai-job-agent.pages.dev')) return origin;
    return null;
  },
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

app.post('/admin/ingest', async (c) => {
  c.executionCtx.waitUntil(triggerIngestion(c.env));
  return c.json({ status: 'ingestion started' }, 202);
});

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
});

async function triggerIngestion(env: Env) {
  const categories = ['software-dev', 'devops-sysadmin', 'product'];
  let inserted = 0;

  for (const category of categories) {
    let rawJobs;
    try { rawJobs = await fetchRemotiveJobs(category); }
    catch (e) { console.error(`Remotive fetch failed for ${category}:`, e); continue; }

    for (const raw of rawJobs) {
      try {
        const job = normalizeRemotiveJob(raw);
        const existing = await env.DB
          .prepare('SELECT id FROM jobs WHERE source_name=? AND source_job_id=?')
          .bind(job.source_name, job.source_job_id).first<{ id: string }>();
        if (existing) continue;

        const id = ulid();
        const now = Date.now();
        await env.DB.prepare(`
          INSERT INTO jobs (id,source_name,source_job_id,source_url,title,company,location,remote,
          employment_type,description,required_skills,preferred_skills,min_salary,max_salary,
          salary_currency,posted_at,is_active,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)
        `).bind(
          id, job.source_name, job.source_job_id, job.source_url, job.title, job.company,
          job.location, job.remote, job.employment_type, job.description,
          JSON.stringify(job.required_skills), JSON.stringify(job.preferred_skills),
          job.min_salary, job.max_salary, job.salary_currency, job.posted_at, now, now,
        ).run();

        try {
          const text = `${job.title} at ${job.company}. ${job.description?.slice(0, 500) ?? ''}`;
          const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
          await env.VECTORIZE_JOBS.upsert([{ id, values: (emb as { data: number[][] }).data[0], metadata: { job_id: id } }]);
        } catch { /* embedding errors don't block ingestion */ }

        inserted++;
      } catch (e) { console.error('Job insert error:', e); }
    }
  }
  console.log(`Ingestion complete: ${inserted} new jobs`);
}

export default app;
