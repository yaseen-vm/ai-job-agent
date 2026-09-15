import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.ts';
import { JobCard } from '../components/JobCard.tsx';
import { Database } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  remote?: string;
  employment_type?: string;
  min_salary?: number;
  max_salary?: number;
  salary_currency?: string;
  posted_at?: number;
}

export function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map());

  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState('');
  const [type, setType] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [matchScores, setMatchScores] = useState<Map<string, number>>(new Map());
  const [matchLoading, setMatchLoading] = useState<Set<string>>(new Set());
  const [ingestMsg, setIngestMsg] = useState('');
  const [ingestKeyword, setIngestKeyword] = useState('');
  const [clearJobs, setClearJobs] = useState(true);
  const limit = 20;

  const fetchJobs = useCallback(async (newOffset = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(limit), offset: String(newOffset) };
      if (q) params.q = q;
      if (location) params.location = location;
      if (remote) params.remote = remote;
      if (type) params.employment_type = type;
      const res = await api.jobs.list(params);
      setJobs(res.jobs as unknown as Job[]);
      setTotal(res.total);
      setOffset(newOffset);
    } finally {
      setLoading(false);
    }
  }, [q, location, remote, type]);

  useEffect(() => {
    fetchJobs(0);
  }, [fetchJobs]);

  useEffect(() => {
    api.savedJobs.list().then(res => {
      const ids = new Set<string>();
      const map = new Map<string, string>();
      for (const s of res.saved_jobs as Array<{ id: string; job_id: string }>) {
        ids.add(s.job_id);
        map.set(s.job_id, s.id);
      }
      setSavedIds(ids);
      setSavedMap(map);
    }).catch(() => {});
  }, []);

  const handleSave = async (jobId: string) => {
    try {
      const res = await api.savedJobs.save(jobId);
      setSavedIds(prev => new Set([...prev, jobId]));
      setSavedMap(prev => new Map([...prev, [jobId, res.id]]));
    } catch {}
  };

  const handleUnsave = async (jobId: string) => {
    const savedId = savedMap.get(jobId);
    if (!savedId) return;
    try {
      await api.savedJobs.remove(savedId);
      setSavedIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
      setSavedMap(prev => { const n = new Map(prev); n.delete(jobId); return n; });
    } catch {}
  };

  const computeMatch = async (jobId: string) => {
    setMatchLoading(prev => new Set([...prev, jobId]));
    try {
      const res = await api.agents.match(jobId);
      const interval = setInterval(async () => {
        const run = await api.agents.getRun(res.agent_run_id);
        if (run.status === 'completed' || run.status === 'failed') {
          clearInterval(interval);
          setMatchLoading(prev => { const n = new Set(prev); n.delete(jobId); return n; });
          if (run.status === 'completed') {
            const m = await api.jobs.getMatch(jobId) as { score?: number };
            if (m.score !== undefined) setMatchScores(prev => new Map([...prev, [jobId, m.score as number]]));
          }
        }
      }, 2000);
    } catch {
      setMatchLoading(prev => { const n = new Set(prev); n.delete(jobId); return n; });
    }
  };

  const handleIngest = async () => {
    if (!ingestKeyword.trim()) {
      setIngestMsg('Enter a keyword first.');
      return;
    }
    setIngesting(true);
    setIngestMsg('Fetching jobs... this takes ~30s.');
    try {
      await api.admin.ingest(ingestKeyword.trim(), clearJobs);
      setTimeout(() => { fetchJobs(0); setIngestMsg('Done! Jobs updated.'); setIngesting(false); }, 35000);
    } catch {
      setIngestMsg('Ingestion failed.'); setIngesting(false);
    }
  };

  return (
    <div className="space-y-16">
      <div className="border-b border-line pb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">Metrics / Dashboard</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="block font-serif text-[clamp(60px,8vw,120px)] leading-[0.8] tracking-tight">{total}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest mt-4 block border-t border-line pt-2">Total Opportunities</span>
          </div>
          <div>
            <span className="block font-serif text-[clamp(60px,8vw,120px)] leading-[0.8] tracking-tight">{savedIds.size}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest mt-4 block border-t border-line pt-2">Saved Jobs</span>
          </div>
          <div>
            <span className="block font-serif text-[clamp(60px,8vw,120px)] leading-[0.8] tracking-tight">{matchScores.size}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest mt-4 block border-t border-line pt-2">Matches Processed</span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Query / Filter</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-line pb-8">
          <input
            type="search"
            placeholder="Search keywords..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="bg-transparent border border-line px-4 py-3 font-sans text-sm focus:outline-none focus:border-ink placeholder:text-gray-400"
          />
          <input
            type="search"
            placeholder="Location..."
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="bg-transparent border border-line px-4 py-3 font-sans text-sm focus:outline-none focus:border-ink placeholder:text-gray-400"
          />
          <select 
            value={remote} 
            onChange={e => setRemote(e.target.value)} 
            className="bg-transparent border border-line px-4 py-3 font-sans text-sm appearance-none focus:outline-none focus:border-ink"
          >
            <option value="">All work types</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
          <select 
            value={type} 
            onChange={e => setType(e.target.value)} 
            className="bg-transparent border border-line px-4 py-3 font-sans text-sm appearance-none focus:outline-none focus:border-ink"
          >
            <option value="">All job types</option>
            <option value="full_time">Full time</option>
            <option value="contract">Contract</option>
            <option value="part_time">Part time</option>
          </select>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-4">Ingestion Engine</p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="e.g. Python backend (comma = multiple)"
              value={ingestKeyword}
              onChange={e => setIngestKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !ingesting && handleIngest()}
              disabled={ingesting}
              className="flex-1 bg-transparent border border-line px-4 py-3 font-sans text-sm focus:outline-none focus:border-ink placeholder:text-gray-400 disabled:opacity-50"
            />
            <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={clearJobs}
                onChange={e => setClearJobs(e.target.checked)}
                className="accent-ink w-3 h-3"
              />
              Wipe Old
            </label>
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="w-full sm:w-auto font-mono text-[10px] uppercase tracking-widest bg-ink text-paper px-6 py-3 hover:bg-acid hover:text-ink transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Database size={14} />
              {ingesting ? 'Fetching...' : 'Ingest'}
            </button>
          </div>
          {ingestMsg && <p className="font-mono text-[10px] uppercase tracking-widest text-acid bg-ink inline-block px-2 mt-4">{ingestMsg}</p>}
        </div>
      </div>

      {loading && (
        <div className="py-12 border-t border-line font-mono text-[10px] uppercase tracking-widest animate-pulse">
          Loading Data...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            saved={savedIds.has(job.id)}
            onSave={handleSave}
            onUnsave={handleUnsave}
            matchScore={matchScores.get(job.id)}
            matchLoading={matchLoading.has(job.id)}
            onComputeMatch={computeMatch}
          />
        ))}
      </div>

      {jobs.length === 0 && !loading && (
        <div className="py-24 border border-line flex flex-col items-center justify-center">
          <p className="font-serif text-4xl mb-4 italic">Empty state.</p>
          <p className="font-mono text-[10px] uppercase tracking-widest">No listings available. Ingest data to begin.</p>
        </div>
      )}

      {total > limit && (
        <div className="flex justify-between items-center py-4 border-t border-line font-mono text-[10px] uppercase tracking-widest">
          <button
            onClick={() => fetchJobs(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="hover:text-acid disabled:opacity-50 transition-colors"
          >
            ← Prev
          </button>
          <span>
            {offset + 1} / {Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => fetchJobs(offset + limit)}
            disabled={offset + limit >= total}
            className="hover:text-acid disabled:opacity-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
