import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.ts';
import { useSubscription } from '../hooks/useSubscription.ts';
import {
  User, FileText, Briefcase, MapPin, DollarSign, Zap,
  Upload, CheckCircle, Loader, Crown, Save, ChevronDown,
} from 'lucide-react';

const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c2d30]/20 transition-shadow';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-1">
        <div className="p-2 rounded-xl bg-gray-100 text-gray-600">{icon}</div>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Profile() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isPremium, subscription } = useSubscription();

  const [form, setForm] = useState({
    full_name: '', headline: '', summary: '', years_experience: '',
    remote_preference: '', min_salary: '',
    skills: '', preferred_roles: '', preferred_locations: '', employment_types: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

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
        skills: Array.isArray(p.skills) ? (p.skills as string[]).join(', ') : '',
        preferred_roles: Array.isArray(p.preferred_roles) ? (p.preferred_roles as string[]).join(', ') : '',
        preferred_locations: Array.isArray(p.preferred_locations) ? (p.preferred_locations as string[]).join(', ') : '',
        employment_types: Array.isArray(p.employment_types) ? (p.employment_types as string[]).join(', ') : '',
      });
    }).catch(() => setProfile({}));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.profile.update({
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
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
    setUploadStatus({ type: 'info', text: 'Uploading resume…' });
    try {
      const res = await api.profile.uploadResume(file);
      setUploadStatus({ type: 'info', text: 'Extracting profile from resume…' });
      const interval = setInterval(async () => {
        try {
          const run = await api.agents.getRun(res.agent_run_id);
          if (run.status === 'completed') {
            clearInterval(interval);
            setUploadStatus({ type: 'success', text: 'Profile updated from resume!' });
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
            setUploadStatus({ type: 'error', text: `Extraction failed: ${run.error}` });
          }
        } catch { clearInterval(interval); }
      }, 3000);
    } catch (err) {
      setUploadStatus({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader className="animate-spin mr-2" size={20} /> Loading profile…
    </div>
  );

  const initials = form.full_name
    ? form.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-6 py-2">

      {/* Header card */}
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2c2d30] to-gray-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{form.full_name || 'Your Name'}</h1>
          <p className="text-sm text-gray-500 truncate">{form.headline || 'Add a headline below'}</p>
          {isPremium && subscription && (
            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
              <Crown size={10} /> Premium · expires {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'never'}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2c2d30] text-white text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors shadow-md"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save profile'}
        </button>
      </div>

      {/* Resume */}
      <Section icon={<FileText size={16} />} title="Resume">
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
            ${uploading ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'}`}
        >
          {uploading
            ? <Loader size={28} className="animate-spin text-blue-400" />
            : profile.resume_r2_key
              ? <CheckCircle size={28} className="text-emerald-400" />
              : <Upload size={28} className="text-gray-300" />
          }
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {profile.resume_r2_key ? 'Resume on file — click to replace' : 'Click to upload your resume'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">PDF or DOCX · AI will extract your profile automatically</p>
          </div>
        </div>
        {uploadStatus && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl
            ${uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
              uploadStatus.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            {uploadStatus.type === 'success' ? <CheckCircle size={14} /> :
              uploadStatus.type === 'info' ? <Loader size={14} className="animate-spin" /> : null}
            {uploadStatus.text}
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
      </Section>

      {/* Personal details */}
      <Section icon={<User size={16} />} title="Personal details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name">
            <input value={form.full_name} onChange={set('full_name')} className={inputCls} placeholder="Mohammed Yaseen" />
          </Field>
          <Field label="Years of experience">
            <input type="number" value={form.years_experience} onChange={set('years_experience')} className={inputCls} min={0} placeholder="2" />
          </Field>
        </div>
        <Field label="Headline">
          <input value={form.headline} onChange={set('headline')} className={inputCls} placeholder="Senior Backend Engineer" />
        </Field>
        <Field label="Summary">
          <textarea value={form.summary} onChange={set('summary')} className={inputCls + ' h-28 resize-none leading-relaxed'} placeholder="Brief professional bio…" />
        </Field>
      </Section>

      {/* Job preferences */}
      <Section icon={<Briefcase size={16} />} title="Job preferences">
        <Field label="Preferred roles (comma-separated)">
          <input value={form.preferred_roles} onChange={set('preferred_roles')} className={inputCls} placeholder="Software Engineer, Backend Engineer" />
          {isPremium && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <Crown size={10} /> These roles are used for your daily Apify search on Indeed.
            </p>
          )}
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Remote preference">
            <div className="relative">
              <select value={form.remote_preference} onChange={set('remote_preference')} className={inputCls + ' appearance-none pr-8'}>
                <option value="">Any</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
          <Field label="Employment types (comma-separated)">
            <input value={form.employment_types} onChange={set('employment_types')} className={inputCls} placeholder="full_time, contract" />
          </Field>
        </div>
        <Field label="Preferred locations (comma-separated)">
          <input value={form.preferred_locations} onChange={set('preferred_locations')} className={inputCls} placeholder="London, Remote, New York" />
        </Field>
      </Section>

      {/* Skills & salary */}
      <Section icon={<Zap size={16} />} title="Skills & salary">
        <Field label="Skills (comma-separated)">
          <input value={form.skills} onChange={set('skills')} className={inputCls} placeholder="Python, TypeScript, React, AWS" />
        </Field>
        <Field label="Minimum salary (annual)">
          <div className="relative">
            <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="number" value={form.min_salary} onChange={set('min_salary')} className={inputCls + ' pl-8'} min={0} placeholder="50000" />
          </div>
        </Field>
      </Section>

      {/* Save footer */}
      <div className="flex justify-end pb-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#2c2d30] text-white text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors shadow-md"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save profile'}
        </button>
      </div>

    </form>
  );
}
