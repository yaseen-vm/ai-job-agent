import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.ts';

const STATUSES = ['saved', 'preparing', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  saved: 'text-gray-500',
  preparing: 'text-acid bg-ink',
  applied: 'text-blue-500',
  interviewing: 'text-purple-500',
  offer: 'text-green-500',
  rejected: 'text-red-500',
  withdrawn: 'text-gray-400 opacity-50',
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

  if (loading) return (
    <div className="py-12 border-t border-line font-mono text-[10px] uppercase tracking-widest animate-pulse">
      Loading Data...
    </div>
  );

  const filtered = statusFilter ? apps.filter(a => a.status === statusFilter) : apps;

  return (
    <div className="space-y-16">
      <div className="border-b border-line pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">Pipeline / 03</p>
          <h1 className="font-serif text-[clamp(60px,8vw,120px)] leading-[0.8] tracking-tight m-0">APPLICATIONS<br/><em className="italic font-normal">TRACKER</em></h1>
        </div>
        
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); fetchApps(e.target.value || undefined); }}
          className="bg-transparent font-mono text-[10px] uppercase tracking-widest border-b border-ink py-2 focus:outline-none focus:border-acid"
        >
          <option value="">All statuses / Filter</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 border border-line flex flex-col items-center justify-center">
          <p className="font-serif text-4xl mb-4 italic">Empty state.</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">No applications on record.</p>
          <button onClick={() => navigate('/jobs')} className="font-mono text-[10px] uppercase tracking-widest border-b border-ink mt-4 hover:text-acid hover:border-acid transition-colors">
            Browse jobs →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-line border border-line">
          {filtered.map(app => (
            <div key={app.id as string} className="bg-paper p-6 hover:bg-ink hover:text-paper group transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-gray-400 mb-2">{String(app.company)}</p>
                  <button
                    onClick={() => navigate(`/jobs/${app.job_id}`)}
                    className="font-serif text-[clamp(24px,3vw,36px)] leading-tight tracking-tight group-hover:text-acid transition-colors text-left"
                  >
                    {String(app.title)}
                  </button>
                </div>
                
                <div className="shrink-0 flex items-center gap-4">
                  <select
                    value={app.status as string}
                    onChange={e => handleStatusChange(app.id as string, e.target.value as Status)}
                    className={`bg-transparent font-mono text-[10px] uppercase tracking-widest p-1 focus:outline-none border border-transparent hover:border-line group-hover:hover:border-gray-700 ${STATUS_COLORS[app.status as Status] ?? ''}`}
                  >
                    {STATUSES.map(s => <option key={s} value={s} className="bg-paper text-ink">{s}</option>)}
                  </select>
                  
                  <button
                    onClick={() => showTimeline(app.id as string)}
                    className="font-mono text-[10px] uppercase tracking-widest border-b border-line group-hover:border-gray-700 hover:text-acid transition-colors"
                  >
                    {timeline !== null && timeline.appId === app.id ? 'Hide Timeline' : 'View Timeline'}
                  </button>
                </div>
              </div>
              
              {!!app.notes && (
                <div className="mt-6 pt-4 border-t border-line group-hover:border-gray-800">
                  <p className="font-sans text-sm text-gray-600 group-hover:text-gray-400">{String(app.notes)}</p>
                </div>
              )}

              {timeline !== null && timeline.appId === app.id && (
                <div className="mt-6 pt-6 border-t border-line group-hover:border-gray-800 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-4">Event Log</p>
                  {(timeline.events as Array<Record<string, unknown>>).map(ev => (
                    <div key={ev.id as string} className="font-mono text-[10px] uppercase tracking-widest flex flex-wrap gap-4 items-center">
                      <span className="text-gray-500 w-24 shrink-0">{new Date(ev.occurred_at as number).toLocaleDateString()}</span>
                      <span className="text-acid">{String(ev.event_type)}</span>
                      {ev.event_type === 'note' && !!ev.payload && (
                        <span className="text-gray-400">/ {(ev.payload as { text?: string }).text}</span>
                      )}
                      {ev.event_type === 'status_change' && !!ev.payload && (
                        <span className="text-gray-400">
                          / {(ev.payload as { from?: string; to?: string }).from} → {(ev.payload as { from?: string; to?: string }).to}
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
