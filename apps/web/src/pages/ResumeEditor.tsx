import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.ts';
import { ArrowLeft, Download, Send, Plus, Trash2, RefreshCw } from 'lucide-react';

type ResumeData = NonNullable<Awaited<ReturnType<typeof api.resume.getTailored>>['resume_data']>;

function usePolledTailored(jobId: string) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'running' | 'completed' | 'failed'>('idle');
  const [data, setData] = useState<Awaited<ReturnType<typeof api.resume.getTailored>> | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async (retrigger = false) => {
    setError('');
    if (retrigger) {
      await api.resume.deleteTailored(jobId).catch(() => {});
    }

    let runId = '';
    try {
      const res = await api.resume.tailor(jobId);
      runId = res.id;
      setStatus(res.status as typeof status);
      if (res.status === 'completed') {
        const full = await api.resume.getTailored(jobId);
        setData(full);
        return;
      }
    } catch (e) {
      setError((e as Error).message);
      setStatus('failed');
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.resume.getTailored(jobId);
        setStatus(res.status as typeof status);
        if (res.status === 'completed' || res.status === 'failed') {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          if (res.status === 'completed') {
            setData(res);
          } else {
            setError(res.error ?? 'Generation failed');
          }
        }
      } catch {}
    }, 2500);
    void runId;
  }, [jobId]);

  useEffect(() => {
    start();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [start]);

  return { status, data, error, retry: () => start(true) };
}

export function ResumeEditor() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { status, data, error, retry } = usePolledTailored(jobId!);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [job, setJob] = useState<{ title: string; company: string } | null>(null);

  useEffect(() => {
    if (data?.resume_data) setResume(data.resume_data);
  }, [data]);

  useEffect(() => {
    api.jobs.get(jobId!).then(j => setJob({ title: j.title as string, company: j.company as string })).catch(() => {});
  }, [jobId]);

  const handlePrint = () => window.print();

  const updateSummary = (v: string) => setResume(r => r ? { ...r, summary: v } : r);

  const updateExp = (i: number, field: string, v: string) =>
    setResume(r => r ? { ...r, experience: r.experience.map((e, idx) => idx === i ? { ...e, [field]: v } : e) } : r);

  const updateBullet = (ei: number, bi: number, v: string) =>
    setResume(r => r ? { ...r, experience: r.experience.map((e, i) => i === ei ? { ...e, bullets: e.bullets.map((b, j) => j === bi ? v : b) } : e) } : r);

  const addBullet = (ei: number) =>
    setResume(r => r ? { ...r, experience: r.experience.map((e, i) => i === ei ? { ...e, bullets: [...e.bullets, ''] } : e) } : r);

  const removeBullet = (ei: number, bi: number) =>
    setResume(r => r ? { ...r, experience: r.experience.map((e, i) => i === ei ? { ...e, bullets: e.bullets.filter((_, j) => j !== bi) } : e) } : r);

  const updateSkills = (v: string) =>
    setResume(r => r ? { ...r, skills: v.split(',').map(s => s.trim()).filter(Boolean) } : r);

  const isLoading = status === 'pending' || status === 'running' || status === 'idle';

  return (
    <>
      {/* Print styles — only the resume div is visible when printing */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #resume-print-root { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; padding: 0; margin: 0; }
          #resume-print-root * { font-family: Arial, Helvetica, sans-serif !important; }
        }
        #resume-print-root { display: none; }
      `}</style>

      {/* Hidden print-only resume */}
      {resume && (
        <div id="resume-print-root">
          <PrintResume resume={resume} />
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/70 hover:bg-white border border-white/60 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Resume Tailor</h1>
            {job && <p className="text-sm text-gray-500">{job.title} · {job.company}</p>}
          </div>
        </div>

        {isLoading && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 p-12 flex flex-col items-center gap-4">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-base font-semibold text-gray-700">Crafting your ATS-optimized resume...</p>
            <p className="text-sm text-gray-400">AI is analysing the job description and tailoring your resume. Takes 20–40 seconds.</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
            <p className="text-base font-semibold text-red-700">Generation failed</p>
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={retry} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {status === 'completed' && resume && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-sm text-amber-800">
              <strong>Review carefully.</strong> AI may have reworded bullets — confirm everything is accurate before downloading.
            </div>

            {/* Contact */}
            <Section title="Contact">
              <div className="grid grid-cols-2 gap-3">
                {(['name', 'email', 'phone', 'location', 'linkedin'] as const).map(f => (
                  <Field key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} value={resume.contact[f]}
                    onChange={v => setResume(r => r ? { ...r, contact: { ...r.contact, [f]: v } } : r)} />
                ))}
              </div>
            </Section>

            {/* Summary */}
            <Section title="Professional Summary">
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                rows={4}
                value={resume.summary}
                onChange={e => updateSummary(e.target.value)}
              />
            </Section>

            {/* Experience */}
            <Section title="Experience">
              {resume.experience.map((exp, ei) => (
                <div key={ei} className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-white mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Title" value={exp.title} onChange={v => updateExp(ei, 'title', v)} />
                    <Field label="Company" value={exp.company} onChange={v => updateExp(ei, 'company', v)} />
                    <Field label="Location" value={exp.location} onChange={v => updateExp(ei, 'location', v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Start" value={exp.start_date} onChange={v => updateExp(ei, 'start_date', v)} />
                      <Field label="End" value={exp.end_date} onChange={v => updateExp(ei, 'end_date', v)} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Bullets</p>
                  {exp.bullets.map((b, bi) => (
                    <div key={bi} className="flex gap-2 items-start">
                      <textarea
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                        rows={2}
                        value={b}
                        onChange={e => updateBullet(ei, bi, e.target.value)}
                      />
                      <button onClick={() => removeBullet(ei, bi)} className="mt-1 p-1.5 rounded-full text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addBullet(ei)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors">
                    <Plus size={13} /> Add bullet
                  </button>
                </div>
              ))}
            </Section>

            {/* Education */}
            <Section title="Education">
              {resume.education.map((ed, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 mb-3">
                  <Field label="Degree" value={ed.degree} onChange={v => setResume(r => r ? { ...r, education: r.education.map((e, j) => j === i ? { ...e, degree: v } : e) } : r)} />
                  <Field label="School" value={ed.school} onChange={v => setResume(r => r ? { ...r, education: r.education.map((e, j) => j === i ? { ...e, school: v } : e) } : r)} />
                  <Field label="Year" value={ed.year} onChange={v => setResume(r => r ? { ...r, education: r.education.map((e, j) => j === i ? { ...e, year: v } : e) } : r)} />
                </div>
              ))}
            </Section>

            {/* Skills */}
            <Section title="Skills">
              <p className="text-xs text-gray-400 mb-2">Comma-separated</p>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                rows={3}
                value={resume.skills.join(', ')}
                onChange={e => updateSkills(e.target.value)}
              />
            </Section>

            {/* Certifications */}
            {resume.certifications.length > 0 && (
              <Section title="Certifications">
                {resume.certifications.map((cert, i) => (
                  <div key={i} className="flex gap-2 items-center mb-2">
                    <input
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                      value={cert}
                      onChange={e => setResume(r => r ? { ...r, certifications: r.certifications.map((c, j) => j === i ? e.target.value : c) } : r)}
                    />
                  </div>
                ))}
              </Section>
            )}

            {/* Action bar */}
            <div className="flex gap-3 justify-end pb-8">
              <button
                onClick={retry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={14} /> Regenerate
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors shadow-md"
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => navigate(`/apply/${jobId}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md"
              >
                <Send size={14} /> Confirm &amp; Apply
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 p-6 space-y-3">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function PrintResume({ resume }: { resume: ResumeData }) {
  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', maxWidth: '750px', margin: '32px auto', color: '#111', lineHeight: 1.5, fontSize: '11pt' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20pt', fontWeight: 700, margin: 0 }}>{resume.contact.name}</h1>
        <p style={{ margin: '4px 0', color: '#444', fontSize: '10pt' }}>
          {[resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.linkedin].filter(Boolean).join(' · ')}
        </p>
      </div>
      <hr style={{ borderTop: '2px solid #111', marginBottom: '12px' }} />

      {/* Summary */}
      {resume.summary && (
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Summary</h2>
          <p style={{ margin: 0 }}>{resume.summary}</p>
        </div>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Experience</h2>
          {resume.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{exp.title}</strong>
                <span style={{ color: '#555' }}>{exp.start_date} – {exp.end_date}</span>
              </div>
              <div style={{ color: '#444', fontSize: '10pt' }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</div>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {exp.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ marginBottom: '2px' }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Education</h2>
          {resume.education.map((ed, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span><strong>{ed.degree}</strong> · {ed.school}</span>
              <span style={{ color: '#555' }}>{ed.year}</span>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Skills</h2>
          <p style={{ margin: 0 }}>{resume.skills.join(' · ')}</p>
        </div>
      )}

      {/* Certifications */}
      {resume.certifications.length > 0 && (
        <div>
          <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Certifications</h2>
          <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
            {resume.certifications.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
