import { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import { JobCard } from '../components/JobCard.tsx';
import { Sparkles, Bookmark } from 'lucide-react';
import { GenericPageSkeleton } from '../components/PageLoader.tsx';

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

  if (loading) return <GenericPageSkeleton rows={4} />;

  return (
    <div className="space-y-8">
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full">
            <Bookmark size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Jobs</h1>
            <p className="text-sm font-medium text-gray-500">{savedJobs.length} jobs saved</p>
          </div>
        </div>
        
        {savedJobs.length > 0 && (
          <button
            onClick={handleRank}
            disabled={ranking}
            className="flex items-center gap-2 text-sm font-medium bg-[#2c2d30] text-white px-6 py-3 rounded-full hover:bg-black disabled:opacity-50 transition-all shadow-md"
          >
            <Sparkles size={16} className={ranking ? 'animate-pulse text-yellow-400' : 'text-yellow-400'} />
            {ranking ? 'Ranking...' : 'Rank by fit'}
          </button>
        )}
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-white/50 py-16 flex flex-col items-center justify-center text-gray-400">
          <Bookmark size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No saved jobs yet</p>
          <p className="text-sm">Browse jobs and click the star icon to save them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
