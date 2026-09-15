import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client.ts';
import { JobCard } from '../components/JobCard.tsx';
import { useSubscription } from '../hooks/useSubscription.ts';
import { useAuthStore } from '../stores/auth.ts';
import { Search, MapPin, Filter, Database, Briefcase, Bookmark, Zap, Crown, Sparkles, Lock, CheckCircle, AlertCircle, UserCircle } from 'lucide-react';
import { JobsPageSkeleton } from '../components/PageLoader.tsx';

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
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [offset, setOffset] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map()); // job_id -> saved_job id

  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState('');
  const [type, setType] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [matchScores, setMatchScores] = useState<Map<string, number>>(new Map());
  const [matchLoading, setMatchLoading] = useState<Set<string>>(new Set());
  const [matchErrors, setMatchErrors] = useState<Set<string>>(new Set());
  const [ingestMsg, setIngestMsg] = useState('');
  const [ingestKeyword, setIngestKeyword] = useState('');
  const [clearJobs, setClearJobs] = useState(true);
  const limit = 20;

  const { isPremium, subscription } = useSubscription();
  const { isAdmin } = useAuthStore();
  const [profileRoles, setProfileRoles] = useState<string[]>([]);

  useEffect(() => {
    api.profile.get()
      .then(p => {
        const roles = Array.isArray(p.preferred_roles) ? p.preferred_roles as string[] : [];
        setProfileRoles(roles);
      })
      .catch(() => {});
  }, []);

  // Premium instant search state
  const [searchState, setSearchState] = useState<'idle' | 'starting' | 'running' | 'done' | 'error'>('idle');
  const [searchMsg, setSearchMsg] = useState('');
  const [newJobCount, setNewJobCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setInitialLoad(false);
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
    setMatchErrors(prev => { const n = new Set(prev); n.delete(jobId); return n; });
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
          } else {
            setMatchErrors(prev => new Set([...prev, jobId]));
          }
        }
      }, 2000);
    } catch {
      setMatchLoading(prev => { const n = new Set(prev); n.delete(jobId); return n; });
      setMatchErrors(prev => new Set([...prev, jobId]));
    }
  };

  const handlePremiumSearch = async () => {
    if (searchState === 'running' || searchState === 'starting') return;
    if (pollRef.current) clearInterval(pollRef.current);

    setSearchState('starting');
    setSearchMsg('Connecting to Apify...');
    setNewJobCount(0);

    let runIds: string[] = [];
    try {
      const res = await api.premium.triggerSearch();
      runIds = res.runIds;
      setSearchState('running');
      setSearchMsg(`Searching Indeed for: ${res.terms.join(', ')}...`);
    } catch (e) {
      setSearchState('error');
      setSearchMsg((e as Error).message);
      return;
    }

    // Poll every 8 seconds until all runs complete
    pollRef.current = setInterval(async () => {
      try {
        const poll = await api.premium.pollSearch(runIds);
        if (poll.allDone) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setNewJobCount(poll.totalNew);
          setSearchState('done');
          setSearchMsg(poll.totalNew > 0
            ? `Found ${poll.totalNew} new job${poll.totalNew === 1 ? '' : 's'}! Refreshing list...`
            : 'Search complete. No new jobs found this time.');
          if (poll.totalNew > 0) {
            setTimeout(() => fetchJobs(0), 1500);
          }
        }
      } catch { /* poll errors are transient */ }
    }, 8000);
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

  if (initialLoad) return <JobsPageSkeleton />;

  return (
    <div className="space-y-8">
      {/* Dashboard Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-white/50 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="text-blue-500" size={24} />
            <span className="text-4xl font-light text-gray-900">{total}</span>
          </div>
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Jobs Found</span>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-white/50 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="text-yellow-500" size={24} />
            <span className="text-4xl font-light text-gray-900">{savedIds.size}</span>
          </div>
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Saved Jobs</span>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-white/50 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-purple-500" size={24} />
            <span className="text-4xl font-light text-gray-900">{matchScores.size}</span>
          </div>
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Matches Computed</span>
        </div>
      </div>

      {/* Premium panel */}
      {isPremium && subscription && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-[2rem] p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-600 mt-0.5">
                <Crown size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-amber-900">Premium Active</p>
                  {subscription.expires_at && (
                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      Expires {new Date(subscription.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {profileRoles.length > 0 ? (
                  <p className="text-sm text-amber-700 mt-1">
                    Searching Indeed for: <span className="font-medium">{profileRoles.slice(0, 3).join(', ')}</span>
                  </p>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <AlertCircle size={13} className="text-amber-500" />
                    <p className="text-sm text-amber-700">
                      No job roles set.{' '}
                      <a href="/profile" className="font-semibold underline underline-offset-2 hover:text-amber-900">
                        Add preferred roles in your profile
                      </a>{' '}
                      to personalise your search.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {searchState === 'idle' && (
                <button
                  onClick={handlePremiumSearch}
                  disabled={profileRoles.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Sparkles size={14} /> Search My Jobs Now
                </button>
              )}
              {(searchState === 'starting' || searchState === 'running') && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-amber-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm font-medium text-amber-800">{searchMsg}</span>
                </div>
              )}
              {searchState === 'done' && (
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle size={15} />
                    {newJobCount > 0 ? `${newJobCount} new job${newJobCount === 1 ? '' : 's'} added!` : 'No new jobs this time'}
                  </div>
                  <button onClick={() => setSearchState('idle')} className="text-xs text-amber-600 underline mt-1">Search again</button>
                </div>
              )}
              {searchState === 'error' && (
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                    <AlertCircle size={15} /> {searchMsg}
                  </div>
                  <button onClick={() => setSearchState('idle')} className="text-xs text-red-500 underline mt-1">Retry</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Free tier upgrade prompt */}
      {!isPremium && !isAdmin && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-[2rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-500">
              <Lock size={20} />
            </div>
            <div>
              <p className="font-semibold text-indigo-900 text-sm">Unlock Personalised Job Search</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Get jobs matched to your profile from Indeed, searched automatically every day.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-4 py-2 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 whitespace-nowrap">
            Contact admin to upgrade
          </span>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white/50 space-y-6">
        {/* Filter row */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="search"
              placeholder="Search jobs..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full bg-white border-none rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c2d30]/20 shadow-inner"
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="search"
              placeholder="Location..."
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-white border-none rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c2d30]/20 shadow-inner"
            />
          </div>
          <div className="flex-1 flex gap-4">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                value={remote} 
                onChange={e => setRemote(e.target.value)} 
                className="w-full bg-white border-none rounded-full pl-12 pr-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#2c2d30]/20 shadow-inner"
              >
                <option value="">All work types</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                value={type} 
                onChange={e => setType(e.target.value)} 
                className="w-full bg-white border-none rounded-full pl-12 pr-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#2c2d30]/20 shadow-inner"
              >
                <option value="">All job types</option>
                <option value="full_time">Full time</option>
                <option value="contract">Contract</option>
                <option value="part_time">Part time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200/60" />

        {/* Fetch by keyword row — admin only */}
        {isAdmin && <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fetch new jobs from remote sources</p>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="e.g. Python backend (comma = multiple)"
                value={ingestKeyword}
                onChange={e => setIngestKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !ingesting && handleIngest()}
                disabled={ingesting}
                className="w-full bg-white border-none rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c2d30]/20 disabled:opacity-50 shadow-inner"
              />
            </div>
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="w-full sm:w-auto text-sm font-medium bg-[#2c2d30] text-white px-6 py-3 rounded-full hover:bg-black disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Database size={16} />
              {ingesting ? 'Fetching...' : 'Search & fetch'}
            </button>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={clearJobs}
                onChange={e => setClearJobs(e.target.checked)}
                className="rounded text-[#2c2d30] focus:ring-[#2c2d30] border-gray-300 w-4 h-4"
              />
              Clear existing
            </label>
          </div>
          {ingestMsg && <p className="text-sm font-medium text-blue-600 mt-3">{ingestMsg}</p>}
        </div>}
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            saved={savedIds.has(job.id)}
            onSave={handleSave}
            onUnsave={handleUnsave}
            matchScore={matchScores.get(job.id)}
            matchLoading={matchLoading.has(job.id)}
            matchError={matchErrors.has(job.id)}
            onComputeMatch={computeMatch}
          />
        ))}
      </div>

      {jobs.length === 0 && !loading && (
        <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-white/50 py-16 flex flex-col items-center justify-center text-gray-400">
          <Search size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No jobs found</p>
          <p className="text-sm">Try adjusting your filters or fetch new jobs.</p>
        </div>
      )}

      {total > limit && (
        <div className="flex justify-between items-center mt-8 bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 border border-white/50">
          <button
            onClick={() => fetchJobs(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="text-sm font-medium bg-white px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-gray-600">
            {offset + 1} - {Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => fetchJobs(offset + limit)}
            disabled={offset + limit >= total}
            className="text-sm font-medium bg-white px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
