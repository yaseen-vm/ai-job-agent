import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.ts';
import { Settings, Bell, User, Briefcase, Bookmark, FileText, LayoutDashboard } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to: string, label: string) => {
    const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');
    return (
      <Link
        to={to}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[#2c2d30] text-white'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dce2e8] via-[#e8e9e1] to-[#f4ead2] p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-7xl min-h-[90vh] bg-[#fbfaf5]/90 backdrop-blur-md shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border border-white/40">
        
        {/* Top Navigation */}
        <header className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-gray-900 tracking-tight">JobAgent</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-2 bg-white/50 p-1.5 rounded-full shadow-sm">
            {navLink('/jobs', 'Jobs')}
            {navLink('/saved', 'Saved')}
            {navLink('/applications', 'Applications')}
            {navLink('/profile', 'Profile')}
          </nav>
          
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <button className="p-2 rounded-full hover:bg-white transition-colors text-gray-600">
                  <Settings size={20} />
                </button>
                <button className="p-2 rounded-full hover:bg-white transition-colors text-gray-600">
                  <Bell size={20} />
                </button>
                <button 
                  onClick={() => navigate('/profile')}
                  className="p-2 rounded-full hover:bg-white transition-colors text-gray-600"
                >
                  <User size={20} />
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium rounded-full border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-8 pb-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
