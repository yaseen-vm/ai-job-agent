import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.ts';

export function Profile() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: '', headline: '', summary: '', years_experience: '',
    remote_preference: '', min_salary: '',
    skills: '', preferred_roles: '', preferred_locations: '', employment_types: '',
  });

  useEffect(() => {
    api.profile.get().then(p => {
      setProfile(p);
      setForm({
        full_name: String(p.full_name ?? ''),
        headline: String(p.headline ?? ''),
        summary: String(p.summary ?? ''),
        years_experience: String(p.years_experience ?? ''),
        remote_preference: String(p.remote_preference ?? ''),
        min_salary: String(p.min_salary ?? ''),
        skills: Array.isArray(p.skills) ? p.skills.join(', ') : '',
        preferred_roles: Array.isArray(p.preferred_roles) ? p.preferred_roles.join(', ') : '',
        preferred_locations: Array.isArray(p.preferred_locations) ? p.preferred_locations.join(', ') : '',
        employment_types: Array.isArray(p.employment_types) ? p.employment_types.join(', ') : '',
      });
    }).catch(() => setProfile({}));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        full_name: form.full_name || null,
        headline: form.headline || null,
        summary: form.summary || null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        remote_preference: form.remote_preference || null,
        min_salary: form.min_salary ? parseInt(form.min_salary) : null,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        preferred_roles: form.preferred_roles.split(',').map(s => s.trim()).filter(Boolean),
        preferred_locations: form.preferred_locations.split(',').map(s => s.trim()).filter(Boolean),
        employment_types: form.employment_types.split(',').map(s => s.trim()).filter(Boolean),
      };
      const updated = await api.profile.update(data);
      setProfile(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Uploading…');
    try {
      const res = await api.profile.uploadResume(file);
      setUploadStatus(`Uploaded. Extracting profile (run ${res.agent_run_id})…`);
      const interval = setInterval(async () => {
        try {
          const run = await api.agents.getRun(res.agent_run_id);
          if (run.status === 'completed') {
            clearInterval(interval);
            setUploadStatus('Profile extracted from resume. Fields updated below.');
            const p = await api.profile.get();
            setProfile(p);
            setForm({
              full_name: String(p.full_name ?? ''),
              headline: String(p.headline ?? ''),
              summary: String(p.summary ?? ''),
              years_experience: String(p.years_experience ?? ''),
              remote_preference: String(p.remote_preference ?? ''),
              min_salary: String(p.min_salary ?? ''),
              skills: Array.isArray(p.skills) ? (p.skills as string[]).join(', ') : '',
              preferred_roles: Array.isArray(p.preferred_roles) ? (p.preferred_roles as string[]).join(', ') : '',
              preferred_locations: Array.isArray(p.preferred_locations) ? (p.preferred_locations as string[]).join(', ') : '',
              employment_types: Array.isArray(p.employment_types) ? (p.employment_types as string[]).join(', ') : '',
            });
          } else if (run.status === 'failed') {
            clearInterval(interval);
            setUploadStatus(`Extraction failed: ${run.error}`);
          }
        } catch { clearInterval(interval); }
      }, 3000);
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return (
    <div className="py-12 border-t border-line font-mono text-[10px] uppercase tracking-widest animate-pulse">
      Loading Profile...
    </div>
  );

  return (
    <div className="space-y-16 max-w-4xl">
      <div className="border-b border-line pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">User / 04</p>
          <h1 className="font-serif text-[clamp(60px,8vw,120px)] leading-[0.8] tracking-tight m-0">PROFILE<br/><em className="italic font-normal">DATA</em></h1>
        </div>
      </div>

      <div className="border border-line p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-acid/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-700 pointer-events-none"></div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">CV Document</p>
        <div className="flex flex-wrap items-center gap-6 relative z-10">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="font-mono text-[10px] uppercase tracking-widest bg-ink text-paper px-6 py-4 hover:bg-acid hover:text-ink transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? 'UPLOADING...' : 'UPLOAD PDF OR DOCX'}
          </button>
          {!!profile.resume_r2_key && <span className="font-mono text-[10px] uppercase tracking-widest text-acid bg-ink px-3 py-1">Resume on file</span>}
        </div>
        {uploadStatus && <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mt-4 relative z-10">{uploadStatus}</p>}
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
      </div>

      <form onSubmit={handleSave} className="space-y-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <Field label="Full name">
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Headline">
            <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} className={inputCls} placeholder="Senior Backend Engineer" />
          </Field>
          
          <div className="md:col-span-2">
            <Field label="Summary">
              <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className={inputCls + ' min-h-[120px] resize-y py-4'} />
            </Field>
          </div>

          <Field label="Years of experience">
            <input type="number" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))} className={inputCls} min={0} />
          </Field>
          <Field label="Minimum salary (annual)">
            <input type="number" value={form.min_salary} onChange={e => setForm(f => ({ ...f, min_salary: e.target.value }))} className={inputCls} min={0} />
          </Field>

          <Field label="Remote preference">
            <select value={form.remote_preference} onChange={e => setForm(f => ({ ...f, remote_preference: e.target.value }))} className={inputCls}>
              <option value="">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </Field>
          <Field label="Employment types">
            <input value={form.employment_types} onChange={e => setForm(f => ({ ...f, employment_types: e.target.value }))} className={inputCls} placeholder="full_time, contract" />
          </Field>

          <div className="md:col-span-2">
            <Field label="Skills (comma-separated)">
              <input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} className={inputCls} placeholder="TypeScript, React, Node.js" />
            </Field>
          </div>
          
          <Field label="Preferred roles">
            <input value={form.preferred_roles} onChange={e => setForm(f => ({ ...f, preferred_roles: e.target.value }))} className={inputCls} placeholder="Backend Engineer" />
          </Field>
          <Field label="Preferred locations">
            <input value={form.preferred_locations} onChange={e => setForm(f => ({ ...f, preferred_locations: e.target.value }))} className={inputCls} placeholder="London, Remote" />
          </Field>
        </div>

        <div className="border-t border-line pt-8 flex justify-end">
          <button type="submit" disabled={saving} className="font-mono text-[10px] uppercase tracking-widest bg-ink text-paper px-8 py-4 hover:bg-acid hover:text-ink transition-colors disabled:opacity-50">
            {saving ? 'SAVING...' : 'SAVE PROFILE →'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = 'w-full bg-transparent border-b border-line px-0 py-3 font-sans text-lg focus:outline-none focus:border-ink transition-colors rounded-none placeholder:text-gray-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</label>
      {children}
    </div>
  );
}
