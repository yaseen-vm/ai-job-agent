import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.ts';
import { Search, ShieldCheck, ShieldOff, RefreshCw, Crown, Users } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  created_at: number;
  sub_status: 'active' | 'cancelled' | 'expired' | null;
  sub_plan: string | null;
  sub_expires_at: number | null;
}

export function Admin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [durationDays, setDurationDays] = useState(30);

  const fetchUsers = useCallback(async (q = search) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.listUsers(q || undefined);
      setUsers(res.users as UserRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchUsers(''); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const grant = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await api.admin.grantSubscription(userId, durationDays);
      showToast(`Subscription ${res.status} — expires ${new Date(res.expiresAt).toLocaleDateString()}`);
      await fetchUsers();
    } catch (e) {
      showToast(`Error: ${(e as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const revoke = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.admin.revokeSubscription(userId);
      showToast('Subscription cancelled');
      await fetchUsers();
    } catch (e) {
      showToast(`Error: ${(e as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const subBadge = (user: UserRow) => {
    if (user.sub_status === 'active') {
      const exp = user.sub_expires_at ? new Date(user.sub_expires_at).toLocaleDateString() : 'never';
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          <Crown size={11} /> Premium · expires {exp}
        </span>
      );
    }
    if (user.sub_status === 'cancelled' || user.sub_status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
          {user.sub_status}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
        Free
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={24} className="text-indigo-600" /> Admin Panel
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage user subscriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Duration:</span>
            <select
              value={durationDays}
              onChange={e => setDurationDays(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
              <option value={36500}>Lifetime</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchUsers()}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button
          onClick={() => fetchUsers()}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total users', value: users.length, icon: <Users size={18} /> },
          { label: 'Active subscribers', value: users.filter(u => u.sub_status === 'active').length, icon: <Crown size={18} /> },
          { label: 'Free users', value: users.filter(u => u.sub_status !== 'active').length, icon: <ShieldOff size={18} /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Email</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Joined</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Subscription</th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  {search ? 'No users found matching your search.' : 'No users yet.'}
                </td>
              </tr>
            )}
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-medium text-gray-900">{user.email}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{user.id}</div>
                </td>
                <td className="px-5 py-4 text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  {subBadge(user)}
                </td>
                <td className="px-5 py-4 text-right">
                  {actionLoading === user.id ? (
                    <span className="text-xs text-gray-400">Saving...</span>
                  ) : user.sub_status === 'active' ? (
                    <button
                      onClick={() => revoke(user.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <ShieldOff size={12} /> Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => grant(user.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <Crown size={12} /> Grant {durationDays}d
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
