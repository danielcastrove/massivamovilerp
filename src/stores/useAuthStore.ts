import { create } from 'zustand';

interface AuthState {
  session: string | null;
  setSession: (session: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
}));
