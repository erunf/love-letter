import { create } from 'zustand';

export interface AuthUser {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  idToken: string | null;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setIdToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (credential: string) => void;
  logout: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  idToken: null,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setIdToken: (idToken) => set({ idToken }),
  setLoading: (isLoading) => set({ isLoading }),

  login: (credential: string) => {
    // Decode the JWT payload to extract user info (no verification needed client-side)
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]));
      const user: AuthUser = {
        id: '', // Will be set by server after verification
        googleId: payload.sub,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture || null,
      };
      set({ user, idToken: credential, isLoading: false });
      localStorage.setItem('games_erun_idToken', credential);
    } catch {
      set({ user: null, idToken: null, isLoading: false });
    }
  },

  logout: () => {
    set({ user: null, idToken: null });
    localStorage.removeItem('games_erun_idToken');
  },
}));

// ─── Auto-restore token on load ───────────────────────────────────

export function restoreAuth() {
  const token = localStorage.getItem('games_erun_idToken');
  if (!token) return;

  try {
    // Check if token is expired
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000;
    if (Date.now() > expiry) {
      localStorage.removeItem('games_erun_idToken');
      return;
    }

    useAuthStore.getState().login(token);
  } catch {
    localStorage.removeItem('games_erun_idToken');
  }
}
