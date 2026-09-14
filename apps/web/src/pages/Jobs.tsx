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
  const limit = 20;

  const fetchJobs = useCallback(async (newOffset = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(limit), offset: String(newOffset) };
      if (q) params.q = q;
      if (remote) params.remote = remote;
      if (type) params.employment_type = type;
      const res = await api.jobs.list(params);
      setJobs(res.jobs as Job[]);
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

      <div className="text-sm text-gray-500 mb-3">{total} jobs found</div>

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
