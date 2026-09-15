import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { id: string; email: string } | null;
  isAdmin: boolean;
  login: (token: string, user: { id: string; email: string }, isAdmin?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: (() => {
    try { return JSON.parse(localStorage.getItem('user') ?? 'null') as { id: string; email: string } | null; }
    catch { return null; }
  })(),
  isAdmin: localStorage.getItem('isAdmin') === 'true',
  login: (token, user, isAdmin = false) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isAdmin', String(isAdmin));
    set({ token, user, isAdmin });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAdmin');
    set({ token: null, user: null, isAdmin: false });
  },
}));
