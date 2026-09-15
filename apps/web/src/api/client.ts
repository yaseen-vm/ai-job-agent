const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json() as T & { error?: { code: string; message: string } };
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string }; isAdmin: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  profile: {
    get: () => request<Record<string, unknown>>('/profile'),
    update: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    uploadResume: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const token = localStorage.getItem('token');
      return fetch(`${BASE}/profile/resume`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then(r => r.json() as Promise<{ agent_run_id: string; resume_r2_key: string }>);
    },
  },

  jobs: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ jobs: Record<string, unknown>[]; total: number; limit: number; offset: number }>(`/jobs${qs}`);
    },
    get: (id: string) => request<Record<string, unknown>>(`/jobs/${id}`),
    getMatch: (id: string) => request<Record<string, unknown>>(`/jobs/${id}/match`),
  },

  savedJobs: {
    list: () => request<{ saved_jobs: Record<string, unknown>[] }>('/saved-jobs'),
    save: (jobId: string) =>
      request<{ id: string; job_id: string; saved_at: number }>('/saved-jobs', {
        method: 'POST',
        body: JSON.stringify({ job_id: jobId }),
      }),
    remove: (id: string) =>
      fetch(`${BASE}/saved-jobs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      }),
  },

  applications: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ applications: Record<string, unknown>[] }>(`/applications${qs}`);
    },
    create: (data: { job_id: string; status?: string; source?: string; notes?: string }) =>
      request<Record<string, unknown>>('/applications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { status?: string; notes?: string }) =>
      request<Record<string, unknown>>(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    timeline: (id: string) => request<{ events: Record<string, unknown>[] }>(`/applications/${id}/timeline`),
  },

  admin: {
    ingest: (keyword?: string, clear?: boolean) =>
      request<{ status: string }>('/admin/ingest', {
        method: 'POST',
        body: JSON.stringify({ keyword, clear }),
      }),
    listUsers: (search?: string) => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return request<{ users: { id: string; email: string; created_at: number }[] }>(`/admin/users${qs}`);
    },
    grantSubscription: (userId: string, durationDays: number) =>
      request<{ status: string; expiresAt: number }>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ userId, durationDays }),
      }),
    revokeSubscription: (userId: string) =>
      request<{ status: string }>(`/admin/subscriptions/${userId}`, { method: 'DELETE' }),
    getUserSubscription: (userId: string) =>
      request<{ subscription: { id: string; plan: string; status: string; started_at: number; expires_at: number | null } | null }>(`/admin/subscriptions/${userId}`),
  },

  subscriptions: {
    me: () => request<{ subscription: { id: string; plan: string; status: string; started_at: number; expires_at: number | null } }>('/subscriptions/me'),
  },

  premium: {
    status: () => request<{ subscription: { id: string; plan: string; status: string; started_at: number; expires_at: number | null } | null; isPremium: boolean; searchPending: boolean }>('/premium/status'),
    triggerSearch: () => request<{ status: string; message: string }>('/premium/search', { method: 'POST' }),
  },

  agents: {
    match: (jobId: string) =>
      request<{ agent_run_id: string }>('/agents/match', { method: 'POST', body: JSON.stringify({ job_id: jobId }) }),
    rank: () => request<{ agent_run_id: string }>('/agents/rank', { method: 'POST', body: '{}' }),
    draft: (jobId: string, type: 'cover_letter' | 'summary') =>
      request<{ agent_run_id: string }>('/agents/draft', { method: 'POST', body: JSON.stringify({ job_id: jobId, type }) }),
    getRun: (id: string) => request<Record<string, unknown>>(`/agents/runs/${id}`),
  },
};
