import { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import { JobCard } from '../components/JobCard.tsx';

export function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);

  useEffect(() => {
    api.savedJobs.list().then(res => {
      setSavedJobs(res.saved_jobs as Array<Record<string, unknown>>);
    }).finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (jobId: string) => {
    const item = savedJobs.find(s => s.job_id === jobId);
    if (!item) return;
    await api.savedJobs.remove(item.id as string);
    setSavedJobs(prev => prev.filter(s => s.job_id !== jobId));
  };

  const handleRank = async () => {
    setRanking(true);
    try {
      const res = await api.agents.rank();
      const interval = setInterval(async () => {
        const run = await api.agents.getRun(res.agent_run_id);
        if (run.status === 'completed' || run.status === 'failed') {
          clearInterval(interval);
          setRanking(false);
          const updated = await api.savedJobs.list();
          setSavedJobs(updated.saved_jobs as Array<Record<string, unknown>>);
        }
      }, 3000);
    } catch {
      setRanking(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Saved jobs</h1>
        {savedJobs.length > 0 && (
          <button
            onClick={handleRank}
            disabled={ranking}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {ranking ? 'Ranking…' : 'Rank by fit'}
          </button>
        )}
      </div>

      {savedJobs.length === 0 ? (
        <div className="text-gray-400 text-center py-12">
          No saved jobs yet. Browse jobs and click ★ to save them.
        </div>
      ) : (
        <div className="space-y-2">
          {savedJobs
            .slice()
            .sort((a, b) => ((b.score as number) ?? 0) - ((a.score as number) ?? 0))
            .map(s => (
              <JobCard
                key={s.id as string}
                job={{
                  id: s.job_id as string,
                  title: s.title as string,
                  company: s.company as string,
                  location: s.location as string | undefined,
                  remote: s.remote as string | undefined,
                  employment_type: s.employment_type as string | undefined,
                  score: s.score as number | undefined,
                }}
                saved={true}
                onUnsave={handleUnsave}
              />
            ))}
        </div>
      )}
    </div>
  );
}
