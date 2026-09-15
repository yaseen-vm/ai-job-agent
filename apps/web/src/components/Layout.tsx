import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.ts';
import { Settings, Bell, User } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to: string, label: string, number: string) => {
    const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');
    return (
      <Link
        to={to}
        className={`px-4 py-2 text-[10px] uppercase tracking-widest font-mono transition-colors border border-transparent ${
          isActive
            ? 'bg-ink text-paper border-ink'
            : 'text-gray-500 hover:text-ink hover:border-line'
        }`}
      >
        <span className="opacity-50 mr-2">{number}.</span>
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-line">
        <Link to="/" className="font-sans font-semibold text-[15px] tracking-tight">
          JOBAGENT<span className="text-[7px] align-top ml-[2px]">®</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-2">
          {navLink('/jobs', 'Jobs', '01')}
          {navLink('/saved', 'Saved', '02')}
          {navLink('/applications', 'Applications', '03')}
          {navLink('/profile', 'Profile', '04')}
        </nav>
        
        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest">
          {user && (
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline opacity-50">{user.email}</span>
              <button className="hover:text-acid transition-colors p-1" aria-label="Settings">
                <Settings size={16} strokeWidth={1.5} />
              </button>
              <button className="hover:text-acid transition-colors p-1" aria-label="Notifications">
                <Bell size={16} strokeWidth={1.5} />
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className="hover:text-acid transition-colors p-1"
                aria-label="Profile"
              >
                <User size={16} strokeWidth={1.5} />
              </button>
              <button
                onClick={handleLogout}
                className="ml-4 border-b border-ink hover:text-acid hover:border-acid transition-colors pb-0.5"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
