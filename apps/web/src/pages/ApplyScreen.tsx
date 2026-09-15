import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.ts';
import { ArrowLeft, Copy, Check, ExternalLink, FileText } from 'lucide-react';

interface ApplyField {
  label: string;
  value: string;
  hint: string;
}

export function ApplyScreen() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fields, setFields] = useState<ApplyField[] | null>(null);
  const [job, setJob] = useState<{ title: string; company: string; source_url: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.resume.getTailored(jobId!),
      api.jobs.get(jobId!),
    ])
      .then(([tailored, j]) => {
        setFields(tailored.apply_fields ?? []);
        setJob({ title: j.title as string, company: j.company as string, source_url: j.source_url as string });
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [jobId]);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const openApplication = () => {
    if (job?.source_url) window.open(job.source_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/70 hover:bg-white border border-white/60 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Apply</h1>
          {job && <p className="text-sm text-gray-500">{job.title} · {job.company}</p>}
        </div>
      </div>

      {loading && (
        <div className="bg-white/70 rounded-3xl border border-white/60 p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Open application CTA */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-emerald-900">Ready to apply?</p>
              <p className="text-sm text-emerald-700 mt-0.5">Copy your details below, then open the application.</p>
            </div>
            <button
              onClick={openApplication}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md whitespace-nowrap"
            >
              <ExternalLink size={14} /> Open Application
            </button>
          </div>

          {/* Back to editor */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Application Details</p>
            <button
              onClick={() => navigate(`/resume-editor/${jobId}`)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              <FileText size={13} /> View resume
            </button>
          </div>

          {/* Prefilled fields */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 p-6 space-y-4">
            {fields && fields.length > 0 ? fields.map((field, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{field.label}</label>
                  {field.value && (
                    <button
                      onClick={() => copy(field.label, field.value)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      {copied === field.label ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copied === field.label ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 min-h-[40px]">
                  {field.value || <span className="text-gray-400 italic">Fill this in manually</span>}
                </div>
                {field.hint && <p className="text-xs text-gray-400">{field.hint}</p>}
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-4">No application fields extracted. Open the application and fill in your details.</p>
            )}
          </div>

          {/* Copy all */}
          {fields && fields.length > 0 && (
            <button
              onClick={() => {
                const text = fields.map(f => `${f.label}: ${f.value || '(fill in)'}`).join('\n');
                navigator.clipboard.writeText(text);
                setCopied('__all__');
                setTimeout(() => setCopied(null), 2000);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copied === '__all__' ? <><Check size={14} className="text-emerald-600" /> Copied all!</> : <><Copy size={14} /> Copy all details</>}
            </button>
          )}
        </>
      )}
    </div>
  );
}
