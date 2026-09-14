import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.ts';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
        location.pathname.startsWith(to)
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link to="/jobs" className="font-semibold text-gray-900 mr-4">AI Job Agent</Link>
            {navLink('/jobs', 'Jobs')}
            {navLink('/saved', 'Saved')}
            {navLink('/applications', 'Applications')}
            {navLink('/profile', 'Profile')}
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
