import { ulid } from './ulid.ts';
import { fetchRemotiveJobs, normalizeRemotiveJob } from './adapters/remotive.ts';
import type { IngestionEnv } from './types.ts';

export default {
  async scheduled(_event: ScheduledEvent, env: IngestionEnv): Promise<void> {
    await ingestRemotive(env);
  },
} satisfies ExportedHandler<IngestionEnv>;

async function ingestRemotive(env: IngestionEnv): Promise<void> {
  const categories = ['software-dev', 'devops-sysadmin', 'product'];
  let total = 0;
  let inserted = 0;

  for (const category of categories) {
    let rawJobs;
    try {
      rawJobs = await fetchRemotiveJobs(category);
    } catch (err) {
      console.error(`Failed to fetch Remotive jobs for category ${category}:`, err);
      continue;
    }

    for (const raw of rawJobs) {
      total++;
      try {
        const job = normalizeRemotiveJob(raw);

        // Deduplication check
        const existing = await env.DB
          .prepare('SELECT id FROM jobs WHERE source_name = ? AND source_job_id = ?')
          .bind(job.source_name, job.source_job_id)
          .first<{ id: string }>();

        if (existing) continue;

        const id = ulid();
        const now = Date.now();

        await env.DB
          .prepare(`
            INSERT INTO jobs (
              id, source_name, source_job_id, source_url, title, company,
              location, remote, employment_type, description,
              required_skills, preferred_skills,
              min_salary, max_salary, salary_currency,
              posted_at, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          `)
          .bind(
            id, job.source_name, job.source_job_id, job.source_url,
            job.title, job.company, job.location, job.remote, job.employment_type,
            job.description,
            JSON.stringify(job.required_skills), JSON.stringify(job.preferred_skills),
            job.min_salary, job.max_salary, job.salary_currency,
            job.posted_at, now, now,
          )
          .run();

        // Generate embedding and store in Vectorize
        try {
          const text = `${job.title} at ${job.company}. ${job.description?.slice(0, 500) ?? ''}`;
          const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
          const vector = (embedding as { data: number[][] }).data[0];

          if (env.VECTORIZE_JOBS) {
            await env.VECTORIZE_JOBS.upsert([{ id, values: vector, metadata: { job_id: id } }]);
          }
        } catch (embedErr) {
          console.error('Embedding error for job', id, embedErr);
          // Don't fail the job insertion over embedding errors
        }

        inserted++;
      } catch (err) {
        console.error('Error ingesting job', raw.id, err);
      }
    }
  }

  console.log(`Remotive ingestion complete: ${inserted}/${total} new jobs inserted`);
}
