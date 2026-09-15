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
      // Poll for completion
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

  if (!profile) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-3">Resume</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload PDF or DOCX'}
          </button>
          {!!profile.resume_r2_key && <span className="text-sm text-green-600">Resume on file</span>}
        </div>
        {uploadStatus && <p className="text-sm text-gray-500 mt-2">{uploadStatus}</p>}
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-medium text-gray-900">Details</h2>

        <Field label="Full name">
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={inputCls} />
        </Field>
        <Field label="Headline (e.g. Senior Backend Engineer)">
          <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} className={inputCls} />
        </Field>
        <Field label="Summary">
          <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className={inputCls + ' h-24 resize-none'} />
        </Field>
        <Field label="Years of experience">
          <input type="number" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))} className={inputCls} min={0} />
        </Field>
        <Field label="Skills (comma-separated)">
          <input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} className={inputCls} placeholder="TypeScript, React, Node.js" />
        </Field>
        <Field label="Preferred roles (comma-separated)">
          <input value={form.preferred_roles} onChange={e => setForm(f => ({ ...f, preferred_roles: e.target.value }))} className={inputCls} placeholder="Backend Engineer, Platform Engineer" />
        </Field>
        <Field label="Preferred locations (comma-separated)">
          <input value={form.preferred_locations} onChange={e => setForm(f => ({ ...f, preferred_locations: e.target.value }))} className={inputCls} placeholder="London, Remote" />
        </Field>
        <Field label="Remote preference">
          <select value={form.remote_preference} onChange={e => setForm(f => ({ ...f, remote_preference: e.target.value }))} className={inputCls}>
            <option value="">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </Field>
        <Field label="Minimum salary (annual)">
          <input type="number" value={form.min_salary} onChange={e => setForm(f => ({ ...f, min_salary: e.target.value }))} className={inputCls} min={0} />
        </Field>
        <Field label="Employment types (comma-separated: full_time, contract, part_time)">
          <input value={form.employment_types} onChange={e => setForm(f => ({ ...f, employment_types: e.target.value }))} className={inputCls} placeholder="full_time" />
        </Field>

        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
