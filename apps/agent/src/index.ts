import { runExtractionAgent } from './agents/extraction.ts';
import { runMatchingAgent } from './agents/matching.ts';
import { runRankingAgent } from './agents/ranking.ts';
import { runDraftAgent } from './agents/draft.ts';
import type { AgentEnv } from './types.ts';

interface AgentMessage {
  type: 'extraction' | 'matching' | 'ranking' | 'draft';
  agent_run_id: string;
  user_id: string;
  resume_r2_key?: string;
  job_id?: string;
  draft_type?: 'cover_letter' | 'summary';
}

export default {
  async queue(batch: MessageBatch<AgentMessage>, env: AgentEnv): Promise<void> {
    for (const msg of batch.messages) {
      const { type, agent_run_id, user_id } = msg.body;

      // Mark run as running
      await env.DB
        .prepare(`UPDATE agent_runs SET status = 'running' WHERE id = ?`)
        .bind(agent_run_id)
        .run();

      try {
        switch (type) {
          case 'extraction':
            if (!msg.body.resume_r2_key) throw new Error('Missing resume_r2_key');
            await runExtractionAgent(env, agent_run_id, user_id, msg.body.resume_r2_key);
            break;
          case 'matching':
            if (!msg.body.job_id) throw new Error('Missing job_id');
            await runMatchingAgent(env, agent_run_id, user_id, msg.body.job_id);
            break;
          case 'ranking':
            await runRankingAgent(env, agent_run_id, user_id);
            break;
          case 'draft':
            if (!msg.body.job_id || !msg.body.draft_type) throw new Error('Missing job_id or draft_type');
            await runDraftAgent(env, agent_run_id, user_id, msg.body.job_id, msg.body.draft_type);
            break;
          default:
            throw new Error(`Unknown agent type: ${type}`);
        }
        msg.ack();
      } catch (err) {
        console.error(`Agent error [${type}]`, agent_run_id, err);
        await env.DB
          .prepare(`UPDATE agent_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`)
          .bind(String(err), Date.now(), agent_run_id)
          .run();
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<AgentEnv>;
