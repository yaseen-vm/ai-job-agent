import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.ts';

const STATUSES = ['saved', 'preparing', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  saved: 'bg-gray-100 text-gray-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  applied: 'bg-blue-100 text-blue-700',
  interviewing: 'bg-purple-100 text-purple-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-400',
};

export function Applications() {
  const [apps, setApps] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [timeline, setTimeline] = useState<{ appId: string; events: unknown[] } | null>(null);
  const navigate = useNavigate();

  const fetchApps = async (status?: string) => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const res = await api.applications.list(params);
    setApps(res.applications as Array<Record<string, unknown>>);
  };

  useEffect(() => {
    fetchApps().finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (appId: string, newStatus: Status) => {
    await api.applications.update(appId, { status: newStatus });
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
  };

  const showTimeline = async (appId: string) => {
    if (timeline?.appId === appId) { setTimeline(null); return; }
    const res = await api.applications.timeline(appId);
    setTimeline({ appId, events: res.events });
  };

  if (loading) return <div className="text-gray-400">Loading…</div>;

  const filtered = statusFilter ? apps.filter(a => a.status === statusFilter) : apps;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); fetchApps(e.target.value || undefined); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-400 text-center py-12">
          No applications yet.
          <br />
          <button onClick={() => navigate('/jobs')} className="text-blue-600 hover:underline mt-2 text-sm block mx-auto">
            Browse jobs to start tracking
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(app => (
            <div key={app.id as string} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <button
                    onClick={() => navigate(`/jobs/${app.job_id}`)}
                    className="font-medium text-gray-900 hover:text-blue-600 text-left"
                  >
                    {String(app.title)}
                  </button>
                  <div className="text-sm text-gray-500">{String(app.company)}</div>
                </div>
                <select
                  value={app.status as string}
                  onChange={e => handleStatusChange(app.id as string, e.target.value as Status)}
                  className={`text-xs font-medium px-2 py-1 rounded border-0 focus:outline-none ${STATUS_COLORS[app.status as Status] ?? ''}`}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              {!!app.notes && <p className="text-sm text-gray-500 mt-2">{String(app.notes)}</p>}
              <button
                onClick={() => showTimeline(app.id as string)}
                className="text-xs text-blue-600 hover:underline mt-2"
              >
                {timeline !== null && timeline.appId === app.id ? 'Hide timeline' : 'Show timeline'}
              </button>

              {timeline !== null && timeline.appId === app.id && (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
                  {(timeline.events as Array<Record<string, unknown>>).map(ev => (
                    <div key={ev.id as string} className="text-xs text-gray-500 flex gap-2">
                      <span>{new Date(ev.occurred_at as number).toLocaleDateString()}</span>
                      <span className="capitalize">{String(ev.event_type).replace('_', ' ')}</span>
                      {ev.event_type === 'note' && !!ev.payload && (
                        <span>{(ev.payload as { text?: string }).text}</span>
                      )}
                      {ev.event_type === 'status_change' && !!ev.payload && (
                        <span>
                          {(ev.payload as { from?: string; to?: string }).from} → {(ev.payload as { from?: string; to?: string }).to}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
