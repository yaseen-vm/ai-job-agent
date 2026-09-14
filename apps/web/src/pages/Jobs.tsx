import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.ts';
import { JobCard } from '../components/JobCard.tsx';

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
  const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map()); // job_id -> saved_job id

  const [q, setQ] = useState('');
  const [remote, setRemote] = useState('');
  const [type, setType] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState('');
  const [ingestKeyword, setIngestKeyword] = useState('');
  const [clearJobs, setClearJobs] = useState(true);
  const limit = 20;

  const fetchJobs = useCallback(async (newOffset = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(limit), offset: String(newOffset) };
      if (q) params.q = q;
      if (remote) params.remote = remote;
      if (type) params.employment_type = type;
      const res = await api.jobs.list(params);
      setJobs(res.jobs as unknown as Job[]);
      setTotal(res.total);
      setOffset(newOffset);
    } finally {
      setLoading(false);
    }
  }, [q, remote, type]);

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

  const handleIngest = async () => {
    if (!ingestKeyword.trim()) {
      setIngestMsg('Enter a keyword first.');
      return;
    }
    setIngesting(true);
    setIngestMsg('Fetching jobs… this takes ~30s.');
    try {
      await api.admin.ingest(ingestKeyword.trim(), clearJobs);
      setTimeout(() => { fetchJobs(0); setIngestMsg('Done! Jobs updated.'); setIngesting(false); }, 35000);
    } catch {
      setIngestMsg('Ingestion failed.'); setIngesting(false);
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="search"
          placeholder="Search jobs…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-48"
        />
        <select value={remote} onChange={e => setRemote(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All locations</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>
        <select value={type} onChange={e => setType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All types</option>
          <option value="full_time">Full time</option>
          <option value="contract">Contract</option>
          <option value="part_time">Part time</option>
        </select>
      </div>

      {loading && <div className="text-gray-400 text-sm mb-4">Loading…</div>}

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <p className="text-sm font-medium text-gray-700 mb-3">Fetch jobs by keyword</p>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="e.g. React developer, Python backend…"
            value={ingestKeyword}
            onChange={e => setIngestKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !ingesting && handleIngest()}
            disabled={ingesting}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-56 disabled:opacity-50"
          />
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {ingesting ? 'Fetching…' : 'Search & fetch'}
          </button>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={clearJobs}
              onChange={e => setClearJobs(e.target.checked)}
              className="rounded"
            />
            Clear existing jobs first
          </label>
        </div>
        {ingestMsg && <p className="text-sm text-gray-500 mt-2">{ingestMsg}</p>}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{total} jobs found</span>
      </div>

      <div className="space-y-2">
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            saved={savedIds.has(job.id)}
            onSave={handleSave}
            onUnsave={handleUnsave}
          />
        ))}
      </div>

      {jobs.length === 0 && !loading && (
        <div className="text-gray-400 text-center py-12">No jobs found</div>
      )}

      {total > limit && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => fetchJobs(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => fetchJobs(offset + limit)}
            disabled={offset + limit >= total}
            className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
