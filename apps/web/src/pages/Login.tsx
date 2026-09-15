import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.ts';
import { useAuthStore } from '../stores/auth.ts';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      login(res.token, res.user, res.isAdmin);
      navigate(res.isAdmin ? '/admin' : '/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
      <header className="px-6 py-5 flex justify-between items-center font-mono text-[11px] uppercase tracking-wider border-b border-line">
        <Link to="/" className="font-sans font-semibold text-[15px] tracking-tight">
          JOBAGENT<span className="text-[7px] align-top ml-[2px]">®</span>
        </Link>
        <nav className="flex gap-8">
          <span className="text-gray-400">I. Login</span>
          <Link to="/register" className="hover:text-acid hover:bg-ink px-2 transition-colors">II. Register</Link>
        </nav>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-widest mb-6">Authentication / 01</p>
          <h1 className="font-serif text-[clamp(40px,6vw,80px)] leading-[0.9] tracking-[-0.04em] mb-12">
            WELCOME<br/><em className="italic font-normal">BACK.</em>
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-line px-0 py-3 text-lg focus:outline-none focus:border-ink transition-colors rounded-none placeholder:text-gray-400"
                placeholder="you@domain.com"
                required
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-line px-0 py-3 text-lg focus:outline-none focus:border-ink transition-colors rounded-none placeholder:text-gray-400"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && <p className="font-mono text-[10px] text-red-500 uppercase bg-red-50 p-2 border border-red-200">{error}</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper py-4 text-sm font-mono uppercase tracking-widest hover:bg-acid hover:text-ink transition-colors disabled:opacity-50 disabled:hover:bg-ink disabled:hover:text-paper"
            >
              {loading ? 'Authenticating...' : 'Sign in →'}
            </button>
          </form>
          
          <div className="mt-12 pt-6 border-t border-line flex justify-between font-mono text-[10px] uppercase tracking-widest">
            <span className="text-gray-500">No account?</span>
            <Link to="/register" className="border-b border-ink hover:text-acid hover:border-acid transition-colors">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
