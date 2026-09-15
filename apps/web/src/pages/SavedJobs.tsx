import { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import { JobCard } from '../components/JobCard.tsx';
import { Sparkles } from 'lucide-react';

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

  if (loading) return (
    <div className="py-12 border-t border-line font-mono text-[10px] uppercase tracking-widest animate-pulse">
      Loading Data...
    </div>
  );

  return (
    <div className="space-y-16">
      <div className="border-b border-line pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">Collection / 02</p>
          <h1 className="font-serif text-[clamp(60px,8vw,120px)] leading-[0.8] tracking-tight m-0">SAVED<br/><em className="italic font-normal">OPPORTUNITIES</em></h1>
          <p className="font-mono text-[10px] uppercase tracking-widest mt-6">{savedJobs.length} records</p>
        </div>
        
        {savedJobs.length > 0 && (
          <button
            onClick={handleRank}
            disabled={ranking}
            className="font-mono text-[10px] uppercase tracking-widest bg-ink text-paper px-6 py-4 hover:bg-acid hover:text-ink transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles size={12} className={ranking ? 'animate-pulse' : ''} />
            {ranking ? 'Ranking...' : 'Rank by fit →'}
          </button>
        )}
      </div>

      {savedJobs.length === 0 ? (
        <div className="py-24 border border-line flex flex-col items-center justify-center">
          <p className="font-serif text-4xl mb-4 italic">Empty state.</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">You haven't saved any jobs yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
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
