import React from 'react';
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
import { Landing } from './pages/Landing.tsx';
import { Admin } from './pages/Admin.tsx';
import { PageLoader } from './components/PageLoader.tsx';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/jobs" replace />;
  return <>{children}</>;
}

export function App() {
  const { token } = useAuthStore();
  const [booting, setBooting] = React.useState(true);

  React.useEffect(() => {
    // Brief boot delay so fonts/styles settle before revealing content
    const t = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(t);
  }, []);

  if (booting) return <PageLoader />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/saved" element={<SavedJobs />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={
                    <RequireAdmin>
                      <Admin />
                    </RequireAdmin>
                  } />
                  <Route path="*" element={<Navigate to="/jobs" replace />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
