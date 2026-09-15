import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.ts';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [match, setMatch] = useState<Record<string, unknown> | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(false);
  const [draftRunId, setDraftRunId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.jobs.get(id).then(setJob).catch(console.error);
    api.jobs.getMatch(id).then(setMatch).catch(() => setMatch(null));

    api.savedJobs.list().then(res => {
      const found = (res.saved_jobs as Array<{ id: string; job_id: string }>).find(s => s.job_id === id);
      if (found) { setSaved(true); setSavedRecordId(found.id); }
    }).catch(() => {});
  }, [id]);

  const requestMatch = async () => {
    if (!id) return;
    setMatchLoading(true);
    setMatchError(false);
    try {
      const res = await api.agents.match(id);
      const interval = setInterval(async () => {
        const run = await api.agents.getRun(res.agent_run_id);
        if (run.status === 'completed') {
          clearInterval(interval);
          setMatchLoading(false);
          const m = await api.jobs.getMatch(id);
          setMatch(m);
        } else if (run.status === 'failed') {
          clearInterval(interval);
          setMatchLoading(false);
          setMatchError(true);
        }
      }, 2000);
    } catch {
      setMatchLoading(false);
      setMatchError(true);
    }
  };

  const requestDraft = async (type: 'cover_letter' | 'summary') => {
    if (!id) return;
    setDraftContent('Generating…');
    try {
      const res = await api.agents.draft(id, type);
      setDraftRunId(res.agent_run_id);
      const interval = setInterval(async () => {
        const run = await api.agents.getRun(res.agent_run_id);
        if (run.status === 'completed') {
          clearInterval(interval);
          const output = run.output as { content?: string };
          setDraftContent(output?.content ?? 'No content generated');
        } else if (run.status === 'failed') {
          clearInterval(interval);
          setDraftContent('Generation failed.');
        }
      }, 2000);
    } catch {
      setDraftContent('Request failed.');
    }
    void draftRunId;
  };

  const toggleSave = async () => {
    if (!id) return;
    if (saved && savedRecordId) {
      await api.savedJobs.remove(savedRecordId);
      setSaved(false); setSavedRecordId(null);
    } else {
      const res = await api.savedJobs.save(id);
      setSaved(true); setSavedRecordId(res.id);
    }
  };

  if (!job) return <div className="text-gray-400">Loading…</div>;

  const skills = Array.isArray(job.required_skills) ? job.required_skills as string[] : [];

  return (
    <div className="max-w-3xl">
      <Link to="/jobs" className="text-sm text-blue-600 hover:underline mb-4 block">← Back to jobs</Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{String(job.title)}</h1>
            <div className="text-gray-600 mt-1">{String(job.company)}</div>
            <div className="flex gap-2 mt-2 flex-wrap text-sm text-gray-500">
              {!!job.location && <span>{String(job.location)}</span>}
              {!!job.remote && <span className="capitalize">{String(job.remote)}</span>}
              {!!job.employment_type && <span>{String(job.employment_type).replace('_', ' ')}</span>}
            </div>
          </div>
          <button
            onClick={toggleSave}
            className={`text-2xl transition-colors ${saved ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
          >
            ★
          </button>
        </div>

        {skills.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Required skills</div>
            <div className="flex flex-wrap gap-1">
              {skills.map(s => (
                <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}

        {!!job.description && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Description</div>
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {String(job.description).slice(0, 3000)}
            </div>
          </div>
        )}

        {!!job.source_url && (
          <a
            href={String(job.source_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm text-blue-600 hover:underline"
          >
            View original posting →
          </a>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium text-gray-900">Match score</h2>
          {!match && !matchLoading && (
            <button
              onClick={requestMatch}
              className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${matchError ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {matchError ? 'Retry match' : 'Compute match'}
            </button>
          )}
          {matchLoading && <span className="text-sm text-gray-400">Computing…</span>}
          {matchError && !matchLoading && (
            <span className="text-xs text-red-500 ml-2">Analysis failed — check your profile and try again</span>
          )}
        </div>

        {match && (
          <div>
            <div className={`text-3xl font-bold ${scoreColor(match.score as number)}`}>
              {Math.round((match.score as number) * 100)}%
            </div>
            <p className="text-sm text-gray-600 mt-2">{String(match.explanation ?? '')}</p>
            {Array.isArray(match.missing_skills) && match.missing_skills.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Missing skills</div>
                <div className="flex flex-wrap gap-1">
                  {(match.missing_skills as string[]).map(s => (
                    <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-3">Application draft</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={() => requestDraft('cover_letter')} className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg transition-colors">
            Cover letter
          </button>
          <button onClick={() => requestDraft('summary')} className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg transition-colors">
            Profile summary
          </button>
        </div>
        {draftContent && (
          <textarea
            readOnly
            value={draftContent}
            className="w-full h-48 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 0.75) return 'text-green-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-gray-500';
}
