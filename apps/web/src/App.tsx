import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.ts';
import { Layout } from './components/Layout.tsx';
import { Login } from './pages/Login.tsx';
import { Register } from './pages/Register.tsx';
import { Profile } from './pages/Profile.tsx';
import { Jobs } from './pages/Jobs.tsx';
import { JobDetail } from './pages/JobDetail.tsx';
import { SavedJobs } from './pages/SavedJobs.tsx';
import { Applications } from './pages/Applications.tsx';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route index element={<Navigate to="/jobs" replace />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/saved" element={<SavedJobs />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
