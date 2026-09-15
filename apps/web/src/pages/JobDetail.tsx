import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.ts';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [match, setMatch] = useState<Record<string, unknown> | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
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
        }
      }, 2000);
    } catch {
      setMatchLoading(false);
    }
  };

  const requestDraft = async (type: 'cover_letter' | 'summary') => {
    if (!id) return;
    setDraftContent('GENERATING...');
    try {
      const res = await api.agents.draft(id, type);
      setDraftRunId(res.agent_run_id);
      const interval = setInterval(async () => {
        const run = await api.agents.getRun(res.agent_run_id);
        if (run.status === 'completed') {
          clearInterval(interval);
          const output = run.output as { content?: string };
          setDraftContent(output?.content ?? 'NO CONTENT GENERATED');
        } else if (run.status === 'failed') {
          clearInterval(interval);
          setDraftContent('GENERATION FAILED.');
        }
      }, 2000);
    } catch {
      setDraftContent('REQUEST FAILED.');
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

  if (!job) return (
    <div className="py-12 border-t border-line font-mono text-[10px] uppercase tracking-widest animate-pulse">
      Loading Data...
    </div>
  );

  const skills = Array.isArray(job.required_skills) ? job.required_skills as string[] : [];

  return (
    <div className="max-w-4xl space-y-12 pb-24">
      <div className="border-b border-line pb-8">
        <Link to="/jobs" className="font-mono text-[10px] uppercase tracking-widest text-gray-500 hover:text-ink transition-colors mb-8 block">
          ← Back to List
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-4">{String(job.company)}</p>
            <h1 className="font-serif text-[clamp(40px,6vw,90px)] leading-[0.85] tracking-[-0.04em] m-0 mb-6">{String(job.title)}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">
              {!!job.location && <span>/ {String(job.location)}</span>}
              {!!job.remote && <span>/ {String(job.remote)}</span>}
              {!!job.employment_type && <span>/ {String(job.employment_type).replace('_', ' ')}</span>}
            </div>
          </div>
          <button
            onClick={toggleSave}
            className={`font-mono text-[10px] uppercase tracking-widest border border-line px-4 py-2 transition-colors ${saved ? 'bg-ink text-paper border-ink' : 'hover:bg-acid hover:text-ink hover:border-acid'}`}
          >
            {saved ? '[ SAVED ]' : '[ SAVE ]'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-12">
          {!!job.description && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">Description</p>
              <div className="font-sans text-sm leading-relaxed text-gray-800 whitespace-pre-wrap columns-1 lg:columns-2 gap-8">
                {String(job.description).slice(0, 3000)}
              </div>
            </div>
          )}

          {!!job.source_url && (
            <div className="pt-8 border-t border-line">
              <a
                href={String(job.source_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-widest border-b border-ink pb-1 hover:text-acid hover:border-acid transition-colors"
              >
                View original posting ↗
              </a>
            </div>
          )}
        </div>

        <div className="space-y-12 border-t md:border-t-0 md:border-l border-line pt-8 md:pt-0 md:pl-8">
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Match Score</p>
              {!match && !matchLoading && (
                <button
                  onClick={requestMatch}
                  className="font-mono text-[10px] uppercase tracking-widest text-ink hover:text-acid transition-colors underline"
                >
                  Compute
                </button>
              )}
              {matchLoading && <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400 animate-pulse">Computing...</span>}
            </div>

            {match ? (
              <div>
                <div className="font-serif text-[clamp(40px,5vw,70px)] leading-[0.8] mb-4">
                  {Math.round((match.score as number) * 100)}%
                </div>
                <p className="font-sans text-sm text-gray-600 leading-relaxed mb-6">
                  {String(match.explanation ?? '')}
                </p>
                {Array.isArray(match.missing_skills) && match.missing_skills.length > 0 && (
                  <div className="border-t border-line pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-red-500 mb-3">Missing Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {(match.missing_skills as string[]).map(s => (
                        <span key={s} className="font-mono text-[10px] uppercase tracking-widest border border-red-200 text-red-500 px-2 py-1">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="font-serif text-3xl italic text-gray-300">--%</div>
            )}
          </div>

          <div className="border-t border-line pt-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">Required Skills</p>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="font-mono text-[10px] uppercase tracking-widest border border-line px-2 py-1">{s}</span>
                ))}
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">None specified.</p>
            )}
          </div>

          <div className="border-t border-line pt-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">Agent Actions</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => requestDraft('cover_letter')} className="font-mono text-[10px] uppercase tracking-widest text-left border border-line px-4 py-3 hover:bg-ink hover:text-paper transition-colors">
                Draft Cover Letter
              </button>
              <button onClick={() => requestDraft('summary')} className="font-mono text-[10px] uppercase tracking-widest text-left border border-line px-4 py-3 hover:bg-ink hover:text-paper transition-colors">
                Draft Summary
              </button>
            </div>
            {draftContent && (
              <div className="mt-6 border border-line p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-acid bg-ink px-2 inline-block mb-4">Draft Output</p>
                <textarea
                  readOnly
                  value={draftContent}
                  className="w-full h-48 bg-transparent text-sm font-sans text-ink resize-y focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
